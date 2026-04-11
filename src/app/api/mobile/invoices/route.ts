import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { invoices, customers, profiles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const userProfile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (userProfile.length > 0 && userProfile[0].orgId) {
    return userProfile[0].orgId;
  }

  return null;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orgId = await getCurrentOrgId(userId);

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.name,
        amount: invoices.netAmount,
        status: invoices.status,
        date: invoices.issueDate,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.orgId, orgId))
      .orderBy(desc(invoices.createdAt))
      .limit(20);

    const formattedInvoices = recentInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: parseFloat(invoice.amount || "0"),
      status: invoice.status,
      date: invoice.date,
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error("Invoices API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
