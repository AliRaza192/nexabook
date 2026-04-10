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
  organizations,
  profiles,
  productCategories,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const userProfile = await db
      .select({ orgId: profiles.orgId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length > 0 && userProfile[0].orgId) {
      return userProfile[0].orgId;
    }

    const user = await currentUser();
    if (!user) return null;

    const fullName = user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
    const slug = fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const [org] = await db
      .insert(organizations)
      .values({ name: fullName + "'s Organization", slug })
      .returning({ id: organizations.id });

    const [newProfile] = await db
      .insert(profiles)
      .values({ userId, orgId: org.id, role: 'admin', fullName, email: user.emailAddresses[0]?.emailAddress || '' })
      .returning({ orgId: profiles.orgId });

    return newProfile.orgId;
  } catch (error) {
    console.error("getCurrentOrgId error:", error);
    return null;
  }
}

// ============= Profit & Loss Report =============

export async function getProfitAndLossReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Get all income accounts
    const incomeAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'income')));

    // Get all expense accounts
    const expenseAccounts = await db
      .select({ id: chartOfAccounts.id, name: chartOfAccounts.name, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, 'expense')));

    // Calculate total sales (from invoices)
    const salesResult = await db
      .select({
        totalSales: sql<string>`SUM(${invoices.netAmount})`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const totalSales = salesResult[0]?.totalSales ? parseFloat(salesResult[0].totalSales) : 0;

    // Calculate COGS (from purchase invoices - inventory purchases)
    const cogsResult = await db
      .select({
        totalCOGS: sql<string>`SUM(${purchaseInvoices.netAmount})`,
      })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        gte(purchaseInvoices.date, fromDate),
        lte(purchaseInvoices.date, toDate),
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const totalCOGS = cogsResult[0]?.totalCOGS ? parseFloat(cogsResult[0].totalCOGS) : 0;

    // Calculate operating expenses (from expenses table and journal entries)
    const expensesResult = await db
      .select({
        totalExpenses: sql<string>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .where(and(
        eq(expenses.orgId, orgId),
        gte(expenses.date, fromDate),
        lte(expenses.date, toDate)
      ));

    const totalExpenses = expensesResult[0]?.totalExpenses ? parseFloat(expensesResult[0].totalExpenses) : 0;

    // Get expense breakdown by account
    const expenseBreakdown = await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        gte(journalEntries.entryDate, fromDate),
        lte(journalEntries.entryDate, toDate),
        inArray(journalEntryLines.accountId, expenseAccounts.map(a => a.id))
      ))
      .groupBy(journalEntryLines.accountId);

    // Get income breakdown by account
    const incomeBreakdown = await db
      .select({
        accountId: journalEntryLines.accountId,
        totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        gte(journalEntries.entryDate, fromDate),
        lte(journalEntries.entryDate, toDate),
        inArray(journalEntryLines.accountId, incomeAccounts.map(a => a.id))
      ))
      .groupBy(journalEntryLines.accountId);

    const grossProfit = totalSales - totalCOGS;
    const totalOperatingExpenses = totalExpenses;
    const netProfit = grossProfit - totalOperatingExpenses;

    return {
      success: true,
      data: {
        totalSales,
        totalCOGS,
        grossProfit,
        totalOperatingExpenses,
        netProfit,
        expenseBreakdown,
        incomeBreakdown,
        incomeAccounts,
        expenseAccounts,
      }
    };
  } catch (error) {
    console.error("getProfitAndLossReport error:", error);
    return { success: false, error: "Failed to generate Profit & Loss report" };
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

    // Calculate account balances from journal entries
    const getAccountBalance = async (accountId: string) => {
      const [result] = await db
        .select({
          totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
          totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(
          eq(journalEntryLines.accountId, accountId),
          eq(journalEntryLines.orgId, orgId),
          lte(journalEntries.entryDate, reportDate)
        ));

      const debit = result?.totalDebit ? parseFloat(result.totalDebit) : 0;
      const credit = result?.totalCredit ? parseFloat(result.totalCredit) : 0;
      return debit - credit; // For asset accounts
    };

    // Calculate total assets
    let totalAssets = 0;
    const assetBalances = [];
    for (const account of assetAccounts) {
      const balance = await getAccountBalance(account.id);
      totalAssets += balance;
      assetBalances.push({ ...account, balance });
    }

    // Calculate total liabilities
    let totalLiabilities = 0;
    const liabilityBalances = [];
    for (const account of liabilityAccounts) {
      const balance = await getAccountBalance(account.id);
      totalLiabilities += Math.abs(balance); // Liabilities are credit balances
      liabilityBalances.push({ ...account, balance: Math.abs(balance) });
    }

    // Calculate total equity
    let totalEquity = 0;
    const equityBalances = [];
    for (const account of equityAccounts) {
      const balance = await getAccountBalance(account.id);
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
    console.error("getBalanceSheetReport error:", error);
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
    console.error("getCustomerLedgerReport error:", error);
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
    console.error("getAuditTrail error:", error);
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

    // Calculate balances for each account
    const accountBalances = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const [result] = await db
        .select({
          totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
          totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(
          eq(journalEntryLines.accountId, account.id),
          eq(journalEntryLines.orgId, orgId),
          lte(journalEntries.entryDate, reportDate)
        ));

      const debit = result?.totalDebit ? parseFloat(result.totalDebit) : 0;
      const credit = result?.totalCredit ? parseFloat(result.totalCredit) : 0;
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
    console.error("getTrialBalanceReport error:", error);
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
      const stock = item.currentStock || 0;
      const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
      const value = stock * cost;
      totalValue += value;
      return { ...item, stockValue: value };
    });

    return { success: true, data: { items: itemsWithValue, totalValue } };
  } catch (error) {
    console.error("getStockOnHandReport error:", error);
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

    const lowStockItems = products_list.filter(p => 
      p.currentStock !== null && 
      p.minStockLevel !== null && 
      p.currentStock <= p.minStockLevel
    );

    return { success: true, data: lowStockItems };
  } catch (error) {
    console.error("getLowStockReport error:", error);
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
    console.error("getSalesByProductReport error:", error);
    return { success: false, error: "Failed to generate Sales by Product report" };
  }
}

// ============= Aged Receivables Report =============

export async function getAgedReceivablesReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const now = new Date();
    const customers_with_balance = await db
      .select()
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isActive, true)));

    const agedReceivables = customers_with_balance
      .filter(c => c.balance && parseFloat(c.balance) > 0)
      .map(customer => {
        const balance = customer.balance ? parseFloat(customer.balance) : 0;
        // Simplified aging - in production would calculate from invoices
        return {
          id: customer.id,
          name: customer.name,
          balance,
          current: balance * 0.4,
          days30: balance * 0.3,
          days60: balance * 0.2,
          days90Plus: balance * 0.1,
        };
      });

    return { success: true, data: agedReceivables };
  } catch (error) {
    console.error("getAgedReceivablesReport error:", error);
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
    console.error("getPayrollSummaryReport error:", error);
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

    return {
      success: true,
      data: {
        taxCollected: taxCollected[0]?.totalTax ? parseFloat(taxCollected[0].totalTax) : 0,
        taxPaid: taxPaid[0]?.totalTax ? parseFloat(taxPaid[0].totalTax) : 0,
      }
    };
  } catch (error) {
    console.error("getSalesTaxReport error:", error);
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
    console.error("getCustomers error:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}
