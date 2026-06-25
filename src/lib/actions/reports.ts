"use server";

import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  customers,
  vendors,
  purchaseInvoices,
  purchaseItems,
  expenses,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  products,
  auditLogs,
  productCategories,
  saleOrders,
  purchaseOrders,
  attendance,
  employees,
  payrollRuns,
  payslips,
  crmCalls,
  leads,
  tickets,
  crmEvents,
  stockMovements,
  stockAdjustments,
  goodReceivingNotes,
  grnItems,
  manufacturingBoms,
  jobOrders,
  bomItems,
  salesReturns,
  salesReturnItems,
  customerPayments,
  vendorPayments,
  organizations,
  profiles,
} from "@/db/schema";
import { eq, and, gte, lte, desc, asc, sql, inArray, or, ilike, sum, count } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

// ============= Profit & Loss Report =============

export async function getProfitAndLossReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const allAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code, type: chartOfAccounts.type })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.isActive, true)));

    const incomeAccounts = allAccounts.filter(a => a.type === 'income');
    const expenseAccounts = allAccounts.filter(a => a.type === 'expense');

    const allRelevantIds = [...incomeAccounts.map(a => a.id), ...expenseAccounts.map(a => a.id)];

    const journalData = allRelevantIds.length > 0 ? await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debitAmount}), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.creditAmount}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        inArray(journalEntryLines.accountId, allRelevantIds),
        gte(journalEntries.entryDate, fromDate),
        lte(journalEntries.entryDate, toDate),
        sql`${journalEntries.status} != 'draft'`,
      ))
      .groupBy(journalEntryLines.accountId) : [];

    const accountMap = new Map(journalData.map(d => [d.accountId, d]));

    let totalRevenue = 0;
    let totalExpenses = 0;
    const incomeBreakdown: { accountId: string; name: string; amount: number }[] = [];
    const expenseBreakdown: { accountId: string; name: string; amount: number }[] = [];

    for (const acc of incomeAccounts) {
      const d = accountMap.get(acc.id);
      const net = d ? (parseFloat(d.totalCredit) - parseFloat(d.totalDebit)) : 0;
      if (Math.abs(net) > 0.01) {
        incomeBreakdown.push({ accountId: acc.id, name: acc.name, amount: net });
        totalRevenue += net;
      }
    }

    for (const acc of expenseAccounts) {
      const d = accountMap.get(acc.id);
      const net = d ? (parseFloat(d.totalDebit) - parseFloat(d.totalCredit)) : 0;
      if (Math.abs(net) > 0.01) {
        expenseBreakdown.push({ accountId: acc.id, name: acc.name, amount: net });
        totalExpenses += net;
      }
    }

    return {
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue - totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        expenseBreakdown,
        incomeBreakdown,
        incomeAccounts,
        expenseAccounts,
      }
    };
  } catch (error) {
    console.error("[getProfitAndLossReport]", error);
    return { success: false, error: "Failed to generate Profit & Loss report" };
  }
}

// ============= Cash Book Report =============

export interface CashBookTransaction {
  id: string;
  date: Date;
  entryNumber: string;
  description: string;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  referenceType: string;
}

export interface CashBookReport {
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;
  transactions: CashBookTransaction[];
  cashAccount: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export async function getCashBookReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    // Find Cash account
const cashAccount = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.subType, 'cash')
      ))
      .limit(1);
    if (!cashAccount || cashAccount.length === 0) {
      return { success: false, error: "Cash account not found. Please create a 'Cash' account in Chart of Accounts." };
    }

    const cashAccountId = cashAccount[0].id;

    // Calculate opening balance (before dateFrom)
    const openingBalanceResult = await db
      .select({
        totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
        totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntryLines.accountId, cashAccountId),
        sql`${journalEntries.entryDate} < ${fromDate}`
      ));

    const openingDebit = openingBalanceResult[0]?.totalDebit ? parseFloat(openingBalanceResult[0].totalDebit) : 0;
    const openingCredit = openingBalanceResult[0]?.totalCredit ? parseFloat(openingBalanceResult[0].totalCredit) : 0;
    const openingBalance = openingDebit - openingCredit;

    // Get transactions within date range
    const transactionsResult = await db
      .select({
        id: journalEntryLines.id,
        date: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
        description: journalEntryLines.description,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
        referenceType: journalEntries.referenceType,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntryLines.accountId, cashAccountId),
        sql`${journalEntries.entryDate} >= ${fromDate}`,
        sql`${journalEntries.entryDate} <= ${toDate}`
      ))
      .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

    // Calculate running balance and format transactions
    let runningBalance = openingBalance;
    let totalCashIn = 0;
    let totalCashOut = 0;

    const transactions: CashBookTransaction[] = transactionsResult.map(row => {
      const cashIn = parseFloat(row.debitAmount || '0');
      const cashOut = parseFloat(row.creditAmount || '0');
      
      runningBalance += cashIn - cashOut;
      totalCashIn += cashIn;
      totalCashOut += cashOut;

      return {
        id: row.id,
        date: row.date,
        entryNumber: row.entryNumber,
        description: row.description || '',
        cashIn,
        cashOut,
        runningBalance,
        referenceType: row.referenceType || '',
      };
    });

    const closingBalance = runningBalance;

    return {
      success: true,
      data: {
        openingBalance,
        totalCashIn,
        totalCashOut,
        closingBalance,
        transactions,
        cashAccount: cashAccount[0],
      }
    };
  } catch (error) {
    console.error('Failed to generate cash book report:', error);
    return { success: false, error: "Failed to generate Cash Book report" };
  }
}

// ============= Balance Sheet Report =============

export async function getBalanceSheetReport(asOfDate: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const reportDate = new Date(asOfDate);

    // Get all accounts by type
    const assetAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'asset')));

    const liabilityAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'liability')));

    const equityAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'equity')));

    // Batch query all account balances in a single GROUP BY query
    const allAccountIds = [
      ...assetAccounts.map(a => a.id),
      ...liabilityAccounts.map(a => a.id),
      ...equityAccounts.map(a => a.id),
    ];

    const balanceRows = allAccountIds.length > 0 ? await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
        totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        inArray(journalEntryLines.accountId, allAccountIds),
        eq(journalEntryLines.orgId, orgId),
        lte(journalEntries.entryDate, reportDate),
        sql`${journalEntries.status} != 'draft'`,
      ))
      .groupBy(journalEntryLines.accountId) : [];

    const balanceMap = new Map<string, number>();
    for (const row of balanceRows) {
      const debit = row.totalDebit ? parseFloat(row.totalDebit) : 0;
      const credit = row.totalCredit ? parseFloat(row.totalCredit) : 0;
      balanceMap.set(row.accountId, debit - credit);
    }

    const getAccountBalance = (accountId: string): number => {
      return balanceMap.get(accountId) ?? 0;
    };

    // Calculate total assets
    let totalAssets = 0;
    const assetBalances = [];
    for (const account of assetAccounts) {
      const balance = getAccountBalance(account.id);
      totalAssets += balance;
      assetBalances.push({ ...account, balance });
    }

    // Calculate total liabilities
    let totalLiabilities = 0;
    const liabilityBalances = [];
    for (const account of liabilityAccounts) {
      const balance = getAccountBalance(account.id);
      totalLiabilities += Math.abs(balance); // Liabilities are credit balances
      liabilityBalances.push({ ...account, balance: Math.abs(balance) });
    }

    // Calculate total equity
    let totalEquity = 0;
    const equityBalances = [];
    for (const account of equityAccounts) {
      const balance = getAccountBalance(account.id);
      totalEquity += Math.abs(balance);
      equityBalances.push({ ...account, balance: Math.abs(balance) });
    }

    return {
      success: true,
      data: {
        asOfDate: reportDate,
        totalAssets,
        totalLiabilities,
        totalEquity,
        assets: assetBalances,
        liabilities: liabilityBalances,
        equity: equityBalances,
      }
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Balance Sheet" };
  }
}

// ============= Customer Ledger Report =============

