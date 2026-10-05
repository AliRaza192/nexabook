"use server";

import { db } from "@/db";
import { chartOfAccounts, organizations, profiles, journalEntries, journalEntryLines, auditLogs, invoices, invoiceItems, purchaseInvoices, purchaseItems } from "@/db/schema";
import { validate, createInvoiceSchema, createCustomerSchema, createVendorSchema } from "@/lib/validations";
import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";
import { requireRole } from "./shared";
import { validateJournalBalance } from "../accounting";
import { postTransaction } from "../accounting/posting-engine";
import { checkPeriodLocked } from "./fiscal-periods";
import { captureException } from "@/lib/error-handler";
import { addDecimal } from "@/lib/utils/decimal";

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
    captureException(error, { module: "accounts", function: "getAccounts" });
    return { success: false, error: "Failed to fetch accounts" };
  }
}

// Seed initial Chart of Accounts for current user's organization
//
// FIX (2026 review): the previous subType mapping assigned the SAME
// subType to multiple accounts in 7 places (cash, bank, income_tax_payable,
// cogs, salary_expense, fixed_assets, misc_expense). Since resolveAccount()
// does `WHERE orgId AND subType LIMIT 1` with no ORDER BY, Postgres gives no
// guarantee which of the duplicate rows comes back — meaning postings could
// silently land on the wrong account (e.g. payroll withholding tax posting
// to the corporate income tax account, or COGS postings landing on Direct
// Labor). Every subType below now maps to exactly one account. Also added:
// a dedicated "Discount Allowed" account (was incorrectly sharing "Sales
// Returns & Allowances" with a vendor-discount-received posting that has
// nothing to do with sales returns), and a "Card Clearing" account for POS
// card/jazzcash/easypaisa payments.
export async function seedInitialCOA() {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
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

    const defaultAccounts: Array<{
      code: string;
      name: string;
      type: string;
      subType?: string;
      description: string;
    }> = [
      // Assets (1000-1999)
      { code: "1000", name: "Cash", type: "asset", description: "Cash on hand" },
      { code: "1010", name: "Bank - Main Account", type: "asset", description: "Main bank account" },
      { code: "1020", name: "Bank - Savings Account", type: "asset", description: "Savings bank account" },
      { code: "1030", name: "Petty Cash", type: "asset", description: "Small cash fund for minor expenses" },
      { code: "1040", name: "POS Cash", type: "asset", description: "POS terminal cash float" },
      { code: "1100", name: "Accounts Receivable", type: "asset", description: "Money owed by customers" },
      { code: "1110", name: "Allowance for Doubtful Accounts", type: "asset", description: "Estimated uncollectible receivables" },
      { code: "1150", name: "Card Clearing / Receivable", type: "asset", description: "Card, JazzCash, and Easypaisa payments pending settlement" },
      { code: "1200", name: "Inventory", type: "asset", description: "Goods available for sale" },
      { code: "1210", name: "Raw Materials", type: "asset", description: "Materials for production" },
      { code: "1211", name: "SRB Input Tax", type: "asset", description: "Recoverable Sindh sales tax on services" },
      { code: "1212", name: "PRA Input Tax", type: "asset", description: "Recoverable Punjab sales tax on services" },
      { code: "1213", name: "KPRA Input Tax", type: "asset", description: "Recoverable KP sales tax on services" },
      { code: "1214", name: "BRA Input Tax", type: "asset", description: "Recoverable Balochistan sales tax on services" },
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
      { code: "2200", name: "Sales Tax Payable", type: "liability", description: "Sales tax collected but not remitted (GST)" },
      { code: "2201", name: "SRB Payable", type: "liability", description: "Sindh sales tax on services payable" },
      { code: "2202", name: "PRA Payable", type: "liability", description: "Punjab sales tax on services payable" },
      { code: "2203", name: "KPRA Payable", type: "liability", description: "KP sales tax on services payable" },
      { code: "2204", name: "BRA Payable", type: "liability", description: "Balochistan sales tax on services payable" },
      { code: "2210", name: "Income Tax Withheld", type: "liability", description: "Tax withheld from employee salaries" },
      { code: "2250", name: "WHT Payable", type: "liability", description: "Withholding tax deducted from vendor payments (Section 153)" },
      { code: "2300", name: "Income Tax Payable", type: "liability", description: "Income tax owed" },
      { code: "2400", name: "Accrued Liabilities", type: "liability", description: "Expenses incurred but not yet paid" },
      { code: "2410", name: "Accrued Salaries", type: "liability", description: "Salaries owed to employees" },
      { code: "2420", name: "Accrued Interest", type: "liability", description: "Interest owed but not yet paid" },
      { code: "2430", name: "Provident Fund Payable", type: "liability", description: "Employee provident fund contributions payable" },
      { code: "2500", name: "Short-term Loans", type: "liability", description: "Loans due within one year" },
      { code: "2510", name: "Bank Overdraft", type: "liability", description: "Negative bank balance" },
      { code: "2600", name: "Long-term Loans", type: "liability", description: "Loans due after one year" },
      { code: "2610", name: "Mortgage Payable", type: "liability", description: "Mortgage on property" },
      { code: "2700", name: "Deferred Revenue", type: "liability", description: "Advance payments from customers" },
      { code: "2800", name: "Provision for Employee Benefits", type: "liability", description: "Gratuity and other employee benefits" },
      { code: "2900", name: "Other Liabilities", type: "liability", description: "Miscellaneous liabilities" },

      // Equity (3000-3999)
      { code: "3000", name: "Owner's Equity", type: "equity", description: "Owner's investment in the business" },
      { code: "3010", name: "Opening Balance Equity", type: "equity", description: "Contra account for opening balance journal entries" },
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
      { code: "4250", name: "Shipping Revenue", type: "income", subType: "shipping_revenue", description: "Revenue from shipping charges" },
      { code: "4300", name: "Other Income", type: "income", description: "Miscellaneous income" },
      { code: "4400", name: "Discount Received", type: "income", description: "Discounts from suppliers (vendor settlement)" },
      { code: "4500", name: "Exchange Gain", type: "income", description: "Gain from currency exchange rate fluctuations" },
      { code: "4550", name: "Commission Income", type: "income", description: "Commission earned" },
      { code: "4600", name: "Rental Income", type: "income", description: "Income from property rental" },
      { code: "4700", name: "Gain on Asset Sale", type: "income", description: "Profit from selling assets" },
      { code: "4800", name: "Export Revenue", type: "income", description: "Revenue from export sales" },
      { code: "4900", name: "Sales Returns & Allowances", type: "income", description: "Contra account for returns" },
      { code: "4910", name: "Discount Allowed", type: "income", description: "Discounts given to customers (customer settlement)" },
      { code: "4950", name: "Unrealized FX Gain/Loss", type: "income", subType: "unrealized_fx", description: "Unrealized foreign exchange gain or loss" },

      // Expenses (5000-5999)
      { code: "5000", name: "Cost of Goods Sold", type: "expense", description: "Direct cost of goods sold" },
      { code: "5010", name: "Direct Labor", type: "expense", description: "Wages for production workers" },
      { code: "5020", name: "Manufacturing Overhead", type: "expense", description: "Indirect production costs" },
      { code: "5030", name: "Freight & Shipping", type: "expense", description: "Shipping costs for goods" },
      { code: "5040", name: "Import Duties", type: "expense", description: "Customs and import charges" },
      { code: "5100", name: "Salaries & Wages", type: "expense", description: "Employee compensation" },
      { code: "5110", name: "Employee Benefits", type: "expense", description: "Health insurance, provident fund" },
      { code: "5115", name: "EOBI Expense", type: "expense", description: "Employer EOBI contribution" },
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
      { code: "6650", name: "Exchange Loss", type: "expense", description: "Loss from currency exchange rate fluctuations" },
      { code: "6700", name: "Bad Debts Expense", type: "expense", description: "Uncollectible accounts" },
      { code: "6800", name: "Charity & Donations", type: "expense", description: "Charitable contributions" },
      { code: "6900", name: "Miscellaneous Expense", type: "expense", description: "Other expenses" },
    ];

    // FIX (2026 review): every subType now maps to exactly one account code.
    // Previously duplicated subTypes (cash, bank, income_tax_payable, cogs,
    // salary_expense, fixed_assets, misc_expense) made resolveAccount()'s
    // single-row lookup non-deterministic. See review notes above.
    const subTypeMap: Record<string, string> = {
      "1000": "cash",                        // Petty Cash (1030) no longer shares this
      "1010": "bank",                        // Savings (1020) no longer shares this
      "1040": "pos_cash",
      "1100": "accounts_receivable",
      "1150": "card_clearing",
      "1200": "inventory",
      "1210": "raw_materials_inventory",
      "1211": "tax_receivable_srb", "1212": "tax_receivable_pra", "1213": "tax_receivable_kpra", "1214": "tax_receivable_bra",
      "1230": "finished_goods",
      "1400": "prepaid",
      "1500": "fixed_assets",                // Accumulated Depreciation (1600) no longer shares this
      "1600": "accumulated_depreciation",
      "2000": "accounts_payable",
      "2200": "tax_payable",
      "2201": "tax_payable_srb", "2202": "tax_payable_pra", "2203": "tax_payable_kpra", "2204": "tax_payable_bra",
      "2210": "income_tax_payable",           // payroll withholding — corporate tax (2300) no longer shares this
      "2250": "wht_payable",
      "2300": "corporate_income_tax_payable",
      "2410": "salaries_payable", "2430": "pf_payable", "2800": "eobi_payable",
      "3000": "capital", "3010": "opening_balance_equity", "3100": "retained_earnings",
      "3500": "current_year_pl",
      "4000": "sales_revenue", "4100": "service_revenue",
      "4250": "shipping_revenue", "4300": "other_income",
      "4400": "discount_received",            // FIX: was previously unset; vendor-discount postings now resolve correctly
      "4500": "exchange_gain",
      "4900": "sales_returns",                // FIX: was "discount_allowed" — genuinely a returns account, not discounts
      "4910": "discount_allowed",             // NEW: dedicated customer-discount account
      "5000": "cogs",                         // Direct Labor (5010) no longer shares this
      "5100": "salary_expense",               // Employee Benefits (5110) no longer shares this
      "5115": "eobi_expense",
      "5200": "rent_expense", "5300": "utilities",
      "5500": "depreciation",
      "6650": "exchange_loss",
      "6700": "inventory_write_off",
      "6900": "misc_expense",                 // Marketing (5600) no longer shares this
    };

    const accountsToInsert = defaultAccounts.map((account) => ({
      orgId,
      code: account.code,
      name: account.name,
      type: account.type,
      subType: account.subType || subTypeMap[account.code] || null,
      isSystemAccount: false,
      description: account.description,
      isActive: true,
      balance: "0",
    }));

    await db.insert(chartOfAccounts).values(accountsToInsert).onConflictDoNothing();

    revalidatePath("/dashboard/accounts/chart-of-accounts");

    return {
      success: true,
      message: `Successfully created ${accountsToInsert.length} default accounts in Chart of Accounts`,
      count: accountsToInsert.length
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "seedInitialCOA" });
    return { success: false, error: "Failed to seed chart of accounts" };
  }
}

