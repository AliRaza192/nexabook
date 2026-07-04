import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { webhookEndpoints, webhookDeliveries, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateCsrf } from "@/lib/csrf";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const profile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return profile.length > 0 && profile[0].orgId ? profile[0].orgId : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateCsrf();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, orgId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description;

    const [updated] = await db
      .update(webhookEndpoints)
      .set(updateData)
      .where(eq(webhookEndpoints.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Webhook API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateCsrf();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, orgId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });

    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