export interface CustomerLedgerEntry {
  date: Date;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function getCustomerLedgerReport(
  customerId: string,
  dateFrom: string,
  dateTo: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
      .limit(1);

    if (!customer) return { success: false, error: "Customer not found" };

    // Get all invoices for this customer
    const customerInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        netAmount: invoices.netAmount,
        receivedAmount: invoices.receivedAmount,
      })
      .from(invoices)
      .where(and(
        eq(invoices.customerId, customerId),
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate)
      ))
      .orderBy(invoices.issueDate);

    // Build ledger entries
    const ledger: CustomerLedgerEntry[] = [];
    let runningBalance = customer.openingBalance ? parseFloat(customer.openingBalance) : 0;

    // Opening balance entry
    ledger.push({
      date: fromDate,
      reference: "OPENING",
      description: "Opening Balance",
      debit: 0,
      credit: 0,
      balance: runningBalance,
    });

    // Add invoice entries
    for (const inv of customerInvoices) {
      const invoiceAmount = inv.netAmount ? parseFloat(inv.netAmount) : 0;
      const receivedAmount = inv.receivedAmount ? parseFloat(inv.receivedAmount) : 0;

      // Invoice (Debit - customer owes)
      ledger.push({
        date: inv.issueDate,
        reference: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber}`,
        debit: invoiceAmount,
        credit: 0,
        balance: runningBalance + invoiceAmount,
      });

      runningBalance += invoiceAmount;

      // Payment (Credit - customer paid)
      if (receivedAmount > 0) {
        ledger.push({
          date: inv.issueDate,
          reference: `PAY-${inv.invoiceNumber}`,
          description: `Payment received for ${inv.invoiceNumber}`,
          debit: 0,
          credit: receivedAmount,
          balance: runningBalance - receivedAmount,
        });

        runningBalance -= receivedAmount;
      }
    }

    // Calculate totals
    const totalDebit = ledger.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = ledger.reduce((sum, entry) => sum + entry.credit, 0);
    const closingBalance = runningBalance;

    return {
      success: true,
      data: {
        customer,
        ledger,
        totalDebit,
        totalCredit,
        closingBalance,
        dateFrom: fromDate,
        dateTo: toDate,
      }
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Customer Ledger" };
  }
}

// ============= Audit Trail Report =============

export async function getAuditTrail(
  dateFrom?: string,
  dateTo?: string,
  entityType?: string,
  userId?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(auditLogs.orgId, orgId)];

    if (dateFrom && dateTo) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
      conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
    }

    if (entityType && entityType !== 'all') {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);

    return { success: true, data: logs };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to fetch audit trail" };
  }
}

// ============= Trial Balance Report =============

export async function getTrialBalanceReport(asOfDate: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const reportDate = new Date(asOfDate);

    // Get all accounts
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.isActive, true)))
      .orderBy(chartOfAccounts.code);

    // Calculate balances for each account using single GROUP BY query
    const accountBalances = [];
    let totalDebit = 0;
    let totalCredit = 0;

    const accountIds = accounts.map(a => a.id);

    const balanceResults = await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
        totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        inArray(journalEntryLines.accountId, accountIds),
        lte(journalEntries.entryDate, reportDate),
        sql`${journalEntries.status} != 'draft'`,
      ))
      .groupBy(journalEntryLines.accountId);

    const balanceMap = new Map<string, { debit: number; credit: number }>();
    for (const row of balanceResults) {
      balanceMap.set(row.accountId, {
        debit: row.totalDebit ? parseFloat(row.totalDebit) : 0,
        credit: row.totalCredit ? parseFloat(row.totalCredit) : 0,
      });
    }

    for (const account of accounts) {
      const result = balanceMap.get(account.id);
      const debit = result?.debit ?? 0;
      const credit = result?.credit ?? 0;
      const balance = debit - credit;

      if (balance !== 0) {
        accountBalances.push({
          ...account,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        });

        if (balance > 0) totalDebit += balance;
        else totalCredit += Math.abs(balance);
      }
    }

    return {
      success: true,
      data: {
        asOfDate: reportDate,
        accounts: accountBalances,
        totalDebit,
        totalCredit,
      }
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Trial Balance" };
  }
}

// ============= Inventory Reports =============

export async function getStockOnHandReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const stockItems = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        costPrice: products.costPrice,
        salePrice: products.salePrice,
        unit: products.unit,
        category: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    let totalValue = 0;
const itemsWithValue = stockItems.map(item => {
      const stock = parseFloat(String(item.currentStock || '0'));
      const cost = parseFloat(String(item.costPrice || '0'));
      const value = stock * cost;
      totalValue += value;
      return { ...item, stockValue: value };
    });

    return { success: true, data: { items: itemsWithValue, totalValue } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Stock on Hand report" };
  }
}

export async function getLowStockReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const products_list = await db
      .select()
      .from(products)
      .where(and(
        eq(products.orgId, orgId),
        eq(products.isActive, true)
      ));

const lowStockItems = products_list.filter(p => {
      if (p.currentStock === null || p.minStockLevel === null) return false;
      return parseFloat(String(p.currentStock)) <= parseFloat(String(p.minStockLevel));
    });
    return { success: true, data: lowStockItems };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Low Stock report" };
  }
}

// ============= Sales Reports =============

export async function getSalesByProductReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const salesData = await db
      .select({
        productId: invoiceItems.productId,
        productName: products.name,
        sku: products.sku,
        totalQuantity: sql<string>`SUM(${invoiceItems.quantity})`,
        totalRevenue: sql<string>`SUM(${invoiceItems.lineTotal})`,
      })
      .from(invoiceItems)
      .leftJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(
        eq(invoiceItems.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ))
      .groupBy(invoiceItems.productId, products.name, products.sku)
      .orderBy(sql<string>`SUM(${invoiceItems.lineTotal}) DESC`);

    return { success: true, data: salesData };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Sales by Product report" };
  }
}

// ============= Aged Receivables Report =============

export async function getAgedReceivablesReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const now = new Date();

    // Real aging from outstanding invoices
    const outstandingInvoices = await db
      .select({
        customerId: invoices.customerId,
        customerName: customers.name,
        invoiceNumber: invoices.invoiceNumber,
        dueDate: invoices.dueDate,
        balanceAmount: invoices.balanceAmount,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.balanceAmount} > 0`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
      ));

    // Group by customer and bucket by days overdue
    const customerMap = new Map<string, {
      id: string;
      name: string;
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      balance: number;
    }>();

    for (const inv of outstandingInvoices) {
      const balance = parseFloat(inv.balanceAmount || '0');
      if (balance <= 0) continue;

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (!customerMap.has(inv.customerId)) {
        customerMap.set(inv.customerId, {
          id: inv.customerId,
          name: inv.customerName || 'Unknown',
          current: 0,
          days30: 0,
          days60: 0,
          days90Plus: 0,
          balance: 0,
        });
      }

      const entry = customerMap.get(inv.customerId)!;
      entry.balance += balance;

      if (daysOverdue <= 0) entry.current += balance;
      else if (daysOverdue <= 30) entry.days30 += balance;
      else if (daysOverdue <= 60) entry.days60 += balance;
      else entry.days90Plus += balance;
    }

    const agedReceivables = Array.from(customerMap.values());

    const totals = agedReceivables.reduce((acc, c) => ({
      balance: acc.balance + c.balance,
      current: acc.current + c.current,
      days30: acc.days30 + c.days30,
      days60: acc.days60 + c.days60,
      days90Plus: acc.days90Plus + c.days90Plus,
    }), { balance: 0, current: 0, days30: 0, days60: 0, days90Plus: 0 });

    return { success: true, data: { customers: agedReceivables, totals } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Aged Receivables report" };
  }
}

// ============= Payroll Reports =============

export async function getPayrollSummaryReport(month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // This would query payroll runs and payslips
    // Placeholder implementation
    return { success: true, data: { month, year, summary: "Payroll summary report" } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Payroll Summary" };
  }
}

// ============= Tax Reports =============

export async function getSalesTaxReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const taxCollected = await db
      .select({
        totalTax: sql<string>`SUM(${invoices.taxAmount})`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const taxPaid = await db
      .select({
        totalTax: sql<string>`SUM(${purchaseInvoices.taxTotal})`,
      })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        gte(purchaseInvoices.date, fromDate),
        lte(purchaseInvoices.date, toDate),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    // Provincial breakdown from invoice items
    const salesTaxByType = await db
      .select({
        taxType: invoiceItems.taxType,
        total: sql<string>`SUM(COALESCE(${invoiceItems.lineTotal} * ${invoiceItems.taxRate} / 100, 0))`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`,
      ))
      .groupBy(invoiceItems.taxType);

    const purchaseTaxByType = await db
      .select({
        taxType: purchaseItems.taxType,
        total: sql<string>`SUM(COALESCE(${purchaseItems.lineTotal} * ${purchaseItems.taxRate} / 100, 0))`,
      })
      .from(purchaseItems)
      .innerJoin(purchaseInvoices, eq(purchaseItems.purchaseInvoiceId, purchaseInvoices.id))
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        gte(purchaseInvoices.date, fromDate),
        lte(purchaseInvoices.date, toDate),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`,
      ))
      .groupBy(purchaseItems.taxType);

    return {
      success: true,
      data: {
        taxCollected: taxCollected[0]?.totalTax ? parseFloat(taxCollected[0].totalTax) : 0,
        taxPaid: taxPaid[0]?.totalTax ? parseFloat(taxPaid[0].totalTax) : 0,
        provincial: {
          collected: salesTaxByType.map(r => ({ type: r.taxType || 'GST', amount: parseFloat(r.total || '0') })),
          paid: purchaseTaxByType.map(r => ({ type: r.taxType || 'GST', amount: parseFloat(r.total || '0') })),
        },
      }
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Sales Tax report" };
  }
}

// ============= Helper Functions =============

export async function getCustomers() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const customersList = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isActive, true)))
      .orderBy(customers.name);

    return { success: true, data: customersList };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// ============= PURCHASE & VENDOR REPORTS =============