// Create a journal entry for current user's organization
// FIX (2026 review): per-line account-org validation batched via inArray
// (was one query per line — N+1). Entry number now routed through the
// shared generateJournalEntryNumber() (MAX-parsed, prefix-scoped) instead
// of a hand-rolled COUNT(*) that had the same delete-causes-duplicate flaw
// fixed elsewhere.
export async function createJournalEntry(data: JournalEntryData) {
  await requireRole(["admin", "accountant"]);
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  const validation = validate(
    z.object({
      date: z.string().min(1, "Date is required"),
      description: z.string().optional(),
      lines: z.array(z.object({
        accountId: z.string().uuid("Invalid account ID"),
        description: z.string().optional(),
        debit: z.string().optional(),
        credit: z.string().optional(),
      })).min(2, "At least two journal entry lines required"),
    }),
    data
  );
  if (!validation.success) return { success: false, error: validation.error };

  if (data.date) {
    const locked = await checkPeriodLocked(new Date(data.date));
    if (locked) {
      return { success: false, error: "Cannot post to a locked fiscal period" };
    }
  }

  try {
    const totalDebit = data.lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Journal entry is not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
      };
    }

    for (const line of data.lines) {
      if (!line.accountId) {
        return { success: false, error: "All journal entry lines must have an account" };
      }
      if ((!line.debit || parseFloat(line.debit) === 0) && (!line.credit || parseFloat(line.credit) === 0)) {
        return { success: false, error: "Each line must have either a debit or credit amount" };
      }
    }

    // Batch org-membership check for all accounts referenced (fix N+1)
    const accountIds = [...new Set(data.lines.map((l) => l.accountId))];
    const orgAccounts = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(inArray(chartOfAccounts.id, accountIds), eq(chartOfAccounts.orgId, orgId)));
    const validAccountIds = new Set(orgAccounts.map((a) => a.id));

    for (const accountId of accountIds) {
      if (!validAccountIds.has(accountId)) {
        return { success: false, error: `Account ${accountId} does not belong to this organization` };
      }
    }

    if (!validateJournalBalance(data.lines.map(l => ({ debitAmount: l.debit || '0', creditAmount: l.credit || '0' })))) {
      throw new Error("Journal entry out of balance: total debits must equal total credits");
    }

    const userId = (await auth()).userId || "system";

    const { entryNumber } = await db.transaction(async (tx) => {
      const posted = await postTransaction(tx, {
        orgId,
        description: data.description || "Manual Journal Entry",
        date: new Date(data.date),
        referenceType: "manual",
        createdBy: userId,
        lines: data.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description || "",
          debit: line.debit || "0",
          credit: line.credit || "0",
        })),
      });

      await tx.insert(auditLogs).values({
        orgId,
        userId,
        action: "JOURNAL_ENTRY_CREATED",
        entityType: "journal_entry",
        entityId: posted.journalEntryId,
        changes: JSON.stringify({
          entryNumber: posted.entryNumber,
          description: data.description,
          totalDebit,
          totalCredit,
        }),
      });

      return posted;
    });

    revalidatePath("/dashboard/accounts/journal-entries");

    return {
      success: true,
      message: "Journal entry created successfully",
      entryNumber
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "createJournalEntry" });
    return { success: false, error: "Failed to create journal entry" };
  }
}

