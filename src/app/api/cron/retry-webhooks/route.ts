import { NextRequest, NextResponse } from "next/server";
import { retryFailedDeliveries } from "@/lib/utils/webhook-delivery";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await retryFailedDeliveries();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Retry webhooks cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
