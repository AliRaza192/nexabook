"use server";

import { db } from "@/db";
import { costCenters, journalEntryLines, journalEntries, chartOfAccounts } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "./audit";

export async function getCostCenters() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const rows = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.orgId, orgId), eq(costCenters.isActive, true)))
      .orderBy(costCenters.code);

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to load cost centers" };
  }
}

export async function getCostCenter(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const row = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.orgId, orgId)))
      .then(rows => rows[0]);

    if (!row) return { success: false, error: "Cost center not found" };

    return { success: true, data: row };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to load cost center" };
  }
}

export async function createCostCenter(data: {
  name: string;
  code: string;
  description?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const row = await db
      .insert(costCenters)
      .values({ orgId, ...data })
      .returning();

    revalidatePath("/settings/cost-centers");
    await createAuditLog({ action: "COST_CENTER_CREATED", entityType: "costCenter", entityId: row[0].id });
    return { success: true, data: row[0] };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to create cost center" };
  }
}

export async function updateCostCenter(id: string, data: {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const row = await db
      .update(costCenters)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(costCenters.id, id), eq(costCenters.orgId, orgId)))
      .returning();

    revalidatePath("/settings/cost-centers");
    await createAuditLog({ action: "COST_CENTER_UPDATED", entityType: "costCenter", entityId: id });
    return { success: true, data: row[0] };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to update cost center" };
  }
}

export async function deleteCostCenter(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.orgId, orgId)));

    revalidatePath("/settings/cost-centers");
    await createAuditLog({ action: "COST_CENTER_DELETED", entityType: "costCenter", entityId: id });
    return { success: true };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to delete cost center" };
  }
}

export async function getCostCenterPLReport(costCenterId: string, fiscalYear?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const year = fiscalYear || `${new Date().getFullYear()}`;
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const rows = await db
      .select({
        accountId: journalEntryLines.accountId,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        accountType: chartOfAccounts.type,
        totalDebit: sql`SUM(${journalEntryLines.debitAmount})`.as("total_debit"),
        totalCredit: sql`SUM(${journalEntryLines.creditAmount})`.as("total_credit"),
        netAmount: sql`SUM(${journalEntryLines.debitAmount} - ${journalEntryLines.creditAmount})`.as("net_amount"),
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(
        and(
          eq(journalEntryLines.orgId, orgId),
          eq(journalEntryLines.costCenterId, costCenterId),
          gte(journalEntries.entryDate, startDate),
          lte(journalEntries.entryDate, endDate),
          eq(journalEntries.status, "posted")
        )
      )
      .groupBy(journalEntryLines.accountId, chartOfAccounts.code, chartOfAccounts.name, chartOfAccounts.type)
      .orderBy(chartOfAccounts.code);

    // Calculate totals
    const totalRevenue = rows
      .filter(r => r.accountType === "revenue")
      .reduce((sum, r) => sum + Number(r.netAmount), 0);

    const totalExpenses = rows
      .filter(r => r.accountType === "expense")
      .reduce((sum, r) => sum + Math.abs(Number(r.netAmount)), 0);

    const netProfit = totalRevenue - totalExpenses;

    return {
      success: true,
      data: {
        lines: rows,
        totals: { totalRevenue, totalExpenses, netProfit },
      },
    };
  } catch (error) {
    console.error("Error in cost-centers.ts:", error);
    return { success: false, error: "Failed to load cost center P&L" };
  }
}