// Get account by ID
export async function getAccountById(accountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [account] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.orgId, orgId)))
      .limit(1);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    return { success: true, data: account };
  } catch (error) {
    captureException(error, { module: "accounts", function: "getAccountById" });
    return { success: false, error: "Failed to fetch account" };
  }
}

// ==================== OPENING BALANCE ====================

export async function findOpeningBalanceEquityAccount(orgId: string) {
  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.subType, "opening_balance_equity")
      )
    )
    .limit(1);
  return account || null;
}

// FIX (2026 review): added missing requireRole — this posts real financial
// entries and had no RBAC check at all, unlike every sibling function
// (createJournalEntry, createVoucher, deleteJournalEntry). Also: line
// accountIds are now verified to belong to this org (were previously
// trusted from the client with zero ownership check).
export async function postOpeningBalance(data: {
  date: string;
  description: string;
  lines: Array<{ accountId: string; debit: string; credit: string }>;
}) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date(data.date));
    if (locked) return { success: false, error: "Cannot post opening balance in a locked fiscal period" };

    const obeAccount = await findOpeningBalanceEquityAccount(orgId);
    if (!obeAccount) {
      return {
        success: false,
        error:
          "Opening Balance Equity account not found. Please seed Chart of Accounts first.",
      };
    }

    const accountIds = [...new Set(data.lines.map((l) => l.accountId))];
    const orgAccounts = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(inArray(chartOfAccounts.id, accountIds), eq(chartOfAccounts.orgId, orgId)));
    const validAccountIds = new Set(orgAccounts.map((a) => a.id));
    for (const accountId of accountIds) {
      if (!validAccountIds.has(accountId)) {
        return { success: false, error: `Account ${accountId} does not belong to this organization` };
      }
    }

    const totalDebit = data.lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Opening entry is not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`,
      };
    }

    const userId = (await auth()).userId || "system";

    const allLines = [...data.lines];

    const { entryNumber } = await db.transaction(async (tx) => {
      const posted = await postTransaction(tx, {
        orgId,
        description: data.description || "Opening Balance Entry",
        date: new Date(data.date),
        referenceType: "opening_balance",
        numberPrefix: "OB",
        createdBy: userId,
        lines: allLines.map((line) => ({
          accountId: line.accountId,
          description: data.description || "Opening Balance",
          debit: line.debit || "0",
          credit: line.credit || "0",
        })),
      });

      await tx.insert(auditLogs).values({
        orgId,
        userId,
        action: "OPENING_BALANCE_POSTED",
        entityType: "journal_entry",
        entityId: posted.journalEntryId,
        changes: JSON.stringify({
          entryNumber: posted.entryNumber,
          description: data.description,
          totalDebit,
          totalCredit,
        }),
      });

      return posted;
    });

    revalidatePath("/accounts/opening-balance");
    revalidatePath("/reports/trial-balance");

    return {
      success: true,
      message: "Opening balance posted successfully",
      entryNumber,
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "postOpeningBalance" });
    return { success: false, error: "Failed to post opening balance" };
  }
}

// FIX (2026 review): added missing requireRole (same RBAC gap as
// postOpeningBalance). Account-code lookups batched (was one query per
// row — N+1). Entry number routed through the shared generator.
export async function bulkImportOpeningBalances(
  rows: Array<{ accountCode: string; debit: string; credit: string }>,
  date?: string
) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot import opening balances in a locked fiscal period" };

    const obeAccount = await findOpeningBalanceEquityAccount(orgId);
    if (!obeAccount) {
      return {
        success: false,
        error:
          "Opening Balance Equity account not found. Please seed Chart of Accounts first.",
      };
    }

    const codes = [...new Set(rows.map((r) => r.accountCode))];
    const orgAccounts = await db
      .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(inArray(chartOfAccounts.code, codes), eq(chartOfAccounts.orgId, orgId)));
    const codeToId = new Map(orgAccounts.map((a) => [a.code, a.id]));

    const lines: Array<{ accountId: string; debit: string; credit: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, i) => {
      const accountId = codeToId.get(row.accountCode);
      if (!accountId) {
        errors.push({ row: i + 1, error: `Account code "${row.accountCode}" not found` });
        return;
      }
      lines.push({ accountId, debit: row.debit, credit: row.credit });
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    if (lines.length === 0) {
      return { success: false, error: "No valid rows to import" };
    }

    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);

    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) > 0.01) {
      lines.push({
        accountId: obeAccount.id,
        debit: diff < 0 ? Math.abs(diff).toFixed(2) : "0",
        credit: diff > 0 ? diff.toFixed(2) : "0",
      });
    }

    const { entryNumber } = await db.transaction(async (tx) => {
      return await postTransaction(tx, {
        orgId,
        description: "Bulk Opening Balance Import",
        date: new Date(date || new Date()),
        referenceType: "opening_balance",
        numberPrefix: "OB-BULK",
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: "Opening Balance",
          debit: line.debit || "0",
          credit: line.credit || "0",
        })),
      });
    });

    revalidatePath("/accounts/opening-balance");

    return {
      success: true,
      message: `Imported ${lines.length} account balances as ${entryNumber}`,
      entryNumber,
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "bulkImportOpeningBalances" });
    return { success: false, error: "Failed to import opening balances" };
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
    captureException(error, { module: "accounts", function: "getCompanySettings" });
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
  invoicePrefix?: string;
  orderPrefix?: string;
  quotationPrefix?: string;
  purchasePrefix?: string;
  billPrefix?: string;
  grnPrefix?: string;
  numberingPadding?: number;
  numberingIncludeYear?: boolean;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.name?.trim()) {
      return { success: false, error: "Company name is required" };
    }

    const updateData: Partial<typeof organizations.$inferInsert> = { name: data.name.trim() };
    if (data.ntn !== undefined) updateData.ntn = data.ntn;
    if (data.strn !== undefined) updateData.strn = data.strn;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.fiscalYearStart !== undefined) updateData.fiscalYearStart = data.fiscalYearStart;
    if (data.currency !== undefined) updateData.currency = data.currency;

    if (data.invoicePrefix !== undefined) updateData.invoicePrefix = data.invoicePrefix;
    if (data.orderPrefix !== undefined) updateData.orderPrefix = data.orderPrefix;
    if (data.quotationPrefix !== undefined) updateData.quotationPrefix = data.quotationPrefix;
    if (data.purchasePrefix !== undefined) updateData.purchasePrefix = data.purchasePrefix;
    if (data.billPrefix !== undefined) updateData.billPrefix = data.billPrefix;
    if (data.grnPrefix !== undefined) updateData.grnPrefix = data.grnPrefix;
    if (data.numberingPadding !== undefined) updateData.numberingPadding = data.numberingPadding;
    if (data.numberingIncludeYear !== undefined) updateData.numberingIncludeYear = data.numberingIncludeYear;

    await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    revalidatePath("/settings");

    return { success: true, message: "Settings saved successfully" };
  } catch (error) {
    captureException(error, { module: "accounts", function: "updateCompanySettings" });
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
    captureException(error, { module: "accounts", function: "getAllAccounts" });
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

// FIX (2026 review): account lookup previously had no orgId filter — a
// cross-org accountId would still resolve and leak that account's
// code/name/type (the transactions themselves stayed correctly scoped via
// journalEntryLines.orgId, but the account metadata did not).
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

    const [account] = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        type: chartOfAccounts.type,
      })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.orgId, orgId)))
      .limit(1);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-12-31');

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

    let runningBalance = "0.00";
    let totalDebit = "0.00";
    let totalCredit = "0.00";
    const transactions: LedgerTransaction[] = [];

    for (const row of rows) {
      const debit = parseFloat(row.debitAmount || '0');
      const credit = parseFloat(row.creditAmount || '0');

      totalDebit = addDecimal(totalDebit, debit);
      totalCredit = addDecimal(totalCredit, credit);
      runningBalance = addDecimal(runningBalance, debit, -credit);

      transactions.push({
        date: row.date,
        entryNumber: row.entryNumber,
        description: row.description || '',
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        balance: runningBalance,
      });
    }

    return {
      success: true,
      data: {
        account,
        transactions,
        totalDebit,
        totalCredit,
        closingBalance: runningBalance,
      },
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "getLedgerReport" });
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

export interface ProvincialTaxBreakdown {
  province: string;
  outputTax: number;
  inputTax: number;
  netPayable: number;
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
    provincialBreakdown: ProvincialTaxBreakdown[];
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

    const [inputResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${purchaseInvoices.taxTotal}, 0))` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.date} >= ${from}`,
        sql`${purchaseInvoices.date} <= ${to}`,
        sql`LOWER(${purchaseInvoices.status}) NOT IN ('draft', 'revised')`
      ));

    const inputTax = parseFloat(inputResult?.total || '0');
    const netTaxPayable = outputTax - inputTax;

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
        sql`LOWER(${purchaseInvoices.status}) NOT IN ('draft', 'revised')`
      ));

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

    const salesTaxByType = await db
      .select({
        taxType: invoiceItems.taxType,
        total: sql<string>`SUM(COALESCE(${invoiceItems.lineTotal} * ${invoiceItems.taxRate} / 100, 0))`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.issueDate} >= ${from}`,
        sql`${invoices.issueDate} <= ${to}`,
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
        sql`${purchaseInvoices.date} >= ${from}`,
        sql`${purchaseInvoices.date} <= ${to}`,
        sql`LOWER(${purchaseInvoices.status}) NOT IN ('draft', 'revised')`,
      ))
      .groupBy(purchaseItems.taxType);

    const outputByProvince = new Map<string, number>();
    const inputByProvince = new Map<string, number>();

    for (const row of salesTaxByType) {
      outputByProvince.set(row.taxType || 'GST', parseFloat(row.total || '0'));
    }
    for (const row of purchaseTaxByType) {
      inputByProvince.set(row.taxType || 'GST', parseFloat(row.total || '0'));
    }

    const allProvinces = new Set([...outputByProvince.keys(), ...inputByProvince.keys()]);
    const provincialBreakdown: ProvincialTaxBreakdown[] = Array.from(allProvinces).sort().map(p => {
      const output = outputByProvince.get(p) || 0;
      const input = inputByProvince.get(p) || 0;
      return { province: p, outputTax: output, inputTax: input, netPayable: output - input };
    });

    return {
      success: true,
      data: {
        outputTax: outputTax.toFixed(2),
        inputTax: inputTax.toFixed(2),
        netTaxPayable: netTaxPayable.toFixed(2),
        monthlyBreakdown,
        provincialBreakdown,
      },
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "getTaxSummary" });
    return { success: false, error: "Failed to generate tax summary" };
  }
}

