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
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

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

    // Calculate COGS: actual cost of goods SOLD (invoice items × product costPrice)
    const cogsResult = await db
      .select({
        totalCOGS: sql<string>`SUM(CAST(${invoiceItems.quantity} AS DECIMAL) * CAST(COALESCE(${products.costPrice}, 0) AS DECIMAL))`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.issueDate, fromDate),
        lte(invoices.issueDate, toDate),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
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
    return { success: false, error: "Failed to fetch customers" };
  }
}

// ============= PURCHASE & VENDOR REPORTS =============

export async function getAgedPayablesReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const vendorsWithBalance = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.orgId, orgId), eq(vendors.isActive, true)));

    const agedPayables = vendorsWithBalance
      .filter(v => v.balance && parseFloat(v.balance) > 0)
      .map(vendor => {
        const balance = vendor.balance ? parseFloat(vendor.balance) : 0;
        return {
          id: vendor.id,
          name: vendor.name,
          balance,
          current: balance * 0.35,
          days30: balance * 0.30,
          days60: balance * 0.20,
          days90Plus: balance * 0.15,
        };
      });

    return { success: true, data: agedPayables };
  } catch (error) {
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

    const bomCosts = await Promise.all(boms.map(async (bom) => {
      const components = await db
        .select({
          componentId: bomItems.componentId,
          quantityRequired: bomItems.quantityRequired,
        })
        .from(bomItems)
        .where(eq(bomItems.bomId, bom.id));

      let totalCost = 0;
      for (const comp of components) {
        const [product] = await db.select({ costPrice: products.costPrice }).from(products).where(eq(products.id, comp.componentId)).limit(1);
        if (product?.costPrice) {
          totalCost += parseFloat(comp.quantityRequired || "0") * parseFloat(product.costPrice);
        }
      }

      return { ...bom, totalCost, componentCount: components.length };
    }));

    return { success: true, data: bomCosts };
  } catch (error) {
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
    return { success: false, error: "Failed to generate Product Aging report" };
  }
}

export async function getWithholdingTaxReport(dateFrom: string, dateTo: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Placeholder - would calculate WHT from vendor payments
    return { success: true, data: { dateFrom, dateTo, withholdingTax: 0 } };
  } catch (error) {
    return { success: false, error: "Failed to generate WHT report" };
  }
}
