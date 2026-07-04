import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { paymentTransactions, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const userProfile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return userProfile.length > 0 && userProfile[0].orgId ? userProfile[0].orgId : null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });

    const { invoiceId, customerId, amount, gateway, returnOrigin, customerInfo } = await request.json();
    if (!amount || !gateway) {
      return NextResponse.json({ success: false, error: "Amount and gateway are required" }, { status: 400 });
    }

    if (gateway !== "jazzcash" && gateway !== "easypaisa") {
      return NextResponse.json({ success: false, error: "Invalid gateway" }, { status: 400 });
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

    const module = await loadModule;
    initiatePayment = module.initiatePayment;

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
    console.error("Payment initiation error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
