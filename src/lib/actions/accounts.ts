"use server";

import { db } from "@/db";
import { chartOfAccounts, organizations, profiles, journalEntries, journalEntryLines, auditLogs, invoices, purchaseInvoices } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

export interface JournalEntryLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export interface JournalEntryData {
  date: string;
  reference: string;
  description: string;
  lines: JournalEntryLine[];
}

// Get all accounts for current user's organization
export async function getAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.orgId, orgId))
      .orderBy(chartOfAccounts.code);

    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, error: "Failed to fetch accounts" };
  }
}

// Seed initial Chart of Accounts for current user's organization
export async function seedInitialCOA() {
  const orgId = await getCurrentOrgId();
  
  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    // Check if accounts already exist for this organization
    const existingAccounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.orgId, orgId))
      .limit(1);

    if (existingAccounts.length > 0) {
      return { 
        success: false, 
        error: "Chart of Accounts already exists for this organization" 
      };
    }

    const defaultAccounts = [
      // Assets (1000-1999)
      { code: "1000", name: "Cash", type: "asset", description: "Cash on hand" },
      { code: "1010", name: "Bank - Main Account", type: "asset", description: "Main bank account" },
      { code: "1020", name: "Bank - Savings Account", type: "asset", description: "Savings bank account" },
      { code: "1030", name: "Petty Cash", type: "asset", description: "Small cash fund for minor expenses" },
      { code: "1100", name: "Accounts Receivable", type: "asset", description: "Money owed by customers" },
      { code: "1110", name: "Allowance for Doubtful Accounts", type: "asset", description: "Estimated uncollectible receivables" },
      { code: "1200", name: "Inventory", type: "asset", description: "Goods available for sale" },
      { code: "1210", name: "Raw Materials", type: "asset", description: "Materials for production" },
      { code: "1220", name: "Work in Progress Inventory", type: "asset", description: "Partially completed goods" },
      { code: "1230", name: "Finished Goods Inventory", type: "asset", description: "Completed goods ready for sale" },
      { code: "1300", name: "Office Supplies", type: "asset", description: "Office supplies and materials" },
      { code: "1400", name: "Prepaid Expenses", type: "asset", description: "Expenses paid in advance" },
      { code: "1410", name: "Prepaid Insurance", type: "asset", description: "Insurance premiums paid in advance" },
      { code: "1420", name: "Prepaid Rent", type: "asset", description: "Rent paid in advance" },
      { code: "1500", name: "Fixed Assets - Equipment", type: "asset", description: "Business equipment" },
      { code: "1510", name: "Fixed Assets - Furniture", type: "asset", description: "Office furniture and fixtures" },
      { code: "1520", name: "Fixed Assets - Vehicles", type: "asset", description: "Company vehicles" },
      { code: "1530", name: "Fixed Assets - Machinery", type: "asset", description: "Production machinery" },
      { code: "1540", name: "Fixed Assets - Buildings", type: "asset", description: "Company buildings and structures" },
      { code: "1550", name: "Fixed Assets - Computers", type: "asset", description: "Computer hardware" },
      { code: "1600", name: "Accumulated Depreciation", type: "asset", description: "Total depreciation of assets" },
      { code: "1700", name: "Investments", type: "asset", description: "Long-term investments" },
      { code: "1800", name: "Goodwill", type: "asset", description: "Intangible asset from acquisitions" },
      { code: "1900", name: "Other Assets", type: "asset", description: "Miscellaneous assets" },

      // Liabilities (2000-2999)
      { code: "2000", name: "Accounts Payable", type: "liability", description: "Money owed to suppliers" },
      { code: "2100", name: "Credit Card Payable", type: "liability", description: "Credit card balance" },
      { code: "2200", name: "Sales Tax Payable", type: "liability", description: "Sales tax collected but not remitted" },
      { code: "2210", name: "Income Tax Withheld", type: "liability", description: "Tax withheld from employee salaries" },
      { code: "2300", name: "Income Tax Payable", type: "liability", description: "Income tax owed" },
      { code: "2400", name: "Accrued Liabilities", type: "liability", description: "Expenses incurred but not yet paid" },
      { code: "2410", name: "Accrued Salaries", type: "liability", description: "Salaries owed to employees" },
      { code: "2420", name: "Accrued Interest", type: "liability", description: "Interest owed but not yet paid" },
      { code: "2500", name: "Short-term Loans", type: "liability", description: "Loans due within one year" },
      { code: "2510", name: "Bank Overdraft", type: "liability", description: "Negative bank balance" },
      { code: "2600", name: "Long-term Loans", type: "liability", description: "Loans due after one year" },
      { code: "2610", name: "Mortgage Payable", type: "liability", description: "Mortgage on property" },
      { code: "2700", name: "Deferred Revenue", type: "liability", description: "Advance payments from customers" },
      { code: "2800", name: "Provision for Employee Benefits", type: "liability", description: "Gratuity and other employee benefits" },
      { code: "2900", name: "Other Liabilities", type: "liability", description: "Miscellaneous liabilities" },

      // Equity (3000-3999)
      { code: "3000", name: "Owner's Equity", type: "equity", description: "Owner's investment in the business" },
      { code: "3100", name: "Retained Earnings", type: "equity", description: "Accumulated profits/losses" },
      { code: "3200", name: "Share Capital", type: "equity", description: "Capital from shares issued" },
      { code: "3300", name: "Additional Paid-in Capital", type: "equity", description: "Capital above par value" },
      { code: "3400", name: "Treasury Stock", type: "equity", description: "Company's own shares repurchased" },
      { code: "3500", name: "Current Year Earnings", type: "equity", description: "Profit/loss for current year" },
      { code: "3600", name: "Owner's Drawings", type: "equity", description: "Withdrawals by owner" },

      // Income (4000-4999)
      { code: "4000", name: "Sales Revenue", type: "income", description: "Revenue from sales" },
      { code: "4100", name: "Service Revenue", type: "income", description: "Revenue from services" },
      { code: "4200", name: "Interest Income", type: "income", description: "Interest earned" },
      { code: "4300", name: "Other Income", type: "income", description: "Miscellaneous income" },
      { code: "4400", name: "Discount Received", type: "income", description: "Discounts from suppliers" },
      { code: "4500", name: "Commission Income", type: "income", description: "Commission earned" },
      { code: "4600", name: "Rental Income", type: "income", description: "Income from property rental" },
      { code: "4700", name: "Gain on Asset Sale", type: "income", description: "Profit from selling assets" },
      { code: "4800", name: "Export Revenue", type: "income", description: "Revenue from export sales" },
      { code: "4900", name: "Sales Returns & Allowances", type: "income", description: "Contra account for returns" },

      // Expenses (5000-5999)
      { code: "5000", name: "Cost of Goods Sold", type: "expense", description: "Direct cost of goods sold" },
      { code: "5010", name: "Direct Labor", type: "expense", description: "Wages for production workers" },
      { code: "5020", name: "Manufacturing Overhead", type: "expense", description: "Indirect production costs" },
      { code: "5030", name: "Freight & Shipping", type: "expense", description: "Shipping costs for goods" },
      { code: "5040", name: "Import Duties", type: "expense", description: "Customs and import charges" },
      { code: "5100", name: "Salaries & Wages", type: "expense", description: "Employee compensation" },
      { code: "5110", name: "Employee Benefits", type: "expense", description: "Health insurance, provident fund" },
      { code: "5120", name: "Overtime Pay", type: "expense", description: "Overtime compensation" },
      { code: "5200", name: "Rent Expense", type: "expense", description: "Office/warehouse rent" },
      { code: "5300", name: "Utilities", type: "expense", description: "Electricity, water, gas" },
      { code: "5310", name: "Telephone & Internet", type: "expense", description: "Communication expenses" },
      { code: "5400", name: "Office Supplies Expense", type: "expense", description: "Office supplies used" },
      { code: "5500", name: "Depreciation Expense", type: "expense", description: "Asset depreciation" },
      { code: "5600", name: "Marketing & Advertising", type: "expense", description: "Marketing costs" },
      { code: "5610", name: "Digital Marketing", type: "expense", description: "Online advertising costs" },
      { code: "5700", name: "Travel & Transportation", type: "expense", description: "Business travel costs" },
      { code: "5800", name: "Insurance Expense", type: "expense", description: "Business insurance premiums" },
      { code: "5900", name: "Professional Fees", type: "expense", description: "Legal, accounting, consulting fees" },
      { code: "6000", name: "Bank Charges", type: "expense", description: "Bank fees and charges" },
      { code: "6100", name: "Interest Expense", type: "expense", description: "Interest on loans" },
      { code: "6200", name: "Tax Expense", type: "expense", description: "Business taxes" },
      { code: "6300", name: "Repairs & Maintenance", type: "expense", description: "Equipment and facility repairs" },
      { code: "6400", name: "Training & Development", type: "expense", description: "Employee training costs" },
      { code: "6500", name: "Software & Subscriptions", type: "expense", description: "SaaS and software licenses" },
      { code: "6600", name: "Printing & Stationery", type: "expense", description: "Printing and office stationery" },
      { code: "6700", name: "Bad Debts Expense", type: "expense", description: "Uncollectible accounts" },
      { code: "6800", name: "Charity & Donations", type: "expense", description: "Charitable contributions" },
      { code: "6900", name: "Miscellaneous Expense", type: "expense", description: "Other expenses" },
    ];

    const accountsToInsert = defaultAccounts.map((account) => ({
      orgId,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isActive: true,
    }));

    await db.insert(chartOfAccounts).values(accountsToInsert);

    revalidatePath("/dashboard/accounts/chart-of-accounts");

    return {
      success: true,
      message: `Successfully created ${accountsToInsert.length} default accounts in Chart of Accounts`,
      count: accountsToInsert.length
    };
  } catch (error) {
    return { success: false, error: "Failed to seed chart of accounts" };
  }
}