export async function getAgedPayablesReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // const vendorsWithBalance = await db
    //   .select()
    //   .from(vendors)
    //   .where(and(eq(vendors.orgId, orgId), eq(vendors.isActive, true)));

    const now = new Date();

    const outstandingBills = await db
      .select({
        vendorId: purchaseInvoices.vendorId,
        vendorName: vendors.name,
        billNumber: purchaseInvoices.billNumber,
        dueDate: purchaseInvoices.dueDate,
        netAmount: purchaseInvoices.netAmount,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Cancelled')`
      ));

    const vendorMap = new Map<string, {
      id: string;
      name: string;
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      balance: number;
    }>();

    for (const bill of outstandingBills) {
      const amount = parseFloat(bill.netAmount || '0');
      if (amount <= 0) continue;

      const dueDate = bill.dueDate ? new Date(bill.dueDate) : now;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (!vendorMap.has(bill.vendorId)) {
        vendorMap.set(bill.vendorId, {
          id: bill.vendorId,
          name: bill.vendorName || 'Unknown',
          current: 0, days30: 0, days60: 0, days90Plus: 0, balance: 0,
        });
      }

      const entry = vendorMap.get(bill.vendorId)!;
      entry.balance += amount;

      if (daysOverdue <= 0) entry.current += amount;
      else if (daysOverdue <= 30) entry.days30 += amount;
      else if (daysOverdue <= 60) entry.days60 += amount;
      else entry.days90Plus += amount;
    }

    const agedPayables = Array.from(vendorMap.values());
    return { success: true, data: agedPayables };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Aged Payables report" };
  }
}

export async function getVendorLedgerReport(vendorId: string, dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [vendor] = await db.select().from(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId))).limit(1);
    if (!vendor) return { success: false, error: "Vendor not found" };

    const vendorInvoices = await db
      .select({ id: purchaseInvoices.id, billNumber: purchaseInvoices.billNumber, date: purchaseInvoices.date, netAmount: purchaseInvoices.netAmount })
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.vendorId, vendorId), eq(purchaseInvoices.orgId, orgId), gte(purchaseInvoices.date, new Date(dateFrom)), lte(purchaseInvoices.date, new Date(dateTo))))
      .orderBy(purchaseInvoices.date);

    const ledger = vendorInvoices.map(inv => ({
      date: inv.date,
      reference: inv.billNumber,
      description: `Purchase Invoice ${inv.billNumber}`,
      credit: inv.netAmount ? parseFloat(inv.netAmount) : 0,
      debit: 0,
      balance: 0,
    }));

    return { success: true, data: { vendor, ledger, dateFrom, dateTo } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Vendor Ledger" };
  }
}

export async function getPurchaseDetailsReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const purchases = await db
      .select({
        id: purchaseInvoices.id,
        billNumber: purchaseInvoices.billNumber,
        date: purchaseInvoices.date,
        vendorId: purchaseInvoices.vendorId,
        vendorName: vendors.name,
        grossAmount: purchaseInvoices.grossAmount,
        discountTotal: purchaseInvoices.discountTotal,
        taxTotal: purchaseInvoices.taxTotal,
        netAmount: purchaseInvoices.netAmount,
        status: purchaseInvoices.status,
        reference: purchaseInvoices.reference,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(and(eq(purchaseInvoices.orgId, orgId), gte(purchaseInvoices.date, new Date(dateFrom)), lte(purchaseInvoices.date, new Date(dateTo))))
      .orderBy(desc(purchaseInvoices.date));

    return { success: true, data: purchases };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Purchase Details report" };
  }
}

