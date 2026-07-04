"use server";

import { db } from "@/db";
import {
  organizations, journalEntries, journalEntryLines, chartOfAccounts,
  invoices, profiles,
} from "@/db/schema";
import { eq, and, sql, lte, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ─── Org Hierarchy Management ───

export async function getOrgHierarchy() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [current] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!current) return { success: false as const, error: "Org not found" };

    const childOrgs = current.parentOrgId
      ? await db
          .select()
          .from(organizations)
          .where(eq(organizations.parentOrgId, current.parentOrgId))
          .orderBy(organizations.name)
      : await db
          .select()
          .from(organizations)
          .where(eq(organizations.parentOrgId, orgId))
          .orderBy(organizations.name);

    const rootOrgId = current.parentOrgId || orgId;
    const [root] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, rootOrgId))
      .limit(1);

    return {
      success: true as const,
      data: { current, root: root || current, children: childOrgs.filter((o) => o.id !== orgId && o.id !== rootOrgId) },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load hierarchy" };
  }
}

export async function linkChildOrg(childOrgId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    await db
      .update(organizations)
      .set({ parentOrgId: orgId, consolidationEnabled: true, updatedAt: new Date() })
      .where(eq(organizations.id, childOrgId));

    await db
      .update(organizations)
      .set({ consolidationEnabled: true, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    revalidatePath("/settings/consolidation");
    return { success: true as const, message: "Child company linked" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to link org" };
  }
}

export async function unlinkChildOrg(childOrgId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    await db
      .update(organizations)
      .set({ parentOrgId: null, consolidationEnabled: false, updatedAt: new Date() })
      .where(eq(organizations.id, childOrgId));

    revalidatePath("/settings/consolidation");
    return { success: true as const, message: "Child company unlinked" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to unlink org" };
  }
}

// ─── Org list for linking ───

export async function getAvailableOrgsForConsolidation() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const allOrgs = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(and(
        sql`${organizations.id} != ${orgId}`,
        sql`${organizations.parentOrgId} IS NULL`,
      ))
      .orderBy(organizations.name);

    return { success: true as const, data: allOrgs };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load orgs" };
  }
}

// ─── Consolidated Reports ───

async function getAllOrgIds(orgId: string): Promise<string[]> {
  const children = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.parentOrgId, orgId));
  return [orgId, ...children.map((c) => c.id)];
}

export async function getConsolidatedPandL(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const orgIds = await getAllOrgIds(orgId);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const orgInfo = await db
      .select({ id: organizations.id, name: organizations.name, currency: organizations.currency })
      .from(organizations)
      .where(inArray(organizations.id, orgIds));

    const parentOrg = orgInfo.find((o) => o.id === orgId);
    const parentCurrency = parentOrg?.currency || "PKR";

    const rows = await db
      .select({
        orgId: journalEntryLines.orgId,
        accountId: journalEntryLines.accountId,
        subType: chartOfAccounts.subType,
        accountType: chartOfAccounts.type,
        accountName: chartOfAccounts.name,
        debit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
        credit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        inArray(journalEntryLines.orgId, orgIds),
        sql`${chartOfAccounts.type} IN ('income', 'expense')`,
        gte(journalEntries.entryDate, fromDate),
        lte(journalEntries.entryDate, toDate),
      ))
      .groupBy(journalEntryLines.orgId, journalEntryLines.accountId, chartOfAccounts.subType, chartOfAccounts.type, chartOfAccounts.name);

    // Group by org
    const orgMap = new Map<string, { income: any[]; expense: any[]; totalIncome: number; totalExpense: number }>();
    for (const info of orgInfo) {
      orgMap.set(info.id, { income: [], expense: [], totalIncome: 0, totalExpense: 0 });
    }

    for (const row of rows) {
      const entry = orgMap.get(row.orgId);
      if (!entry) continue;
      const balance = parseFloat(row.debit || "0") - parseFloat(row.credit || "0");
      if (row.accountType === "income") {
        entry.income.push({ accountId: row.accountId, name: row.accountName, balance: Math.abs(balance) });
        entry.totalIncome += Math.abs(balance);
      } else {
        entry.expense.push({ accountId: row.accountId, name: row.accountName, balance: Math.abs(balance) });
        entry.totalExpense += Math.abs(balance);
      }
    }

    const consolidated = {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      parentCurrency,
      orgs: orgInfo.map((info) => {
        const entry = orgMap.get(info.id) || { income: [], expense: [], totalIncome: 0, totalExpense: 0 };
        return {
          id: info.id,
          name: info.name,
          currency: info.currency,
          income: entry.income,
          expense: entry.expense,
          totalIncome: entry.totalIncome,
          totalExpense: entry.totalExpense,
          netProfit: entry.totalIncome - entry.totalExpense,
        };
      }),
    };

    consolidated.totalIncome = consolidated.orgs.reduce((s, o) => s + o.totalIncome, 0);
    consolidated.totalExpense = consolidated.orgs.reduce((s, o) => s + o.totalExpense, 0);
    consolidated.netProfit = consolidated.totalIncome - consolidated.totalExpense;

    return { success: true as const, data: consolidated };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to generate consolidated P&L" };
  }
}