// Create a journal entry for current user's organization
export async function createJournalEntry(data: JournalEntryData) {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    // Calculate totals
    const totalDebit = data.lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);

    // Validate debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Journal entry is not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
      };
    }

    // Validate all lines have accounts
    for (const line of data.lines) {
      if (!line.accountId) {
        return { success: false, error: "All journal entry lines must have an account" };
      }

      // Validate that either debit or credit is present
      if ((!line.debit || parseFloat(line.debit) === 0) && (!line.credit || parseFloat(line.credit) === 0)) {
        return { success: false, error: "Each line must have either a debit or credit amount" };
      }
    }

    // Generate entry number
    const entryCount = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.orgId, orgId));
    
    const entryNumber = `JE-${String(entryCount.length + 1).padStart(5, '0')}`;

    // Create journal entry
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: new Date(data.date),
        referenceType: 'manual',
        description: data.description,
      })
      .returning();

    // Create journal entry lines
    for (const line of data.lines) {
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: line.accountId,
        description: line.description,
        debitAmount: line.debit || '0',
        creditAmount: line.credit || '0',
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'JOURNAL_ENTRY_CREATED',
      entityType: 'journal_entry',
      entityId: journalEntry.id,
      changes: JSON.stringify({
        entryNumber,
        description: data.description,
        totalDebit,
        totalCredit,
      }),
    });

    revalidatePath("/dashboard/accounts/journal-entries");

    return {
      success: true,
      message: "Journal entry created successfully",
      entryNumber
    };
  } catch (error) {
    return { success: false, error: "Failed to create journal entry" };
  }
}

