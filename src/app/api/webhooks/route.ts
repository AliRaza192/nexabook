import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { webhookEndpoints, webhookDeliveries, profiles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const profile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return profile.length > 0 && profile[0].orgId ? profile[0].orgId : null;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get("endpointId");

    if (endpointId) {
      const deliveries = await db
        .select()
        .from(webhookDeliveries)
        .where(
          and(
            eq(webhookDeliveries.webhookEndpointId, endpointId),
            eq(webhookDeliveries.orgId, orgId)
          )
        )
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(50);

      return NextResponse.json({ success: true, data: deliveries });
    }

    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.orgId, orgId))
      .orderBy(desc(webhookEndpoints.createdAt));

    return NextResponse.json({ success: true, data: endpoints });
  } catch (err) {
    console.error("Webhook API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const body = await request.json();
    const { name, url, events, description } = body;

    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Name, url, and at least one event are required" },
        { status: 400 }
      );
    }

    const crypto = await import("crypto");
    const secret = crypto.randomBytes(32).toString("hex");

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({ orgId, name, url, events, secret, description })
      .returning();

    return NextResponse.json({ success: true, data: endpoint }, { status: 201 });
  } catch (err) {
    console.error("Webhook API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