export async function getPurchaseTaxReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const taxPaid = await db
      .select({
        vendorId: vendors.id,
        vendorName: vendors.name,
        totalTax: sql<string>`SUM(${purchaseInvoices.taxTotal})`,
        totalAmount: sql<string>`SUM(${purchaseInvoices.netAmount})`,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(and(eq(purchaseInvoices.orgId, orgId), gte(purchaseInvoices.date, new Date(dateFrom)), lte(purchaseInvoices.date, new Date(dateTo)), sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`))
      .groupBy(vendors.id, vendors.name);

    return { success: true, data: taxPaid };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Purchase Tax report" };
  }
}

// ============= INVENTORY REPORTS =============

export async function getStockMovementReport(productId?: string, dateFrom?: string, dateTo?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(stockMovements.orgId, orgId)];
    if (productId) conditions.push(eq(stockMovements.productId, productId));
    if (dateFrom && dateTo) {
      conditions.push(gte(stockMovements.createdAt, new Date(dateFrom)));
      conditions.push(lte(stockMovements.createdAt, new Date(dateTo)));
    }

    const movements = await db
      .select({
        id: stockMovements.id,
        productName: products.name,
        productSku: products.sku,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        totalValue: stockMovements.totalValue,
        referenceNumber: stockMovements.referenceNumber,
        runningBalance: stockMovements.runningBalance,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));

    return { success: true, data: movements };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Stock Movement report" };
  }
}

export async function getProductLedgerReport(productId: string, dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.orgId, orgId))).limit(1);
    if (!product) return { success: false, error: "Product not found" };

    const movements = await db
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.orgId, orgId), eq(stockMovements.productId, productId), gte(stockMovements.createdAt, new Date(dateFrom)), lte(stockMovements.createdAt, new Date(dateTo))))
      .orderBy(stockMovements.createdAt);

    return { success: true, data: { product, movements } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Product Ledger" };
  }
}

// ============= PAYROLL & HR REPORTS =============

export async function getEmployeeLedgerReport(employeeId: string, month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.orgId, orgId))).limit(1);
    if (!employee) return { success: false, error: "Employee not found" };

    const employeePayslips = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.orgId, orgId), eq(payslips.employeeId, employeeId)))
      .orderBy(desc(payslips.createdAt));

    return { success: true, data: { employee, payslips: employeePayslips } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Employee Ledger" };
  }
}

export async function getAttendanceReport(month?: number, year?: number, employeeId?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(attendance.orgId, orgId)];
    if (month) conditions.push(sql`EXTRACT(MONTH FROM ${attendance.date}) = ${month}`);
    if (year) conditions.push(sql`EXTRACT(YEAR FROM ${attendance.date}) = ${year}`);
    if (employeeId) conditions.push(eq(attendance.employeeId, employeeId));

    const records = await db
      .select({
        id: attendance.id,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        overtime: attendance.overtime,
        lateMinutes: attendance.lateMinutes,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date))
      .limit(1000);

    return { success: true, data: records };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Attendance report" };
  }
}

export async function getPayrollSummaryReportFull(month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const payrollRunsData = await db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.orgId, orgId), eq(payrollRuns.month, month), eq(payrollRuns.year, year)))
      .limit(1);

    if (payrollRunsData.length === 0) {
      return { success: false, error: "No payroll run found for this month/year" };
    }

    const payrollRun = payrollRunsData[0];

    const payrollPayslips = await db
      .select({
        id: payslips.id,
        employeeName: payslips.employeeName,
        employeeCode: payslips.employeeCode,
        department: payslips.department,
        basicSalary: payslips.basicSalary,
        totalEarnings: payslips.totalEarnings,
        totalDeductions: payslips.totalDeductions,
        netSalary: payslips.netSalary,
        isPaid: payslips.isPaid,
      })
      .from(payslips)
      .where(eq(payslips.payrollRunId, payrollRun.id));

    return { success: true, data: { payrollRun, payslips: payrollPayslips } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Payroll Summary" };
  }
}

// ============= CRM REPORTS =============

export async function getCallEngagementReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const calls = await db
      .select({
        id: crmCalls.id,
        customerName: customers.name,
        leadName: leads.name,
        callType: crmCalls.callType,
        subject: crmCalls.subject,
        duration: crmCalls.duration,
        outcome: crmCalls.outcome,
        createdAt: crmCalls.createdAt,
      })
      .from(crmCalls)
      .leftJoin(customers, eq(crmCalls.customerId, customers.id))
      .leftJoin(leads, eq(crmCalls.leadId, leads.id))
      .where(and(eq(crmCalls.orgId, orgId), gte(crmCalls.createdAt, new Date(dateFrom)), lte(crmCalls.createdAt, new Date(dateTo))))
      .orderBy(desc(crmCalls.createdAt));

    const stats = {
      totalCalls: calls.length,
      totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
      avgDuration: calls.length > 0 ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length : 0,
      byOutcome: calls.reduce((acc: Record<string, number>, c) => {
        const outcome = c.outcome || "Unknown";
        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
      }, {}),
    };

    return { success: true, data: { calls, stats } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Call Engagement report" };
  }
}

export async function getLeadStatusSummaryReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allLeads = await db.select().from(leads).where(eq(leads.orgId, orgId));

    const summary = allLeads.reduce((acc: Record<string, { count: number; value: number }>, lead) => {
      const status = lead.status || "unknown";
      if (!acc[status]) acc[status] = { count: 0, value: 0 };
      acc[status].count += 1;
      acc[status].value += lead.estimatedValue ? parseFloat(lead.estimatedValue) : 0;
      return acc;
    }, {});

    return { success: true, data: { summary, totalLeads: allLeads.length } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Lead Status Summary" };
  }
}

export async function getMonthCallInsightReport(month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const calls = await db
      .select()
      .from(crmCalls)
      .where(and(eq(crmCalls.orgId, orgId), sql`EXTRACT(MONTH FROM ${crmCalls.createdAt}) = ${month}`, sql`EXTRACT(YEAR FROM ${crmCalls.createdAt}) = ${year}`));

    const dailyBreakdown = calls.reduce((acc: Record<number, number>, call) => {
      const day = call.createdAt ? call.createdAt.getDate() : 0;
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return { success: true, data: { calls, dailyBreakdown, totalCalls: calls.length } };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Month Call Insight" };
  }
}

// ============= MANUFACTURING & BUSINESS REPORTS =============

export async function getJobOrderProductionReport(status?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(jobOrders.orgId, orgId)];
    if (status) conditions.push(eq(jobOrders.status, status as any));

    const jobOrdersData = await db
      .select({
        id: jobOrders.id,
        orderNumber: jobOrders.orderNumber,
        bomName: manufacturingBoms.name,
        finishedGoodName: products.name,
        quantityToProduce: jobOrders.quantityToProduce,
        status: jobOrders.status,
        completionDate: jobOrders.completionDate,
        createdAt: jobOrders.createdAt,
      })
      .from(jobOrders)
      .leftJoin(manufacturingBoms, eq(jobOrders.bomId, manufacturingBoms.id))
      .leftJoin(products, eq(manufacturingBoms.finishedGoodId, products.id))
      .where(and(...conditions))
      .orderBy(desc(jobOrders.createdAt));

    return { success: true, data: jobOrdersData };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Job Order Production report" };
  }
}

export async function getMaterialIssuanceReport(jobOrderId?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(bomItems.orgId, orgId)];
    if (jobOrderId) {
      const [jo] = await db.select({ bomId: jobOrders.bomId }).from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
      if (jo) conditions.push(eq(bomItems.bomId, jo.bomId));
    }

    const materials = await db
      .select({
        componentName: products.name,
        componentSku: products.sku,
        quantityRequired: bomItems.quantityRequired,
        unit: bomItems.unit,
        bomName: manufacturingBoms.name,
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .leftJoin(manufacturingBoms, eq(bomItems.bomId, manufacturingBoms.id))
      .where(and(...conditions));

    return { success: true, data: materials };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Material Issuance report" };
  }
}

export async function getBomCostReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const boms = await db
      .select()
      .from(manufacturingBoms)
      .where(and(eq(manufacturingBoms.orgId, orgId), eq(manufacturingBoms.isActive, true)));

    const bomIds = boms.map((b) => b.id);

    const allComponents = await db
      .select({
        bomId: bomItems.bomId,
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
      })
      .from(bomItems)
      .where(inArray(bomItems.bomId, bomIds));

    const componentIds = [...new Set(allComponents.map((c) => c.componentId))];

    const productsMap = new Map<string, string>();
    if (componentIds.length > 0) {
      const productRows = await db
        .select({ id: products.id, costPrice: products.costPrice })
        .from(products)
        .where(inArray(products.id, componentIds));
      for (const p of productRows) {
        productsMap.set(p.id, p.costPrice || "0");
      }
    }

    const componentsByBom = new Map<string, typeof allComponents>();
    for (const comp of allComponents) {
      const list = componentsByBom.get(comp.bomId);
      if (list) list.push(comp);
      else componentsByBom.set(comp.bomId, [comp]);
    }

    const bomCosts = boms.map((bom) => {
      const components = componentsByBom.get(bom.id) || [];
      let totalCost = 0;
      for (const comp of components) {
        const costPrice = productsMap.get(comp.componentId);
        if (costPrice) {
          totalCost += parseFloat(comp.quantityRequired || "0") * parseFloat(costPrice);
        }
      }
      return { ...bom, totalCost, componentCount: components.length };
    });

    return { success: true, data: bomCosts };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate BOM Cost report" };
  }
}

export async function getCashFlowReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Operating activities
    const salesInflow = await db
      .select({ total: sql<string>`SUM(${invoices.receivedAmount})` })
      .from(invoices)
      .where(and(eq(invoices.orgId, orgId), gte(invoices.issueDate, fromDate), lte(invoices.issueDate, toDate)));

    const expenseOutflow = await db
      .select({ total: sql<string>`SUM(${expenses.amount})` })
      .from(expenses)
      .where(and(eq(expenses.orgId, orgId), gte(expenses.date, fromDate), lte(expenses.date, toDate)));

    const netCashFlow = (salesInflow[0]?.total ? parseFloat(salesInflow[0].total) : 0) - (expenseOutflow[0]?.total ? parseFloat(expenseOutflow[0].total) : 0);

    return {
      success: true,
      data: {
        operatingActivities: {
          salesInflow: salesInflow[0]?.total ? parseFloat(salesInflow[0].total) : 0,
          expenseOutflow: expenseOutflow[0]?.total ? parseFloat(expenseOutflow[0].total) : 0,
        },
        netCashFlow,
        dateFrom,
        dateTo,
      }
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Cash Flow report" };
  }
}

export async function getProductAgingReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const productList = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    const now = new Date();
    const aged = productList.map(p => {
      const daysInStock = Math.floor((now.getTime() - (p.createdAt?.getTime() || 0)) / (1000 * 60 * 60 * 24));
      let agingCategory = "0-30 days";
      if (daysInStock > 90) agingCategory = "90+ days";
      else if (daysInStock > 60) agingCategory = "60-90 days";
      else if (daysInStock > 30) agingCategory = "30-60 days";

      return { ...p, daysInStock, agingCategory };
    });

    return { success: true, data: aged };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Product Aging report" };
  }
}

export async function getWithholdingTaxReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const payments = await db
      .select({
        id: vendorPayments.id,
        paymentNumber: vendorPayments.paymentNumber,
        paymentDate: vendorPayments.paymentDate,
        amount: vendorPayments.amount,
        whtAmount: vendorPayments.whtAmount,
        whtRate: vendorPayments.whtRate,
        vendorName: vendors.name,
        vendorNtn: vendors.ntn,
        reference: vendorPayments.reference,
      })
      .from(vendorPayments)
      .leftJoin(vendors, eq(vendorPayments.vendorId, vendors.id))
      .where(
        and(
          eq(vendorPayments.orgId, orgId),
          gte(vendorPayments.paymentDate, fromDate),
          lte(vendorPayments.paymentDate, toDate),
          sql`COALESCE(${vendorPayments.whtAmount}, '0')::numeric > 0`,
        ),
      )
      .orderBy(desc(vendorPayments.paymentDate));

    let totalWHT = 0;
    for (const p of payments) {
      totalWHT += parseFloat(p.whtAmount || '0');
    }

    return {
      success: true,
      data: {
        dateFrom,
        dateTo,
        totalWHT,
        transactions: payments.map(p => ({
          id: p.id,
          paymentNumber: p.paymentNumber,
          paymentDate: p.paymentDate,
          vendorName: p.vendorName,
          vendorNtn: p.vendorNtn,
          paymentAmount: parseFloat(p.amount || '0'),
          whtAmount: parseFloat(p.whtAmount || '0'),
          whtRate: parseFloat(p.whtRate || '0'),
          reference: p.reference,
        })),
      },
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate WHT report" };
  }
}


// ============= Sales Invoice Detail Report =============



// ============= 1. Sales Invoice Detail Report =============

export async function getSalesInvoiceDetailReport(
  dateFrom: string,
  dateTo: string,
  customerId?: string,
  status?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(invoices.orgId, orgId),
      gte(invoices.issueDate, from),
      lte(invoices.issueDate, to),
    ];
    if (customerId) conditions.push(eq(invoices.customerId, customerId));
    if (status) conditions.push(eq(invoices.status, status as any));

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        grossAmount: invoices.grossAmount,
        discountAmount: invoices.discountAmount,
        taxAmount: invoices.taxAmount,
        shippingCharges: invoices.shippingCharges,
        netAmount: invoices.netAmount,
        receivedAmount: invoices.receivedAmount,
        balanceAmount: invoices.balanceAmount,
        status: invoices.status,
        orderBooker: invoices.orderBooker,
        reference: invoices.reference,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.issueDate));

    const totals = rows.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + parseFloat(r.grossAmount || "0"),
        discountAmount: acc.discountAmount + parseFloat(r.discountAmount || "0"),
        taxAmount: acc.taxAmount + parseFloat(r.taxAmount || "0"),
        netAmount: acc.netAmount + parseFloat(r.netAmount || "0"),
        receivedAmount: acc.receivedAmount + parseFloat(r.receivedAmount || "0"),
        balanceAmount: acc.balanceAmount + parseFloat(r.balanceAmount || "0"),
      }),
      { grossAmount: 0, discountAmount: 0, taxAmount: 0, netAmount: 0, receivedAmount: 0, balanceAmount: 0 }
    );

    return { success: true, data: { rows, totals, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Sales Invoice Detail Report" };
  }
}

// ============= 2. Customer Balance Report =============

export async function getCustomerBalanceReport(
  customerId?: string,
  dateAsOf?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const asOf = dateAsOf ? new Date(dateAsOf) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const conditions = [eq(customers.orgId, orgId), eq(customers.isActive, true)];
    if (customerId) conditions.push(eq(customers.id, customerId));

    const customerRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        city: customers.city,
        openingBalance: customers.openingBalance,
        balance: customers.balance,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name);

    // For each customer, calculate: totalInvoiced, totalReceived, balance
    const customerIds = customerRows.map(c => c.id);
    const invoiceAggs = customerIds.length
      ? await db
          .select({
            customerId: invoices.customerId,
            total: sql<number>`COALESCE(SUM(${invoices.netAmount}),0)`,
            received: sql<number>`COALESCE(SUM(${invoices.receivedAmount}),0)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.orgId, orgId),
              inArray(invoices.customerId, customerIds),
              lte(invoices.issueDate, asOf)
            )
          )
          .groupBy(invoices.customerId)
      : [];

    const aggMap = new Map(invoiceAggs.map(a => [a.customerId, a]));

    const result = customerRows.map((c) => {
      const agg = aggMap.get(c.id);
      const totalInvoiced = parseFloat(String(agg?.total ?? "0"));
      const totalReceived = parseFloat(String(agg?.received ?? "0"));
      const openingBal = parseFloat(c.openingBalance || "0");
      const balance = openingBal + totalInvoiced - totalReceived;

      return {
        ...c,
        totalInvoiced,
        totalReceived,
        openingBalance: openingBal,
        balance,
      };
    });

    const grandTotal = result.reduce(
      (acc, r) => ({
        totalInvoiced: acc.totalInvoiced + r.totalInvoiced,
        totalReceived: acc.totalReceived + r.totalReceived,
        balance: acc.balance + r.balance,
      }),
      { totalInvoiced: 0, totalReceived: 0, balance: 0 }
    );

    return { success: true, data: { rows: result, grandTotal, asOf: dateAsOf } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Customer Balance Report" };
  }
}