// Get account by ID
export async function getAccountById(accountId: string) {
  try {
    const account = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, accountId))
      .limit(1);

    if (account.length === 0) {
      return { success: false, error: "Account not found" };
    }

    return { success: true, data: account[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch account" };
  }
}

// ==================== COMPANY SETTINGS ====================

export async function getCompanySettings() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    return { success: true, data: org };
  } catch (error) {
    return { success: false, error: "Failed to fetch company settings" };
  }
}

export async function updateCompanySettings(data: {
  name: string;
  ntn?: string;
  strn?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscalYearStart?: string;
  currency?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.name?.trim()) {
      return { success: false, error: "Company name is required" };
    }

    const updateData: Record<string, string> = { name: data.name.trim() };
    if (data.ntn !== undefined) updateData.ntn = data.ntn;
    if (data.strn !== undefined) updateData.strn = data.strn;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.fiscalYearStart !== undefined) updateData.fiscalYearStart = data.fiscalYearStart;
    if (data.currency !== undefined) updateData.currency = data.currency;

    await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    revalidatePath("/settings");

    return { success: true, message: "Settings saved successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update company settings" };
  }
}

// Get all accounts for dropdown
export async function getAllAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const accounts = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        type: chartOfAccounts.type,
      })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.isActive, true)
      ))
      .orderBy(chartOfAccounts.code);

    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, error: "Failed to fetch accounts" };
  }
}

