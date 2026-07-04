"use server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
};

export async function createAuditLog(input: AuditInput) {
  try {
    const { userId } = await auth();
    const orgId = await getCurrentOrgId();
    if (!orgId || !userId) return;

    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes ? JSON.stringify(input.changes) : null,
    });
  } catch (error) {
    console.error("createAuditLog error:", error);
  }
}
