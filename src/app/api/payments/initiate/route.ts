import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { paymentTransactions, invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentOrgId } from "@/lib/actions/shared";
import { captureException } from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId();
    if (!orgId) return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });

    const { invoiceId, customerId, amount, gateway, returnOrigin, customerInfo } = await request.json();
    if (!amount || !gateway) {
      return NextResponse.json({ success: false, error: "Amount and gateway are required" }, { status: 400 });
    }

    if (gateway !== "jazzcash" && gateway !== "easypaisa") {
      return NextResponse.json({ success: false, error: "Invalid gateway" }, { status: 400 });
    }

    if (invoiceId) {
      const [inv] = await db
        .select({ balanceAmount: invoices.balanceAmount })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
        .limit(1);
      if (!inv) {
        return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
      }
      const invoiceBalance = parseFloat(inv.balanceAmount || "0");
      const requestedAmount = parseFloat(amount.toString());
      if (requestedAmount > invoiceBalance || requestedAmount <= 0) {
        return NextResponse.json({ success: false, error: "Amount exceeds outstanding balance" }, { status: 400 });
      }
    } else if (parseFloat(amount.toString()) <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero" }, { status: 400 });
    }

    const orderRef = `NEX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [txn] = await db.insert(paymentTransactions).values({
      orgId,
      invoiceId: invoiceId || null,
      customerId: customerId || null,
      gateway,
      transactionId: orderRef,
      amount: amount.toString(),
      status: "pending",
    }).returning();

    let initiatePayment: (amount: number, orderRef: string, customerInfo: { name: string }) => Promise<any>;
    let loadModule: Promise<any>;

    if (gateway === "jazzcash") {
      loadModule = import("@/lib/payments/jazzcash");
    } else {
      loadModule = import("@/lib/payments/easypaisa");
    }

    const paymentModule = await loadModule;
    initiatePayment = paymentModule.initiatePayment;

    const cInfo = customerInfo || { name: "Customer" };
    const result = await initiatePayment(amount, orderRef, cInfo);

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
    captureException(err, { module: "payments/initiate", function: "POST" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