// ==================== VOUCHER SYSTEM ====================

export type VoucherType = 'CPV' | 'CRV' | 'BPV' | 'BRV' | 'JV' | 'CONTRA';

export interface VoucherData {
  voucherType: VoucherType;
  date: string;
  description: string;
  amount: string;
  expenseAccountId?: string;
  receiptAccountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  lines?: JournalEntryLine[];
  bankAccountId?: string;
  reference?: string;
  payeeName?: string;
  paymentMode?: string;
}

// Create voucher with auto Dr/Cr logic
// FIX (2026 review):
//  - Entry number now routed through the shared, MAX-parsed generator
//    with retry (the previous getNextVoucherNumber() was a standalone
//    COUNT-based LIKE query with no retry loop).
//  - Every account ID the client can supply (expenseAccountId,
//    receiptAccountId, bankAccountId, fromAccountId, toAccountId, and each
//    JV line's accountId) is now verified to belong to this org before the
//    entry posts — previously only the auto-resolved cash account was
//    org-scoped, meaning a client could reference another org's account.
export async function createVoucher(data: VoucherData) {
  await requireRole(["admin", "accountant"]);
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  const locked = await checkPeriodLocked(new Date(data.date));
  if (locked) return { success: false, error: "Cannot create voucher in a locked fiscal period" };

  try {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    // Collect every client-supplied accountId up front for a single
    // org-membership check, regardless of voucher type.
    const suppliedAccountIds = [
      data.expenseAccountId,
      data.receiptAccountId,
      data.fromAccountId,
      data.toAccountId,
      data.bankAccountId,
      ...(data.lines?.map((l) => l.accountId) || []),
    ].filter((id): id is string => !!id);

    if (suppliedAccountIds.length > 0) {
      const uniqueIds = [...new Set(suppliedAccountIds)];
      const orgAccounts = await db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(inArray(chartOfAccounts.id, uniqueIds), eq(chartOfAccounts.orgId, orgId)));
      const validIds = new Set(orgAccounts.map((a) => a.id));
      for (const id of uniqueIds) {
        if (!validIds.has(id)) {
          return { success: false, error: `Account ${id} does not belong to this organization` };
        }
      }
    }

    let linesToInsert: JournalEntryLine[] = [];

    switch (data.voucherType) {
      case 'CPV': {
        if (!data.expenseAccountId) {
          return { success: false, error: "Expense account is required for CPV" };
        }
        const [cashAcc] = await db.select({ id: chartOfAccounts.id })
          .from(chartOfAccounts)
          .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.subType, 'cash')))
          .limit(1);
        if (!cashAcc) return { success: false, error: "Cash account not found in Chart of Accounts" };

        linesToInsert = [
          {
            accountId: data.expenseAccountId,
            description: data.description || `Payment for ${data.payeeName || 'expense'}`,
            debit: data.amount,
            credit: '0',
          },
          {
            accountId: cashAcc.id,
            description: 'Cash payment',
            debit: '0',
            credit: data.amount,
          },
        ];
        break;
      }

      case 'CRV': {
        if (!data.receiptAccountId) {
          return { success: false, error: "Receipt account is required for CRV" };
        }
        const [cashAcc2] = await db.select({ id: chartOfAccounts.id })
          .from(chartOfAccounts)
          .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.subType, 'cash')))
          .limit(1);
        if (!cashAcc2) return { success: false, error: "Cash account not found" };

        linesToInsert = [
          {
            accountId: cashAcc2.id,
            description: `Cash received from ${data.payeeName || 'customer'}`,
            debit: data.amount,
            credit: '0',
          },
          {
            accountId: data.receiptAccountId,
            description: data.description || 'Receipt',
            debit: '0',
            credit: data.amount,
          },
        ];
        break;
      }

      case 'BPV': {
        if (!data.expenseAccountId || !data.bankAccountId) {
          return { success: false, error: "Expense and Bank accounts are required for BPV" };
        }
        linesToInsert = [
          {
            accountId: data.expenseAccountId,
            description: data.description || `Bank payment for ${data.payeeName || 'expense'}`,
            debit: data.amount,
            credit: '0',
          },
          {
            accountId: data.bankAccountId,
            description: 'Bank payment',
            debit: '0',
            credit: data.amount,
          },
        ];
        break;
      }

      case 'BRV': {
        if (!data.receiptAccountId || !data.bankAccountId) {
          return { success: false, error: "Receipt and Bank accounts are required for BRV" };
        }
        linesToInsert = [
          {
            accountId: data.bankAccountId,
            description: `Bank receipt from ${data.payeeName || 'customer'}`,
            debit: data.amount,
            credit: '0',
          },
          {
            accountId: data.receiptAccountId,
            description: data.description || 'Receipt',
            debit: '0',
            credit: data.amount,
          },
        ];
        break;
      }

      case 'CONTRA': {
        if (!data.fromAccountId || !data.toAccountId) {
          return { success: false, error: "From and To accounts are required for CONTRA" };
        }
        if (data.fromAccountId === data.toAccountId) {
          return { success: false, error: "From and To accounts must be different for CONTRA" };
        }
        linesToInsert = [
          {
            accountId: data.toAccountId,
            description: data.description || `Transfer from ${data.payeeName || 'account'}`,
            debit: data.amount,
            credit: '0',
          },
          {
            accountId: data.fromAccountId,
            description: 'Transfer',
            debit: '0',
            credit: data.amount,
          },
        ];
        break;
      }

      case 'JV': {
        if (!data.lines || data.lines.length === 0) {
          return { success: false, error: "At least one line is required for JV" };
        }
        linesToInsert = data.lines;
        break;
      }

      default:
        return { success: false, error: "Invalid voucher type" };
    }

    const totalDebit = linesToInsert.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
    const totalCredit = linesToInsert.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Voucher is not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
      };
    }

    for (const line of linesToInsert) {
      if (!line.accountId) {
        return { success: false, error: "All lines must have an account" };
      }
    }

    const userId = (await auth()).userId || "system";

    const { entryNumber: voucherNumber, journalEntryId: entryId } = await db.transaction(async (tx) => {
      const posted = await postTransaction(tx, {
        orgId,
        description: data.description || `${data.voucherType} Voucher`,
        date: new Date(data.date),
        referenceType: data.voucherType.toLowerCase(),
        numberPrefix: data.voucherType,
        createdBy: userId,
        lines: linesToInsert.map((line) => ({
          accountId: line.accountId,
          description: line.description || "",
          debit: line.debit || "0",
          credit: line.credit || "0",
        })),
      });

      await tx.insert(auditLogs).values({
        orgId,
        userId,
        action: "VOUCHER_CREATED",
        entityType: "voucher",
        entityId: posted.journalEntryId,
        changes: JSON.stringify({
          voucherNumber: posted.entryNumber,
          voucherType: data.voucherType,
          amount,
          description: data.description,
        }),
      });

      return posted;
    });

    revalidatePath("/dashboard/accounts/journal-entries");

    return {
      success: true,
      message: `${data.voucherType} voucher created successfully`,
      voucherNumber,
      entryId,
    };
  } catch (error) {
    captureException(error, { module: "accounts", function: "createVoucher" });
    return { success: false, error: "Failed to create voucher" };
  }
}

