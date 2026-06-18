import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, paymentTransactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { token, invoiceId, amount, gateway } = await request.json();
    if (!token || !amount || !gateway) {
      return NextResponse.json({ success: false, error: "Token, amount, and gateway are required" }, { status: 400 });
    }

    if (gateway !== "jazzcash" && gateway !== "easypaisa") {
      return NextResponse.json({ success: false, error: "Invalid gateway" }, { status: 400 });
    }

    const [customer] = await db
      .select({ id: customers.id, orgId: customers.orgId, name: customers.name })
      .from(customers)
      .where(eq(customers.portalToken, token))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Invalid portal token" }, { status: 401 });
    }

    if (invoiceId) {
      const [inv] = await db
        .select({ id: invoices.id, status: invoices.status, balanceAmount: invoices.balanceAmount })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.customerId, customer.id)))
        .limit(1);

      if (!inv || inv.status === "paid" || inv.status === "cancelled") {
        return NextResponse.json({ success: false, error: "Invoice is not payable" }, { status: 400 });
      }
    }

    const orderRef = `PORTAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [txn] = await db.insert(paymentTransactions).values({
      orgId: customer.orgId,
      invoiceId: invoiceId || null,
      customerId: customer.id,
      gateway,
      transactionId: orderRef,
      amount: amount.toString(),
      status: "pending",
    }).returning();

    const cInfo = { name: customer.name };

    const loadModule = gateway === "jazzcash" ? import("@/lib/payments/jazzcash") : import("@/lib/payments/easypaisa");
    const module = await loadModule;
    const result = await module.initiatePayment(amount, orderRef, cInfo);

    if (result.success) {
      await db.update(paymentTransactions)
        .set({
          referenceNumber: result.gatewayRef,
          gatewayResponse: JSON.stringify(result.rawResponse),
        })
        .where(eq(paymentTransactions.id, txn.id));

      return NextResponse.json({
        success: true,
        transactionId: txn.id,
        redirectUrl: result.redirectUrl,
      });
    }

    await db.update(paymentTransactions)
      .set({ status: "failed", gatewayResponse: JSON.stringify(result.rawResponse) })
      .where(eq(paymentTransactions.id, txn.id));

    return NextResponse.json({ success: false, error: result.message || "Payment initiation failed" }, { status: 500 });
  } catch (err) {
    console.error("Portal payment error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