export interface LedgerTransaction {
  date: Date;
  entryNumber: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface LedgerReportResult {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  transactions: LedgerTransaction[];
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
}

export async function getLedgerReport(
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<{ success: boolean; data?: LedgerReportResult; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Fetch account details
    const [account] = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        type: chartOfAccounts.type,
      })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, accountId))
      .limit(1);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // Build date filter
    const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-12-31');

    // Fetch journal entry lines for this account within date range
    const rows = await db
      .select({
        date: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
        description: journalEntryLines.description,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntryLines.accountId, accountId),
        sql`${journalEntries.entryDate} >= ${from}`,
        sql`${journalEntries.entryDate} <= ${to}`
      ))
      .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

    // Calculate running balance
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const transactions: LedgerTransaction[] = [];

    for (const row of rows) {
      const debit = parseFloat(row.debitAmount || '0');
      const credit = parseFloat(row.creditAmount || '0');

      totalDebit += debit;
      totalCredit += credit;

      // Running balance: positive = debit balance, negative = credit balance
      runningBalance += debit - credit;

      transactions.push({
        date: row.date,
        entryNumber: row.entryNumber,
        description: row.description || '',
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        balance: runningBalance.toFixed(2),
      });
    }

    return {
      success: true,
      data: {
        account,
        transactions,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        closingBalance: runningBalance.toFixed(2),
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to generate ledger report" };
  }
}

// ==================== TAX SUMMARY ====================

export interface MonthlyTaxBreakdown {
  month: string;
  outputTax: string;
  input_tax: string;
  net_tax: string;
}

export async function getTaxSummary(
  dateFrom: string,
  dateTo: string
): Promise<{
  success: boolean;
  data?: {
    outputTax: string;
    inputTax: string;
    netTaxPayable: string;
    monthlyBreakdown: MonthlyTaxBreakdown[];
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-12-31');

    // Output Tax: sales invoices (excluding draft/cancelled)
    const [outputResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${invoices.taxAmount}, 0))` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.issueDate} >= ${from}`,
        sql`${invoices.issueDate} <= ${to}`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const outputTax = parseFloat(outputResult?.total || '0');

    // Input Tax: purchase invoices (excluding draft/revised)
    const [inputResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${purchaseInvoices.taxTotal}, 0))` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.date} >= ${from}`,
        sql`${purchaseInvoices.date} <= ${to}`,
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const inputTax = parseFloat(inputResult?.total || '0');

    const netTaxPayable = outputTax - inputTax;

    // Monthly breakdown — fetch all relevant invoices and group by month
    const salesRows = await db
      .select({
        issueDate: invoices.issueDate,
        taxAmount: invoices.taxAmount,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.issueDate} >= ${from}`,
        sql`${invoices.issueDate} <= ${to}`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const purchaseRows = await db
      .select({
        date: purchaseInvoices.date,
        taxTotal: purchaseInvoices.taxTotal,
      })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.date} >= ${from}`,
        sql`${purchaseInvoices.date} <= ${to}`,
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    // Group by YYYY-MM
    const monthMap = new Map<string, { output: number; input: number }>();

    for (const row of salesRows) {
      const key = `${row.issueDate.getFullYear()}-${String(row.issueDate.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) || { output: 0, input: 0 };
      entry.output += parseFloat(row.taxAmount || '0');
      monthMap.set(key, entry);
    }

    for (const row of purchaseRows) {
      const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) || { output: 0, input: 0 };
      entry.input += parseFloat(row.taxTotal || '0');
      monthMap.set(key, entry);
    }

    const monthlyBreakdown: MonthlyTaxBreakdown[] = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({
        month,
        outputTax: v.output.toFixed(2),
        input_tax: v.input.toFixed(2),
        net_tax: (v.output - v.input).toFixed(2),
      }));

    return {
      success: true,
      data: {
        outputTax: outputTax.toFixed(2),
        inputTax: inputTax.toFixed(2),
        netTaxPayable: netTaxPayable.toFixed(2),
        monthlyBreakdown,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to generate tax summary" };
  }
}
