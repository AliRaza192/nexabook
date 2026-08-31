"use server";

import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  expenses,
  purchaseInvoices,
  products,
  customers,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, sum } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

// ============= Dashboard Data Interfaces =============

export interface DashboardKPIs {
  totalRevenue: number;
  previousRevenue: number;
  revenueTrend: number;
  netProfit: number;
  previousProfit: number;
  profitTrend: number;
  accountsReceivable: number;
  previousAR: number;
  arTrend: number;
  inventoryValue: number;
  previousInventory: number;
  inventoryTrend: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
}

export interface TopProduct {
  name: string;
  sku: string;
  totalRevenue: number;
  percentage: number;
}

export interface ARAging {
  category: string;
  amount: number;
}

export interface CashPosition {
  accountId: string;
  accountName: string;
  accountCode: string;
  balance: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  monthlyTrends: MonthlyTrend[];
  topProducts: TopProduct[];
  arAging: ARAging[];
  cashPositions: CashPosition[];
  totalCash: number;
}

// ============= Main Dashboard Data Function =============

export async function getDashboardData(dateRange?: { from: Date; to: Date }): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Set date ranges
    const now = new Date();
    const currentPeriod = dateRange || { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    
    // Calculate previous period for trend comparison
    const daysDiff = currentPeriod.to.getTime() - currentPeriod.from.getTime();
    const previousPeriod = {
      from: new Date(currentPeriod.from.getTime() - daysDiff),
      to: new Date(currentPeriod.from.getTime()),
    };

    // ============ KPIs ============
    
    // Total Revenue (sum of approved/paid invoices)
    const [currentRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.netAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, currentPeriod.from),
        lte(invoices.issueDate, currentPeriod.to),
        sql`${invoices.status} IN ('approved', 'sent', 'paid', 'partial')`
      ));

    const [previousRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.netAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, previousPeriod.from),
        lte(invoices.issueDate, previousPeriod.to),
        sql`${invoices.status} IN ('approved', 'sent', 'paid', 'partial')`
      ));

    const totalRevenue = parseFloat(currentRevenueResult?.total || '0');
    const previousRevenue = parseFloat(previousRevenueResult?.total || '0');
    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Net Profit (Revenue - COGS - Expenses)
    const [currentCOGSResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${purchaseInvoices.netAmount}), 0)` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        gte(purchaseInvoices.date, currentPeriod.from),
        lte(purchaseInvoices.date, currentPeriod.to),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const [currentExpensesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(
        eq(expenses.orgId, orgId),
        gte(expenses.date, currentPeriod.from),
        lte(expenses.date, currentPeriod.to)
      ));

    const cogs = parseFloat(currentCOGSResult?.total || '0');
    const operatingExpenses = parseFloat(currentExpensesResult?.total || '0');
    const netProfit = totalRevenue - cogs - operatingExpenses;

    // Previous period profit
    const [prevCOGSResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${purchaseInvoices.netAmount}), 0)` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        gte(purchaseInvoices.date, previousPeriod.from),
        lte(purchaseInvoices.date, previousPeriod.to),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const [prevExpensesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(
        eq(expenses.orgId, orgId),
        gte(expenses.date, previousPeriod.from),
        lte(expenses.date, previousPeriod.to)
      ));

    const prevCOGS = parseFloat(prevCOGSResult?.total || '0');
    const prevExpenses = parseFloat(prevExpensesResult?.total || '0');
    const previousProfit = previousRevenue - prevCOGS - prevExpenses;
    const profitTrend = previousProfit > 0 ? ((netProfit - previousProfit) / Math.abs(previousProfit)) * 100 : 0;

    // Accounts Receivable (outstanding customer balances)
    const [arResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.balanceAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.balanceAmount} > 0`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      ));

    const accountsReceivable = parseFloat(arResult?.total || '0');
    // Previous period AR
    const [prevARResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.balanceAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, previousPeriod.from),
        lte(invoices.issueDate, previousPeriod.to),
        sql`${invoices.balanceAmount} > 0`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      ));
    const previousAR = parseFloat(prevARResult?.total || '0');
    const arTrend = previousAR > 0 ? ((accountsReceivable - previousAR) / previousAR) * 100 : 0;

    // Inventory Value (current stock * cost price)
    const inventoryItems = await db
      .select({
        currentStock: products.currentStock,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

let inventoryValue = 0;
    for (const item of inventoryItems) {
      const stock = parseFloat(String(item.currentStock || '0'));
      const cost = parseFloat(String(item.costPrice || '0'));
      inventoryValue += stock * cost;
    }

    // Simplified inventory trend
    const previousInventory = 0;
    const inventoryTrend = 0;

    // ============ Monthly Trends (Last 6 months) — single GROUP BY query
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueByMonth = await db
      .select({
        month: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${invoices.netAmount}), 0)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, sixMonthsAgo),
        lte(invoices.issueDate, now),
        sql`${invoices.status} IN ('approved', 'sent', 'paid', 'partial')`
      ))
      .groupBy(sql`to_char(${invoices.issueDate}, 'YYYY-MM')`);

    const expensesByMonth = await db
      .select({
        month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(
        eq(expenses.orgId, orgId),
        gte(expenses.date, sixMonthsAgo),
        lte(expenses.date, now)
      ))
      .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`);

    const revenueMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    for (const r of revenueByMonth) revenueMap.set(r.month, parseFloat(r.total || '0'));
    for (const e of expensesByMonth) expenseMap.set(e.month, parseFloat(e.total || '0'));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends: MonthlyTrend[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrends.push({
        month: months[d.getMonth()],
        revenue: revenueMap.get(key) || 0,
        expenses: expenseMap.get(key) || 0,
      });
    }

    // ============ Top Products (Donut Chart) ============
    const topProductsData = await db
      .select({
        productId: invoiceItems.productId,
        totalRevenue: sql<string>`SUM(${invoiceItems.lineTotal})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(
        eq(invoiceItems.orgId, orgId),
        gte(invoices.issueDate, currentPeriod.from),
        lte(invoices.issueDate, currentPeriod.to),
        sql`${invoices.status} IN ('approved', 'sent', 'paid', 'partial')`
      ))
      .groupBy(invoiceItems.productId)
      .orderBy(desc(sql`SUM(${invoiceItems.lineTotal})`))
      .limit(5);

    const totalProductRevenue = topProductsData.reduce((sum, p) => sum + parseFloat(p.totalRevenue || '0'), 0);

    // Batch-fetch product names instead of N+1 individual queries
    const productIds = topProductsData.map((p) => p.productId).filter(Boolean) as string[];
    const productNames = productIds.length > 0
      ? await db
          .select({ id: products.id, name: products.name, sku: products.sku })
          .from(products)
          .where(sql`${products.id} IN ${productIds}`)
      : [];
    const productMap = new Map(productNames.map((p) => [p.id, { name: p.name, sku: p.sku }]));

    const topProducts: TopProduct[] = topProductsData
      .filter((p) => p.productId && productMap.has(p.productId))
      .map((productData) => {
        const product = productMap.get(productData.productId!)!;
        const revenue = parseFloat(productData.totalRevenue || '0');
        return {
          name: product.name,
          sku: product.sku,
          totalRevenue: revenue,
          percentage: totalProductRevenue > 0 ? (revenue / totalProductRevenue) * 100 : 0,
        };
      });

   // ============ AR Aging — Real invoice data se ============
    const outstandingInvoices = await db
      .select({
        dueDate: invoices.dueDate,
        balanceAmount: invoices.balanceAmount,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.balanceAmount} > 0`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      ));

    const agingBuckets = { current: 0, days30: 0, days60: 0, days90Plus: 0 };

    for (const inv of outstandingInvoices) {
      const balance = parseFloat(inv.balanceAmount || '0');
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) agingBuckets.current += balance;
      else if (daysOverdue <= 30) agingBuckets.days30 += balance;
      else if (daysOverdue <= 60) agingBuckets.days60 += balance;
      else agingBuckets.days90Plus += balance;
    }

    const arAging: ARAging[] = [
      { category: '0-30 Days', amount: agingBuckets.current },
      { category: '31-60 Days', amount: agingBuckets.days30 },
      { category: '61-90 Days', amount: agingBuckets.days60 },
      { category: '90+ Days', amount: agingBuckets.days90Plus },
    ];

    // ============ Cash Position — batch query instead of N+1 ============
const cashAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.isActive, true),
        sql`${chartOfAccounts.subType} IN ('cash', 'bank')`
      ));

    const cashAccountIds = cashAccounts.map((a) => a.id);

    // Single batch query for all cash account balances
    const balanceResults = cashAccountIds.length > 0
      ? await db
          .select({
            accountId: journalEntryLines.accountId,
            totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debitAmount}), 0)`,
            totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.creditAmount}), 0)`,
          })
          .from(journalEntryLines)
          .where(and(
            sql`${journalEntryLines.accountId} IN ${cashAccountIds}`,
            eq(journalEntryLines.orgId, orgId)
          ))
          .groupBy(journalEntryLines.accountId)
      : [];

    const balanceMap = new Map(
      balanceResults.map((r) => [r.accountId, { debit: parseFloat(r.totalDebit || '0'), credit: parseFloat(r.totalCredit || '0') }])
    );

    const cashPositions: CashPosition[] = [];
    let totalCash = 0;

    for (const account of cashAccounts) {
      const bal = balanceMap.get(account.id) || { debit: 0, credit: 0 };
      const balance = bal.debit - bal.credit;

      cashPositions.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        balance: balance > 0 ? balance : 0,
      });

      if (balance > 0) totalCash += balance;
    }

    return {
      success: true,
      data: {
        kpis: {
          totalRevenue,
          previousRevenue,
          revenueTrend,
          netProfit,
          previousProfit,
          profitTrend,
          accountsReceivable,
          previousAR,
          arTrend,
          inventoryValue,
          previousInventory,
          inventoryTrend,
        },
        monthlyTrends,
        topProducts,
        arAging,
        cashPositions,
        totalCash,
      }
    };
  } catch (error) {
    console.error("Error in dashboard.ts:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}
