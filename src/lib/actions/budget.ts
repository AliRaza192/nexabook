"use server";

import { db } from "@/db";
import { budgets, chartOfAccounts, journalEntryLines, journalEntries } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

export async function getBudgets(fiscalYear?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const year = fiscalYear || `${new Date().getFullYear()}`;

    const rows = await db
      .select({
        accountId: budgets.accountId,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        accountType: chartOfAccounts.type,
        month: budgets.month,
        budgetedAmount: budgets.budgetedAmount,
      })
      .from(budgets)
      .innerJoin(chartOfAccounts, eq(budgets.accountId, chartOfAccounts.id))
      .where(
        and(
          eq(budgets.orgId, orgId),
          eq(budgets.fiscalYear, year)
        )
      )
      .orderBy(chartOfAccounts.code, budgets.month);

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error in budget.ts:", error);
    return { success: false, error: "Failed to load budgets" };
  }
}

export async function getBudgetVsActual(fiscalYear?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const year = fiscalYear || `${new Date().getFullYear()}`;
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // Get all budgets for this year grouped by account
    const budgetRows = await db
      .select({
        accountId: budgets.accountId,
        month: budgets.month,
        budgetedAmount: budgets.budgetedAmount,
      })
      .from(budgets)
      .where(
        and(eq(budgets.orgId, orgId), eq(budgets.fiscalYear, year))
      );

    // Get actuals from journal entry lines grouped by account and month
    const actualRows = await db
      .select({
        accountId: journalEntryLines.accountId,
        month: sql`EXTRACT(MONTH FROM ${journalEntries.entryDate})`.as("month"),
        total: sql`SUM(${journalEntryLines.debitAmount} - ${journalEntryLines.creditAmount})`.as("total"),
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.orgId, orgId),
          gte(journalEntries.entryDate, startDate),
          lte(journalEntries.entryDate, endDate),
          eq(journalEntries.status, "posted")
        )
      )
      .groupBy(journalEntryLines.accountId, sql`EXTRACT(MONTH FROM ${journalEntries.entryDate})`);

    // Merge budget vs actual
    const actualMap = new Map<string, Map<number, number>>();
    for (const r of actualRows) {
      const key = r.accountId;
      const m = Number(r.month);
      if (!actualMap.has(key)) actualMap.set(key, new Map());
      actualMap.get(key)!.set(m, Number(r.total));
    }

    const budgetMap = new Map<string, Map<number, number>>();
    for (const r of budgetRows) {
      const key = r.accountId;
      const m = r.month;
      if (!budgetMap.has(key)) budgetMap.set(key, new Map());
      budgetMap.get(key)!.set(m, Number(r.budgetedAmount));
    }

    const allAccountIds = [...new Set([...budgetMap.keys(), ...actualMap.keys()])];

    const result = [];
    for (const accountId of allAccountIds) {
      const [acct] = await db
        .select({ code: chartOfAccounts.code, name: chartOfAccounts.name, type: chartOfAccounts.type })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.id, accountId))
        .limit(1);

      if (!acct) continue;

      const months = [];
      for (let m = 1; m <= 12; m++) {
        const budgeted = budgetMap.get(accountId)?.get(m) || 0;
        const actual = actualMap.get(accountId)?.get(m) || 0;
        months.push({ month: m, budgeted, actual, variance: actual - budgeted });
      }

      const totalBudgeted = months.reduce((s, m) => s + m.budgeted, 0);
      const totalActual = months.reduce((s, m) => s + m.actual, 0);

      result.push({
        accountId,
        accountCode: acct.code,
        accountName: acct.name,
        accountType: acct.type,
        months,
        totalBudgeted,
        totalActual,
        totalVariance: totalActual - totalBudgeted,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error in budget.ts:", error);
    return { success: false, error: "Failed to load budget vs actual" };
  }
}

export async function setBudget(data: {
  fiscalYear: string;
  accountId: string;
  month: number;
  budgetedAmount: string;
  notes?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.orgId, orgId),
          eq(budgets.fiscalYear, data.fiscalYear),
          eq(budgets.accountId, data.accountId),
          eq(budgets.month, data.month)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(budgets)
        .set({ budgetedAmount: data.budgetedAmount, notes: data.notes, updatedAt: new Date() })
        .where(eq(budgets.id, existing.id));
    } else {
      await db.insert(budgets).values({
        orgId, fiscalYear: data.fiscalYear,
        accountId: data.accountId, month: data.month,
        budgetedAmount: data.budgetedAmount, notes: data.notes,
      });
    }

    revalidatePath("/reports/budget");
    return { success: true };
  } catch (error) {
    console.error("Error in budget.ts:", error);
    return { success: false, error: "Failed to set budget" };
  }
}