// ============= 3. Sale Return Report =============

export async function getSaleReturnReport(
  dateFrom: string,
  dateTo: string,
  customerId?: string,
  status?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(salesReturns.orgId, orgId),
      gte(salesReturns.returnDate, from),
      lte(salesReturns.returnDate, to),
    ];
    if (customerId) conditions.push(eq(salesReturns.customerId, customerId));
    if (status) conditions.push(eq(salesReturns.status, status));

    const rows = await db
      .select({
        id: salesReturns.id,
        returnNumber: salesReturns.returnNumber,
        returnDate: salesReturns.returnDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        invoiceId: salesReturns.invoiceId,
        reason: salesReturns.reason,
        reasonDetails: salesReturns.reasonDetails,
        grossAmount: salesReturns.grossAmount,
        discountAmount: salesReturns.discountAmount,
        taxAmount: salesReturns.taxAmount,
        netAmount: salesReturns.netAmount,
        refundAmount: salesReturns.refundAmount,
        status: salesReturns.status,
        notes: salesReturns.notes,
      })
      .from(salesReturns)
      .leftJoin(customers, eq(salesReturns.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(salesReturns.returnDate));

    // Get invoice numbers separately
    const invoiceIds = rows
      .filter((r) => r.invoiceId)
      .map((r) => r.invoiceId as string);
    let invoiceMap: Record<string, string> = {};
    if (invoiceIds.length > 0) {
      const invRows = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(inArray(invoices.id, invoiceIds));
      invoiceMap = Object.fromEntries(invRows.map((i) => [i.id, i.invoiceNumber]));
    }

    const enriched = rows.map((r) => ({
      ...r,
      invoiceNumber: r.invoiceId ? invoiceMap[r.invoiceId] || "—" : "—",
    }));

    const totals = enriched.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + parseFloat(r.grossAmount || "0"),
        netAmount: acc.netAmount + parseFloat(r.netAmount || "0"),
        refundAmount: acc.refundAmount + parseFloat(r.refundAmount || "0"),
      }),
      { grossAmount: 0, netAmount: 0, refundAmount: 0 }
    );

    return { success: true, data: { rows: enriched, totals, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Sale Return Report" };
  }
}

// ============= 4. Receive Payment Report =============

export async function getReceivePaymentReport(
  dateFrom: string,
  dateTo: string,
  customerId?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(customerPayments.orgId, orgId),
      gte(customerPayments.paymentDate, from),
      lte(customerPayments.paymentDate, to),
    ];
    if (customerId) conditions.push(eq(customerPayments.customerId, customerId));

    const rows = await db
      .select({
        id: customerPayments.id,
        paymentNumber: customerPayments.paymentNumber,
        paymentDate: customerPayments.paymentDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        paymentMethod: customerPayments.paymentMethod,
        amount: customerPayments.amount,
        reference: customerPayments.reference,
        notes: customerPayments.notes,
      })
      .from(customerPayments)
      .leftJoin(customers, eq(customerPayments.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(customerPayments.paymentDate));

    const totalAmount = rows.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);

    // Group by payment method
    const byMethod: Record<string, number> = {};
    rows.forEach((r) => {
      const m = r.paymentMethod || "other";
      byMethod[m] = (byMethod[m] || 0) + parseFloat(r.amount || "0");
    });

    return {
      success: true,
      data: { rows, totalAmount, byMethod, dateFrom, dateTo },
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Receive Payment Report" };
  }
}

// ============= 5. Purchase Invoice Detail Report =============

export async function getPurchaseInvoiceDetailReport(
  dateFrom: string,
  dateTo: string,
  vendorId?: string,
  status?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(purchaseInvoices.orgId, orgId),
      gte(purchaseInvoices.date, from),
      lte(purchaseInvoices.date, to),
    ];
    if (vendorId) conditions.push(eq(purchaseInvoices.vendorId, vendorId));
    if (status) conditions.push(eq(purchaseInvoices.status, status));

    const rows = await db
      .select({
        id: purchaseInvoices.id,
        billNumber: purchaseInvoices.billNumber,
        date: purchaseInvoices.date,
        dueDate: purchaseInvoices.dueDate,
        vendorName: vendors.name,
        vendorPhone: vendors.phone,
        grossAmount: purchaseInvoices.grossAmount,
        discountTotal: purchaseInvoices.discountTotal,
        taxTotal: purchaseInvoices.taxTotal,
        netAmount: purchaseInvoices.netAmount,
        status: purchaseInvoices.status,
        reference: purchaseInvoices.reference,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseInvoices.date));

    const totals = rows.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + parseFloat(r.grossAmount || "0"),
        discountTotal: acc.discountTotal + parseFloat(r.discountTotal || "0"),
        taxTotal: acc.taxTotal + parseFloat(r.taxTotal || "0"),
        netAmount: acc.netAmount + parseFloat(r.netAmount || "0"),
      }),
      { grossAmount: 0, discountTotal: 0, taxTotal: 0, netAmount: 0 }
    );

    return { success: true, data: { rows, totals, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Purchase Invoice Detail Report" };
  }
}

// ============= 6. Vendor Balance Report =============

export async function getVendorBalanceReport(
  vendorId?: string,
  dateAsOf?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const asOf = dateAsOf ? new Date(dateAsOf) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const conditions = [eq(vendors.orgId, orgId), eq(vendors.isActive, true)];
    if (vendorId) conditions.push(eq(vendors.id, vendorId));

    const vendorRows = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        phone: vendors.phone,
        email: vendors.email,
        openingBalance: vendors.openingBalance,
        balance: vendors.balance,
      })
      .from(vendors)
      .where(and(...conditions))
      .orderBy(vendors.name);

    const vendorIds = vendorRows.map(v => v.id);
    const [piAggs, vpAggs] = await Promise.all([
      vendorIds.length
        ? db
            .select({
              vendorId: purchaseInvoices.vendorId,
              total: sql<number>`COALESCE(SUM(${purchaseInvoices.netAmount}),0)`,
            })
            .from(purchaseInvoices)
            .where(
              and(
                eq(purchaseInvoices.orgId, orgId),
                inArray(purchaseInvoices.vendorId, vendorIds),
                lte(purchaseInvoices.date, asOf)
              )
            )
            .groupBy(purchaseInvoices.vendorId)
        : [],
      vendorIds.length
        ? db
            .select({
              vendorId: vendorPayments.vendorId,
              total: sql<number>`COALESCE(SUM(${vendorPayments.amount}),0)`,
            })
            .from(vendorPayments)
            .where(
              and(
                eq(vendorPayments.orgId, orgId),
                inArray(vendorPayments.vendorId, vendorIds),
                lte(vendorPayments.paymentDate, asOf)
              )
            )
            .groupBy(vendorPayments.vendorId)
        : [],
    ]);

    const piMap = new Map(piAggs.map(a => [a.vendorId, a]));
    const vpMap = new Map(vpAggs.map(a => [a.vendorId, a]));

    const result = vendorRows.map((v) => {
      const totalBilled = parseFloat(String(piMap.get(v.id)?.total ?? "0"));
      const totalPaid = parseFloat(String(vpMap.get(v.id)?.total ?? "0"));
      const openingBal = parseFloat(v.openingBalance || "0");
      const balance = openingBal + totalBilled - totalPaid;

      return { ...v, totalBilled, totalPaid, openingBalance: openingBal, balance };
    });

    const grandTotal = result.reduce(
      (acc, r) => ({
        totalBilled: acc.totalBilled + r.totalBilled,
        totalPaid: acc.totalPaid + r.totalPaid,
        balance: acc.balance + r.balance,
      }),
      { totalBilled: 0, totalPaid: 0, balance: 0 }
    );

    return { success: true, data: { rows: result, grandTotal, asOf: dateAsOf } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Vendor Balance Report" };
  }
}