// Get vouchers by type
export async function getVouchersByType(voucherType: VoucherType, limit: number = 50) {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    const vouchers = await db
      .select({
        id: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
      })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        sql`${journalEntries.entryNumber} LIKE ${voucherType + '-%'}`
      ))
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit);

    return { success: true, data: vouchers };
  } catch (error) {
    captureException(error, { module: "accounts", function: "getVouchersByType" });
    return { success: false, error: "Failed to fetch vouchers" };
  }
}

// Get single voucher with lines
export async function getVoucherWithLines(entryId: string) {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.orgId, orgId)
      ))
      .limit(1);

    if (!entry) {
      return { success: false, error: "Voucher not found" };
    }

    const lines = await db
      .select({
        id: journalEntryLines.id,
        accountId: journalEntryLines.accountId,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        description: journalEntryLines.description,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(eq(journalEntryLines.journalEntryId, entryId));

    return { success: true, data: { entry, lines } };
  } catch (error) {
    captureException(error, { module: "accounts", function: "getVoucherWithLines" });
    return { success: false, error: "Failed to fetch voucher" };
  }
}

export async function deleteJournalEntry(id: string) {
  try {
    await requireRole(['admin', 'accountant']);

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.orgId, orgId)))
      .limit(1);

    if (!entry) return { success: false, error: "Journal entry not found" };

    if (entry.status === "posted" || entry.status === "reversed") {
      return {
        success: false,
        error: `Cannot delete a ${entry.status} journal entry. Use void/reverse instead.`,
      };
    }

    const locked = await checkPeriodLocked(entry.entryDate);
    if (locked) {
      return { success: false, error: "Cannot delete entry in a locked fiscal period" };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id));

      await tx
        .delete(journalEntries)
        .where(and(eq(journalEntries.id, id), eq(journalEntries.orgId, orgId)));

      await tx.insert(auditLogs).values({
        orgId,
        userId: (await auth()).userId || "system",
        action: "JOURNAL_ENTRY_DELETED",
        entityType: "journal_entry",
        entityId: id,
        changes: JSON.stringify({
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          description: entry.description,
        }),
      });
    });

    revalidatePath("/dashboard/accounts/journal-entries");
    return { success: true, message: "Journal entry deleted successfully" };
  } catch (error) {
    captureException(error, { module: "accounts", function: "deleteJournalEntry" });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete journal entry"
    };
  }
}