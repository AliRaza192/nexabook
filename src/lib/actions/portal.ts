"use server";

import { db } from "@/db";
import { customers, invoices, organizations } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export async function generatePortalToken(customerId: string) {
  try {
    const token = crypto.randomBytes(32).toString("hex");
    await db
      .update(customers)
      .set({ portalToken: token, updatedAt: new Date() })
      .where(eq(customers.id, customerId));
    return { success: true, token };
  } catch (error) {
    return { success: false, error: "Failed to generate portal token" };
  }
}

export async function getPortalData(token: string) {
  try {
    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        balance: customers.balance,
        orgId: customers.orgId,
        orgName: organizations.name,
        orgPhone: organizations.phone,
        orgEmail: organizations.email,
      })
      .from(customers)
      .innerJoin(organizations, eq(customers.orgId, organizations.id))
      .where(eq(customers.portalToken, token))
      .limit(1);

    if (!customer) return { success: false, error: "Invalid portal token" };

    const customerInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        netAmount: invoices.netAmount,
        balanceAmount: invoices.balanceAmount,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customer.id),
          eq(invoices.orgId, customer.orgId),
          sql`${invoices.status} NOT IN ('draft', 'cancelled')`
        )
      )
      .orderBy(sql`${invoices.issueDate} DESC`);

    return {
      success: true,
      data: {
        customer,
        invoices: customerInvoices,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to load portal data" };
  }
}