export async function getConsolidatedBalanceSheet(asOfDate: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const orgIds = await getAllOrgIds(orgId);
    const reportDate = new Date(asOfDate);

    const orgInfo = await db
      .select({ id: organizations.id, name: organizations.name, currency: organizations.currency })
      .from(organizations)
      .where(inArray(organizations.id, orgIds));

    const parentOrg = orgInfo.find((o) => o.id === orgId);
    const parentCurrency = parentOrg?.currency || "PKR";

    const rows = await db
      .select({
        orgId: journalEntryLines.orgId,
        accountId: journalEntryLines.accountId,
        accountType: chartOfAccounts.type,
        accountName: chartOfAccounts.name,
        subType: chartOfAccounts.subType,
        debit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
        credit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        inArray(journalEntryLines.orgId, orgIds),
        sql`${chartOfAccounts.type} IN ('asset', 'liability', 'equity')`,
        lte(journalEntries.entryDate, reportDate),
      ))
      .groupBy(journalEntryLines.orgId, journalEntryLines.accountId, chartOfAccounts.type, chartOfAccounts.name, chartOfAccounts.subType);

    const orgMap = new Map<string, { assets: any[]; liabilities: any[]; equity: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number }>();
    for (const info of orgInfo) {
      orgMap.set(info.id, { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
    }

    for (const row of rows) {
      const entry = orgMap.get(row.orgId);
      if (!entry) continue;
      const balance = parseFloat(row.debit || "0") - parseFloat(row.credit || "0");
      const absBalance = Math.abs(balance);
      if (row.accountType === "asset") {
        entry.assets.push({ accountId: row.accountId, name: row.accountName, balance: absBalance });
        entry.totalAssets += absBalance;
      } else if (row.accountType === "liability") {
        entry.liabilities.push({ accountId: row.accountId, name: row.accountName, balance: absBalance });
        entry.totalLiabilities += absBalance;
      } else {
        entry.equity.push({ accountId: row.accountId, name: row.accountName, balance: absBalance });
        entry.totalEquity += absBalance;
      }
    }

    const consolidated = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      parentCurrency,
      orgs: orgInfo.map((info) => {
        const entry = orgMap.get(info.id) || { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
        return { id: info.id, name: info.name, currency: info.currency, ...entry };
      }),
    };

    consolidated.totalAssets = consolidated.orgs.reduce((s, o) => s + o.totalAssets, 0);
    consolidated.totalLiabilities = consolidated.orgs.reduce((s, o) => s + o.totalLiabilities, 0);
    consolidated.totalEquity = consolidated.orgs.reduce((s, o) => s + o.totalEquity, 0);

    return { success: true as const, data: consolidated };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to generate consolidated balance sheet" };
  }
}