// ============= 7. General Ledger Report (Account-wise) =============

export async function getGeneralLedgerReport(
  accountId: string,
  dateFrom: string,
  dateTo: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Get account info
    const [account] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.orgId, orgId)))
      .limit(1);

    if (!account) return { success: false, error: "Account not found" };

    // Get opening balance (all entries before dateFrom)
    const openingRows = await db
      .select({
        debit: sql<number>`COALESCE(SUM(${journalEntryLines.debitAmount}::numeric),0)`,
        credit: sql<number>`COALESCE(SUM(${journalEntryLines.creditAmount}::numeric),0)`,
      })
      .from(journalEntryLines)
      .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntryLines.orgId, orgId),
          eq(journalEntryLines.accountId, accountId),
          lte(journalEntries.entryDate, new Date(from.getTime() - 1))
        )
      );

    const openingDebit = parseFloat(String(openingRows[0]?.debit || 0));
    const openingCredit = parseFloat(String(openingRows[0]?.credit || 0));
    const openingBalance = openingDebit - openingCredit;

    // Get period transactions
    const lines = await db
      .select({
        id: journalEntryLines.id,
        entryDate: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
        description: journalEntryLines.description,
        referenceType: journalEntries.referenceType,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
      })
      .from(journalEntryLines)
      .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntryLines.orgId, orgId),
          eq(journalEntryLines.accountId, accountId),
          gte(journalEntries.entryDate, from),
          lte(journalEntries.entryDate, to)
        )
      )
      .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

    // Build running balance
    let runningBalance = openingBalance;
    const enriched = lines.map((l) => {
      const dr = parseFloat(l.debitAmount || "0");
      const cr = parseFloat(l.creditAmount || "0");
      runningBalance += dr - cr;
      return { ...l, runningBalance };
    });

    const totalDebit = enriched.reduce((s, l) => s + parseFloat(l.debitAmount || "0"), 0);
    const totalCredit = enriched.reduce((s, l) => s + parseFloat(l.creditAmount || "0"), 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      success: true,
      data: {
        account,
        lines: enriched,
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance,
        dateFrom,
        dateTo,
      },
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate General Ledger Report" };
  }
}

// ============= 8. Account Statement Report =============
// (Summary of all accounts with period activity — management use)

export async function getAccountStatementReport(
  dateFrom: string,
  dateTo: string,
  accountType?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const accConditions = [eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.isActive, true)];
    if (accountType) accConditions.push(eq(chartOfAccounts.type, accountType));

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...accConditions))
      .orderBy(chartOfAccounts.code);

    const accountIds = accounts.map(a => a.id);

    const [openingRows, periodRows] = await Promise.all([
      db
        .select({
          accountId: journalEntryLines.accountId,
          debit: sql<number>`COALESCE(SUM(${journalEntryLines.debitAmount}::numeric),0)`,
          credit: sql<number>`COALESCE(SUM(${journalEntryLines.creditAmount}::numeric),0)`,
        })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntryLines.orgId, orgId),
            inArray(journalEntryLines.accountId, accountIds),
            lte(journalEntries.entryDate, new Date(from.getTime() - 1))
          )
        )
        .groupBy(journalEntryLines.accountId),
      db
        .select({
          accountId: journalEntryLines.accountId,
          debit: sql<number>`COALESCE(SUM(${journalEntryLines.debitAmount}::numeric),0)`,
          credit: sql<number>`COALESCE(SUM(${journalEntryLines.creditAmount}::numeric),0)`,
        })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntryLines.orgId, orgId),
            inArray(journalEntryLines.accountId, accountIds),
            gte(journalEntries.entryDate, from),
            lte(journalEntries.entryDate, to)
          )
        )
        .groupBy(journalEntryLines.accountId),
    ]);

    const openingMap = new Map(openingRows.map(r => [r.accountId, r]));
    const periodMap = new Map(periodRows.map(r => [r.accountId, r]));

    const result = accounts.map((acc) => {
      const opening = openingMap.get(acc.id) ?? { debit: 0, credit: 0 };
      const period = periodMap.get(acc.id) ?? { debit: 0, credit: 0 };

      const openingBal =
        parseFloat(String(opening.debit)) - parseFloat(String(opening.credit));
      const periodDebit = parseFloat(String(period.debit));
      const periodCredit = parseFloat(String(period.credit));
      const closingBal = openingBal + periodDebit - periodCredit;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        openingBalance: openingBal,
        periodDebit,
        periodCredit,
        closingBalance: closingBal,
      };
    });

    // Filter out zero-activity accounts
    const active = result.filter(
      (r) => r.periodDebit !== 0 || r.periodCredit !== 0 || r.openingBalance !== 0
    );

    return { success: true, data: { rows: active, dateFrom, dateTo, accountType } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Account Statement Report" };
  }
}

// ============= Helper: Get Vendors list (for filter dropdowns) =============

export async function getVendors() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No org" };
    const data = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(and(eq(vendors.orgId, orgId), eq(vendors.isActive, true)))
      .orderBy(vendors.name);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed" };
  }
}

// ============= Helper: Get Accounts list (for GL filter dropdown) =============

export async function getChartOfAccountsList(type?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No org" };
    const conds = [eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.isActive, true)];
    if (type) conds.push(eq(chartOfAccounts.type, type));
    const data = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code, type: chartOfAccounts.type })
      .from(chartOfAccounts)
      .where(and(...conds))
      .orderBy(chartOfAccounts.code);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed" };
  }
}



// ============= 9. Product Sales Report =============

