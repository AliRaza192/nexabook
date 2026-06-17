import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { paymentTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    const orderRef = params["pp_OrderRef"] || params["orderRef"] || params["transactionRef"];
    const gateway = params["pp_TxnType"] ? "jazzcash" : "easypaisa";

    if (!orderRef) {
      return NextResponse.redirect(new URL("/dashboard?payment=failed", request.url));
    }

    const status = params["pp_ResponseCode"] === "000" || params["status"] === "completed"
      ? "completed"
      : "failed";

    const existing = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.transactionId, orderRef))
      .limit(1);

    if (existing.length > 0) {
      await db.update(paymentTransactions)
        .set({
          status,
          referenceNumber: params["pp_RetreivalReferenceNo"] || params["transactionId"] || null,
          gatewayResponse: JSON.stringify(params),
          completedAt: status === "completed" ? new Date() : undefined,
        })
        .where(eq(paymentTransactions.id, existing[0].id));
    }

    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("payment", status);
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(new URL("/dashboard?payment=error", request.url));
  }
}
