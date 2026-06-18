import { db } from "@/db";
import {
  invoices,
  customers,
  invoiceItems,
  products,
  chartOfAccounts,
  journalEntryLines,
  journalEntries,
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc, sum } from "drizzle-orm";

export interface RetrievalResult {
  label: string;
  data: Record<string, unknown>[];
  summary?: string;
}

export async function getRevenue(orgId: string, monthsBack = 1): Promise<RetrievalResult> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.netAmount}), '0')`,
      count: sql<number>`COUNT(*)`,
      paid: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.netAmount} ELSE '0' END), '0')`,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), gte(invoices.createdAt, since)));

  return {
    label: `Revenue (last ${monthsBack}m)`,
    data: rows,
    summary: `Total revenue: PKR ${rows[0]?.total || "0"} (${rows[0]?.count || 0} invoices, ${rows[0]?.paid || "0"} paid)`,
  };
}

export async function getPendingInvoices(orgId: string): Promise<RetrievalResult> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.name,
      netAmount: invoices.netAmount,
      balanceAmount: invoices.balanceAmount,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - ${invoices.dueDate})`,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.orgId, orgId),
        sql`${invoices.balanceAmount} > '0'`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      )
    )
    .orderBy(desc(invoices.dueDate));

  const totalOutstanding = rows.reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0);

  return {
    label: "Pending Invoices",
    data: rows,
    summary: `${rows.length} pending invoices, total outstanding: PKR ${totalOutstanding.toFixed(2)}`,
  };
}

export async function getTopProducts(orgId: string, monthsBack = 1): Promise<RetrievalResult> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const rows = await db
    .select({
      productName: products.name,
      sku: products.sku,
      totalQty: sql<string>`SUM(${invoiceItems.quantity})`,
      totalRevenue: sql<string>`SUM(${invoiceItems.lineTotal})`,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .innerJoin(products, eq(invoiceItems.productId, products.id))
    .where(
      and(
        eq(invoices.orgId, orgId),
        gte(invoices.createdAt, since),
        sql`${invoices.status} IN ('paid', 'approved', 'sent', 'partial')`
      )
    )
    .groupBy(products.id, products.name, products.sku)
    .orderBy(desc(sql`SUM(${invoiceItems.lineTotal})`))
    .limit(5);

  return {
    label: "Top Products",
    data: rows,
    summary: rows.map((r) => `${r.productName}: ${r.totalQty} units, PKR ${r.totalRevenue}`).join(", "),
  };
}

export async function getCustomerBalances(orgId: string): Promise<RetrievalResult> {
  const rows = await db
    .select({
      name: customers.name,
      phone: customers.phone,
      balance: customers.balance,
      totalSales: sql<string>`COALESCE(SUM(${invoices.netAmount}), '0')`,
    })
    .from(customers)
    .leftJoin(invoices, eq(customers.id, invoices.customerId))
    .where(eq(customers.orgId, orgId))
    .groupBy(customers.id, customers.name, customers.phone, customers.balance)
    .orderBy(desc(customers.balance))
    .limit(10);

  return {
    label: "Customer Balances",
    data: rows,
    summary: `${rows.length} customers shown. Total outstanding: PKR ${rows.reduce((s, r) => s + parseFloat(r.balance || "0"), 0).toFixed(2)}`,
  };
}

export async function getCashPosition(orgId: string): Promise<RetrievalResult> {
  const accounts = await db
    .select({
      id: chartOfAccounts.id,
      name: chartOfAccounts.name,
      balance: chartOfAccounts.balance,
    })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        sql`${chartOfAccounts.subType} IN ('cash', 'bank')`,
        eq(chartOfAccounts.isActive, true)
      )
    );

  return {
    label: "Cash / Bank Position",
    data: accounts,
    summary: accounts.map((a) => `${a.name}: PKR ${a.balance}`).join(", "),
  };
}

export async function getProfitLoss(orgId: string): Promise<RetrievalResult> {
  const income = await db
    .select({
      total: sql<string>`COALESCE(SUM(${journalEntryLines.creditAmount}), '0')`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.orgId, orgId),
        eq(chartOfAccounts.type, "income")
      )
    );

  const expenses = await db
    .select({
      total: sql<string>`COALESCE(SUM(${journalEntryLines.debitAmount}), '0')`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      and(
        eq(journalEntries.orgId, orgId),
        eq(chartOfAccounts.type, "expense")
      )
    );

  const incomeTotal = parseFloat(income[0]?.total || "0");
  const expenseTotal = parseFloat(expenses[0]?.total || "0");

  return {
    label: "Profit & Loss",
    data: [{ income: incomeTotal, expenses: expenseTotal, netProfit: incomeTotal - expenseTotal }],
    summary: `Income: PKR ${incomeTotal.toFixed(2)}, Expenses: PKR ${expenseTotal.toFixed(2)}, Net: PKR ${(incomeTotal - expenseTotal).toFixed(2)}`,
  };
}

export async function getLowStock(orgId: string): Promise<RetrievalResult> {
  const rows = await db
    .select({
      name: products.name,
      sku: products.sku,
      currentStock: products.currentStock,
      minLevel: products.minStockLevel,
    })
    .from(products)
    .where(
      and(
        eq(products.orgId, orgId),
        sql`${products.currentStock} <= ${products.minStockLevel}`,
        sql`${products.minStockLevel} > '0'`
      )
    )
    .limit(10);

  return {
    label: "Low Stock Products",
    data: rows,
    summary: rows.length > 0
      ? `${rows.length} products below reorder level: ${rows.map((r) => `${r.name} (SKU: ${r.sku}, Stock: ${r.currentStock}, Min: ${r.minLevel})`).join(", ")}`
      : "No low stock products found. All stock levels are healthy!",
  };
}

export async function getOverdueInvoices(orgId: string): Promise<RetrievalResult> {
  const rows = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.name,
      netAmount: invoices.netAmount,
      balanceAmount: invoices.balanceAmount,
      dueDate: invoices.dueDate,
      daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - ${invoices.dueDate})`,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.orgId, orgId),
        sql`${invoices.dueDate} < NOW()`,
        sql`${invoices.balanceAmount} > '0'`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      )
    )
    .orderBy(desc(sql`EXTRACT(DAY FROM NOW() - ${invoices.dueDate})`))
    .limit(10);

  const totalOverdue = rows.reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0);

  return {
    label: "Overdue Invoices",
    data: rows,
    summary: rows.length > 0
      ? `${rows.length} overdue invoices, total PKR ${totalOverdue.toFixed(2)}. ${rows.map((r) => `${r.customerName}: PKR ${r.balanceAmount} (${r.daysOverdue} days overdue)`).join(", ")}`
      : "No overdue invoices. Mashallah!",
  };
}