export async function getProductSalesReport(
  dateFrom: string,
  dateTo: string,
  productId?: string,
  customerId?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const invConditions = [
      eq(invoices.orgId, orgId),
      gte(invoices.issueDate, from),
      lte(invoices.issueDate, to),
      inArray(invoices.status, ["approved", "paid", "partial"]),
    ];
    if (customerId) invConditions.push(eq(invoices.customerId, customerId));

    // Get all invoice items in period with product + customer info
    const rows = await db
      .select({
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        category: productCategories.name,
        invoiceDate: invoices.issueDate,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.name,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        discountPct: invoiceItems.discountPercentage,
        lineTotal: invoiceItems.lineTotal,
        costPrice: products.costPrice,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...invConditions, productId ? eq(invoiceItems.productId, productId) : sql`1=1`))
      .orderBy(products.name, desc(invoices.issueDate));

    // Aggregate by product
    const productMap: Record<string, any> = {};
    for (const r of rows) {
      const key = r.productId || r.productName || "Unknown";
      if (!productMap[key]) {
        productMap[key] = {
          productId: r.productId,
          productName: r.productName || r.invoiceNumber,
          sku: r.sku,
          category: r.category || "—",
          totalQty: 0,
          totalRevenue: 0,
          totalCost: 0,
          grossProfit: 0,
          invoiceCount: 0,
          transactions: [],
        };
      }
      const qty = parseFloat(r.quantity);
      const lineTotal = parseFloat(r.lineTotal || "0");
      const cost = qty * parseFloat(r.costPrice || "0");
      productMap[key].totalQty += qty;
      productMap[key].totalRevenue += lineTotal;
      productMap[key].totalCost += cost;
      productMap[key].grossProfit += lineTotal - cost;
      productMap[key].invoiceCount += 1;
      productMap[key].transactions.push({
        date: r.invoiceDate,
        invoiceNumber: r.invoiceNumber,
        customer: r.customerName,
        qty,
        unitPrice: parseFloat(r.unitPrice || "0"),
        lineTotal,
      });
    }

    const summary = Object.values(productMap).sort(
      (a: any, b: any) => b.totalRevenue - a.totalRevenue
    );

    const totals = summary.reduce(
      (acc: any, p: any) => ({
        totalQty: acc.totalQty + p.totalQty,
        totalRevenue: acc.totalRevenue + p.totalRevenue,
        totalCost: acc.totalCost + p.totalCost,
        grossProfit: acc.grossProfit + p.grossProfit,
      }),
      { totalQty: 0, totalRevenue: 0, totalCost: 0, grossProfit: 0 }
    );

    return { success: true, data: { summary, totals, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Product Sales Report" };
  }
}

// ============= 10. Discount Summary Report =============

export async function getDiscountSummaryReport(
  dateFrom: string,
  dateTo: string,
  customerId?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(invoices.orgId, orgId),
      gte(invoices.issueDate, from),
      lte(invoices.issueDate, to),
      inArray(invoices.status, ["approved", "paid", "partial"]),
    ];
    if (customerId) conditions.push(eq(invoices.customerId, customerId));

    const rows = await db
      .select({
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        customerName: customers.name,
        grossAmount: invoices.grossAmount,
        discountAmount: invoices.discountAmount,
        netAmount: invoices.netAmount,
        // Line item level discount
        productName: products.name,
        itemQty: invoiceItems.quantity,
        itemUnitPrice: invoiceItems.unitPrice,
        itemDiscountPct: invoiceItems.discountPercentage,
        itemLineTotal: invoiceItems.lineTotal,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.issueDate));

    // Group by invoice
    const invoiceMap: Record<string, any> = {};
    for (const r of rows) {
      if (!invoiceMap[r.invoiceId]) {
        invoiceMap[r.invoiceId] = {
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          issueDate: r.issueDate,
          customerName: r.customerName,
          grossAmount: parseFloat(r.grossAmount || "0"),
          discountAmount: parseFloat(r.discountAmount || "0"),
          netAmount: parseFloat(r.netAmount || "0"),
          discountPct:
            parseFloat(r.grossAmount || "0") > 0
              ? (parseFloat(r.discountAmount || "0") /
                  parseFloat(r.grossAmount || "0")) *
                100
              : 0,
          items: [],
        };
      }
      if (r.productName && parseFloat(r.itemDiscountPct || "0") > 0) {
        invoiceMap[r.invoiceId].items.push({
          productName: r.productName,
          qty: parseFloat(r.itemQty || "0"),
          unitPrice: parseFloat(r.itemUnitPrice || "0"),
          discountPct: parseFloat(r.itemDiscountPct || "0"),
          discountAmt:
            (parseFloat(r.itemUnitPrice || "0") *
              parseFloat(r.itemQty || "0") *
              parseFloat(r.itemDiscountPct || "0")) /
            100,
          lineTotal: parseFloat(r.itemLineTotal || "0"),
        });
      }
    }

    const invoiceRows = Object.values(invoiceMap).filter(
      (i: any) => i.discountAmount > 0
    );

    const totals = invoiceRows.reduce(
      (acc: any, r: any) => ({
        grossAmount: acc.grossAmount + r.grossAmount,
        discountAmount: acc.discountAmount + r.discountAmount,
        netAmount: acc.netAmount + r.netAmount,
      }),
      { grossAmount: 0, discountAmount: 0, netAmount: 0 }
    );

    return { success: true, data: { rows: invoiceRows, totals, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Discount Summary Report" };
  }
}

// ============= 11. Due Invoice Report =============

export async function getDueInvoiceReport(
  asOfDate?: string,
  customerId?: string,
  overdueDaysFilter?: number // 0=all, 1-30, 31-60, 61-90, 90+=91
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const conditions = [
      eq(invoices.orgId, orgId),
      inArray(invoices.status, ["approved", "partial"]),
      lte(invoices.issueDate, asOf),
    ];
    if (customerId) conditions.push(eq(invoices.customerId, customerId));

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        netAmount: invoices.netAmount,
        receivedAmount: invoices.receivedAmount,
        balanceAmount: invoices.balanceAmount,
        status: invoices.status,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(invoices.dueDate);

    // Enrich with overdue days
    const today = new Date();
    const enriched = rows
      .filter((r) => parseFloat(r.balanceAmount || "0") > 0)
      .map((r) => {
        const due = r.dueDate ? new Date(r.dueDate) : new Date(r.issueDate);
        const diffMs = today.getTime() - due.getTime();
        const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        return { ...r, overdueDays, dueDate: due };
      })
      .filter((r) => {
        if (!overdueDaysFilter || overdueDaysFilter === 0) return true;
        if (overdueDaysFilter === 1) return r.overdueDays >= 1 && r.overdueDays <= 30;
        if (overdueDaysFilter === 31) return r.overdueDays >= 31 && r.overdueDays <= 60;
        if (overdueDaysFilter === 61) return r.overdueDays >= 61 && r.overdueDays <= 90;
        if (overdueDaysFilter === 91) return r.overdueDays > 90;
        return true;
      });

    // Aging buckets
    const aging = {
      current: enriched.filter((r) => r.overdueDays === 0).reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
      days1to30: enriched.filter((r) => r.overdueDays >= 1 && r.overdueDays <= 30).reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
      days31to60: enriched.filter((r) => r.overdueDays >= 31 && r.overdueDays <= 60).reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
      days61to90: enriched.filter((r) => r.overdueDays >= 61 && r.overdueDays <= 90).reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
      over90: enriched.filter((r) => r.overdueDays > 90).reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
    };

    const totals = {
      totalBalance: enriched.reduce((s, r) => s + parseFloat(r.balanceAmount || "0"), 0),
      totalNet: enriched.reduce((s, r) => s + parseFloat(r.netAmount || "0"), 0),
      totalReceived: enriched.reduce((s, r) => s + parseFloat(r.receivedAmount || "0"), 0),
    };

    return { success: true, data: { rows: enriched, totals, aging, asOf: asOfDate } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Due Invoice Report" };
  }
}

// ============= 12. Sale Order Report =============

export async function getSaleOrderReport(
  dateFrom: string,
  dateTo: string,
  customerId?: string,
  status?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(saleOrders.orgId, orgId),
      gte(saleOrders.orderDate, from),
      lte(saleOrders.orderDate, to),
    ];
    if (customerId) conditions.push(eq(saleOrders.customerId, customerId));
    if (status) conditions.push(eq(saleOrders.status, status as any));

    const rows = await db
      .select({
        id: saleOrders.id,
        orderNumber: saleOrders.orderNumber,
        orderDate: saleOrders.orderDate,
        deliveryDate: saleOrders.deliveryDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        subject: saleOrders.subject,
        orderBooker: saleOrders.orderBooker,
        grossAmount: saleOrders.grossAmount,
        discountAmount: saleOrders.discountAmount,
        taxAmount: saleOrders.taxAmount,
        netAmount: saleOrders.netAmount,
        status: saleOrders.status,
        reference: saleOrders.reference,
      })
      .from(saleOrders)
      .leftJoin(customers, eq(saleOrders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(saleOrders.orderDate));

    const totals = rows.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + parseFloat(r.grossAmount || "0"),
        discountAmount: acc.discountAmount + parseFloat(r.discountAmount || "0"),
        taxAmount: acc.taxAmount + parseFloat(r.taxAmount || "0"),
        netAmount: acc.netAmount + parseFloat(r.netAmount || "0"),
      }),
      { grossAmount: 0, discountAmount: 0, taxAmount: 0, netAmount: 0 }
    );

    // Status counts
    const statusCounts: Record<string, number> = {};
    rows.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    return { success: true, data: { rows, totals, statusCounts, dateFrom, dateTo } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate Sale Order Report" };
  }
}

// ============= Helper: Get Products list =============

export async function getProductsList() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No org" };
    const data = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed" };
  }
}

// ============= WHT Certificate & Statement =============

export async function getWHTVendorStatement(vendorId: string, dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ name: organizations.name, ntn: organizations.ntn, strn: organizations.strn, address: organizations.address })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId)))
      .limit(1);
    if (!vendor) return { success: false, error: "Vendor not found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const payments = await db
      .select()
      .from(vendorPayments)
      .where(
        and(
          eq(vendorPayments.orgId, orgId),
          eq(vendorPayments.vendorId, vendorId),
          gte(vendorPayments.paymentDate, fromDate),
          lte(vendorPayments.paymentDate, toDate),
          sql`COALESCE(${vendorPayments.whtAmount}, '0')::numeric > 0`,
        ),
      )
      .orderBy(asc(vendorPayments.paymentDate));

    const transactions = payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      amount: parseFloat(p.amount || "0"),
      whtAmount: parseFloat(p.whtAmount || "0"),
      whtRate: parseFloat(p.whtRate || "0"),
      reference: p.reference || "",
    }));

    const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
    const totalWHT = transactions.reduce((s, t) => s + t.whtAmount, 0);

    return {
      success: true,
      data: {
        org: org ? { name: org.name, ntn: org.ntn, strn: org.strn, address: org.address } : null,
        vendor: { id: vendor.id, name: vendor.name, ntn: vendor.ntn, strn: vendor.strn, address: vendor.address },
        dateFrom, dateTo,
        totalAmount, totalWHT,
        transactions,
      },
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate WHT statement" };
  }
}

