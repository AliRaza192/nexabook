"use server";

import { db } from "@/db";
import { approvalWorkflows, approvalRequests, profiles } from "@/db/schema";
import { eq, and, sql, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, requireRole } from "./shared";
import { revalidatePath } from "next/cache";

export async function getWorkflows() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const rows = await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.orgId, orgId))
      .orderBy(approvalWorkflows.entityType, approvalWorkflows.orderIndex);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: "Failed to load workflows" };
  }
}

export async function createWorkflow(data: {
  name: string; entityType: string; minAmount: string;
  maxAmount?: string; approverRole: string; orderIndex: number;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await db.insert(approvalWorkflows).values({ orgId, ...data, maxAmount: data.maxAmount || undefined });
    revalidatePath("/settings/approvals");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create workflow" };
  }
}

export async function deleteWorkflow(id: string) {
  try {
    await requireRole(["admin"]);
    await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    revalidatePath("/settings/approvals");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete workflow" };
  }
}

export async function submitForApproval(data: {
  entityType: string; entityId: string; entityNumber?: string; amount: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Find matching workflow
    const [workflow] = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.orgId, orgId),
          eq(approvalWorkflows.entityType, data.entityType),
          eq(approvalWorkflows.isActive, true),
          sql`CAST(${data.amount} AS DECIMAL) >= ${approvalWorkflows.minAmount}`,
          or(
            sql`${approvalWorkflows.maxAmount} IS NULL`,
            sql`CAST(${data.amount} AS DECIMAL) <= ${approvalWorkflows.maxAmount}`
          )
        )
      )
      .orderBy(approvalWorkflows.orderIndex)
      .limit(1);

    if (!workflow) return { success: false, error: "No matching approval workflow found" };

    await db.insert(approvalRequests).values({
      orgId, workflowId: workflow.id,
      entityType: data.entityType, entityId: data.entityId,
      entityNumber: data.entityNumber, requestedBy: userId,
      amount: data.amount,
    });

    revalidatePath("/approvals");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to submit for approval" };
  }
}

export async function getPendingApprovals() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
      .limit(1);

    if (!profile) return { success: false, error: "Profile not found" };

    // Get workflows this user can approve
    const workflows = await db
      .select({ id: approvalWorkflows.id })
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.orgId, orgId),
          eq(approvalWorkflows.isActive, true),
          sql`${approvalWorkflows.approverRole} = ${profile.role}`
        )
      );

    if (workflows.length === 0) return { success: true, data: [] };

    const wfIds = workflows.map((w) => w.id);

    const requests = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.orgId, orgId),
          eq(approvalRequests.status, "pending"),
          sql`${approvalRequests.workflowId} = ANY(${wfIds})`
        )
      )
      .orderBy(sql`${approvalRequests.createdAt} DESC`);

    return { success: true, data: requests };
  } catch (error) {
    return { success: false, error: "Failed to load approvals" };
  }
}

export async function approveRequest(id: string, comment?: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db.update(approvalRequests)
      .set({ status: "approved", approvedBy: userId, comment: comment || null, updatedAt: new Date() })
      .where(eq(approvalRequests.id, id));

    revalidatePath("/approvals");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to approve" };
  }
}

export async function rejectRequest(id: string, comment?: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db.update(approvalRequests)
      .set({ status: "rejected", approvedBy: userId, comment: comment || null, updatedAt: new Date() })
      .where(eq(approvalRequests.id, id));

    revalidatePath("/approvals");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to reject" };
  }
}