export async function getTopCustomers(orgId: string, monthsBack = 3): Promise<RetrievalResult> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const rows = await db
    .select({
      name: customers.name,
      phone: customers.phone,
      totalSales: sql<string>`COALESCE(SUM(${invoices.netAmount}), '0')`,
      invoiceCount: sql<number>`COUNT(${invoices.id})`,
    })
    .from(customers)
    .innerJoin(invoices, eq(customers.id, invoices.customerId))
    .where(
      and(
        eq(customers.orgId, orgId),
        gte(invoices.createdAt, since),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      )
    )
    .groupBy(customers.id, customers.name, customers.phone)
    .orderBy(desc(sql`COALESCE(SUM(${invoices.netAmount}), '0')`))
    .limit(5);

  return {
    label: "Top Customers",
    data: rows,
    summary: rows.map((r) => `${r.name}: PKR ${r.totalSales} (${r.invoiceCount} invoices)`).join(", "),
  };
}

export const retrievers: Record<string, (orgId: string, ...args: any[]) => Promise<RetrievalResult>> = {
  revenue: getRevenue,
  pendingInvoices: getPendingInvoices,
  topProducts: getTopProducts,
  customerBalances: getCustomerBalances,
  cashPosition: getCashPosition,
  profitLoss: getProfitLoss,
  lowStock: getLowStock,
  overdueInvoices: getOverdueInvoices,
  topCustomers: getTopCustomers,
};