export async function getWHTAnnualReturn(year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ name: organizations.name, ntn: organizations.ntn })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const fromDate = new Date(`${year}-01-01`);
    const toDate = new Date(`${year}-12-31`);
    toDate.setHours(23, 59, 59, 999);

    const payments = await db
      .select({
        vendorId: vendorPayments.vendorId,
        vendorName: vendors.name,
        vendorNtn: vendors.ntn,
        vendorStrn: vendors.strn,
        paymentId: vendorPayments.id,
        paymentNumber: vendorPayments.paymentNumber,
        paymentDate: vendorPayments.paymentDate,
        amount: vendorPayments.amount,
        whtAmount: vendorPayments.whtAmount,
        whtRate: vendorPayments.whtRate,
      })
      .from(vendorPayments)
      .leftJoin(vendors, eq(vendorPayments.vendorId, vendors.id))
      .where(
        and(
          eq(vendorPayments.orgId, orgId),
          gte(vendorPayments.paymentDate, fromDate),
          lte(vendorPayments.paymentDate, toDate),
          sql`COALESCE(${vendorPayments.whtAmount}, '0')::numeric > 0`,
        ),
      )
      .orderBy(asc(vendors.name), asc(vendorPayments.paymentDate));

    const vendorMap = new Map<string, any>();
    for (const p of payments) {
      const vid = p.vendorId;
      if (!vendorMap.has(vid)) {
        vendorMap.set(vid, {
          vendorName: p.vendorName,
          vendorNtn: p.vendorNtn,
          vendorStrn: p.vendorStrn,
          q1: { amount: 0, wht: 0 },
          q2: { amount: 0, wht: 0 },
          q3: { amount: 0, wht: 0 },
          q4: { amount: 0, wht: 0 },
          totalAmount: 0,
          totalWHT: 0,
        });
      }
      const v = vendorMap.get(vid)!;
      const month = new Date(p.paymentDate).getMonth();
      const quarter = month < 3 ? "q1" : month < 6 ? "q2" : month < 9 ? "q3" : "q4";
      const amt = parseFloat(p.amount || "0");
      const wht = parseFloat(p.whtAmount || "0");
      v[quarter].amount += amt;
      v[quarter].wht += wht;
      v.totalAmount += amt;
      v.totalWHT += wht;
    }

    const vendorsList = Array.from(vendorMap.entries()).map(([id, data]) => ({ vendorId: id, ...data }));
    const grandTotal = vendorsList.reduce((s, v) => s + v.totalWHT, 0);

    return {
      success: true,
      data: {
        org: org || null,
        year,
        vendors: vendorsList,
        totalVendors: vendorsList.length,
        grandTotalWHT: grandTotal,
      },
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate annual WHT return" };
  }
}

// ============= Cash Flow Statement =============

const operatingSubTypes = new Set([
  'accounts_receivable', 'inventory', 'tax_receivable', 'tax_receivable_srb',
  'tax_receivable_pra', 'tax_receivable_kpra', 'tax_receivable_bra',
  'accounts_payable', 'tax_payable', 'tax_payable_srb', 'tax_payable_pra',
  'tax_payable_kpra', 'tax_payable_bra', 'wht_payable', 'income_tax_payable',
  'salary_expense', 'salaries_payable', 'eobi_payable', 'prepaid_expenses',
  'accrued_liabilities', 'accrued_expenses', 'deferred_revenue',
  'other_current_asset', 'other_current_liability',
]);

const investingSubTypes = new Set([
  'fixed_assets', 'accumulated_depreciation', 'intangible_assets',
  'investments', 'capital_work_in_progress', 'other_non_current_asset',
]);

const financingSubTypes = new Set([
  'capital', 'retained_earnings', 'long_term_loan', 'short_term_loan',
  'dividends_payable', 'drawings', 'other_non_current_liability',
  'partner_capital', 'partner_drawings',
]);

function classifyCashFlow(accountType: string, subType: string | null): 'operating' | 'investing' | 'financing' {
  if (!subType) {
    if (accountType === 'income' || accountType === 'expense') return 'operating';
    return 'operating';
  }
  if (operatingSubTypes.has(subType)) return 'operating';
  if (investingSubTypes.has(subType)) return 'investing';
  if (financingSubTypes.has(subType)) return 'financing';
  return 'operating';
}

export async function getCashFlowStatement(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Get net income for the period
    const netIncome = await getNetIncomeForPeriod(orgId, fromDate, toDate);

    // Get balance sheet changes
    const prevBalances = await getAccountBalancesAsOf(orgId, new Date(fromDate.getTime() - 1));
    const currBalances = await getAccountBalancesAsOf(orgId, toDate);

    // Get all accounts
    const accounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, type: chartOfAccounts.type, subType: chartOfAccounts.subType })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.isActive, true)));

    const accountMap = new Map(accounts.map(a => [a.id, a]));

    // Calculate changes and classify
    const changes: { accountName: string; amount: number; section: 'operating' | 'investing' | 'financing' }[] = [];
    let operatingTotal = 0;
    let investingTotal = 0;
    let financingTotal = 0;

    for (const account of accounts) {
      const prev = prevBalances.get(account.id) || 0;
      const curr = currBalances.get(account.id) || 0;
      const change = curr - prev;
      if (Math.abs(change) < 0.01) continue;

      const section = classifyCashFlow(account.type, account.subType);
      let signedChange = change;

      // For asset accounts, an increase is a cash OUTFLOW (negative)
      if (account.type === 'asset') signedChange = -change;

      // For liability/equity, an increase is a cash INFLOW (positive)
      // already handled by the sign convention

      changes.push({ accountName: account.name, amount: signedChange, section });
      if (section === 'operating') operatingTotal += signedChange;
      else if (section === 'investing') investingTotal += signedChange;
      else if (section === 'financing') financingTotal += signedChange;
    }

    // Add net income as operating activity starting point
    const netCashOperating = operatingTotal + (netIncome || 0);

    // Get cash balance change
    const cashAccountIds = accounts
      .filter(a => a.subType === 'cash' || a.subType === 'bank')
      .map(a => a.id);
    let cashChange = 0;
    for (const id of cashAccountIds) {
      const prev = prevBalances.get(id) || 0;
      const curr = currBalances.get(id) || 0;
      cashChange += curr - prev;
    }

    return {
      success: true,
      data: {
        dateFrom,
        dateTo,
        netIncome: netIncome || 0,
        operating: {
          netIncome: netIncome || 0,
          adjustments: changes.filter(c => c.section === 'operating'),
          total: netCashOperating,
        },
        investing: {
          items: changes.filter(c => c.section === 'investing'),
          total: investingTotal,
        },
        financing: {
          items: changes.filter(c => c.section === 'financing'),
          total: financingTotal,
        },
        netCashChange: netCashOperating + investingTotal + financingTotal,
        cashChange,
      },
    };
  } catch (error) {
    console.error("Error in reports.ts:", error);
    return { success: false, error: "Failed to generate Cash Flow Statement" };
  }
}

async function getNetIncomeForPeriod(orgId: string, fromDate: Date, toDate: Date): Promise<number | null> {
  const incomeAccounts = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'income')));

  const expenseAccounts = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'expense')));

  const allIds = [...incomeAccounts.map(a => a.id), ...expenseAccounts.map(a => a.id)];
  if (allIds.length === 0) return null;

  const rows = await db
    .select({
      accountId: journalEntryLines.accountId,
      totalDebit: sql<string>`coalesce(SUM(${journalEntryLines.debitAmount}), 0)`,
      totalCredit: sql<string>`coalesce(SUM(${journalEntryLines.creditAmount}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(
      inArray(journalEntryLines.accountId, allIds),
      eq(journalEntryLines.orgId, orgId),
      gte(journalEntries.entryDate, fromDate),
      lte(journalEntries.entryDate, toDate),
      sql`${journalEntries.status} != 'draft'`,
    ))
    .groupBy(journalEntryLines.accountId);

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeIdSet = new Set(incomeAccounts.map(a => a.id));

  for (const row of rows) {
    const credit = parseFloat(row.totalCredit);
    const debit = parseFloat(row.totalDebit);
    if (incomeIdSet.has(row.accountId)) {
      totalIncome += credit - debit;
    } else {
      totalExpense += debit - credit;
    }
  }

  return totalIncome - totalExpense;
}

async function getAccountBalancesAsOf(orgId: string, asOfDate: Date): Promise<Map<string, number>> {
  const rows = await db
    .select({
      accountId: journalEntryLines.accountId,
      totalDebit: sql<string>`coalesce(SUM(${journalEntryLines.debitAmount}), 0)`,
      totalCredit: sql<string>`coalesce(SUM(${journalEntryLines.creditAmount}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      lte(journalEntries.entryDate, asOfDate),
      sql`${journalEntries.status} != 'draft'`,
    ))
    .groupBy(journalEntryLines.accountId);

  const map = new Map<string, number>();
  for (const row of rows) {
    const debit = parseFloat(row.totalDebit);
    const credit = parseFloat(row.totalCredit);
    map.set(row.accountId, debit - credit);
  }
  return map;
}