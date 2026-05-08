import { db } from "@/db";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  invoices,
  customers,
  customerPayments,
  vendorPayments,
  purchaseInvoices,
  vendors,
  payrollRuns,
  taxRates,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// ─────────────────────────────────────────
// DOCUMENT NUMBER GENERATORS
// ─────────────────────────────────────────

export async function generateInvoiceNumber(orgId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq((await import("@/db/schema")).organizations.id, orgId),
  });

  const prefix = org?.invoicePrefix ?? "INV";
  const padding = org?.numberingPadding ?? 5;
  const includeYear = org?.numberingIncludeYear ?? true;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.orgId, orgId));

  const count = Number(result[0]?.count ?? 0) + 1;
  const year = includeYear ? new Date().getFullYear() : "";
  const padded = String(count).padStart(padding, "0");

  return includeYear
    ? `${prefix}-${year}-${padded}`
    : `${prefix}-${padded}`;
  // Example: INV-2025-00001
}

export async function generateJournalNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(eq(journalEntries.orgId, orgId));

  const count = Number(result[0]?.count ?? 0) + 1;
  return `JV-${year}-${String(count).padStart(5, "0")}`;
  // Example: JV-2025-00001
}

export async function generatePaymentNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerPayments)
    .where(eq(customerPayments.orgId, orgId));

  const count = Number(result[0]?.count ?? 0) + 1;
  return `RCP-${year}-${String(count).padStart(5, "0")}`;
  // Example: RCP-2025-00001
}

// ─────────────────────────────────────────
// CHART OF ACCOUNTS — System Account Finder
// ─────────────────────────────────────────

export async function getSystemAccount(orgId: string, subType: string) {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.orgId, orgId),
      eq(chartOfAccounts.subType, subType),
      eq(chartOfAccounts.isActive, true)
    ),
  });

  if (!account) {
    throw new Error(
      `System account nahi mila: "${subType}". Pehle Chart of Accounts setup karo.`
    );
  }

  return account;
}

// ─────────────────────────────────────────
// SETUP — Default Chart of Accounts
// (New org register hone par call karo)
// ─────────────────────────────────────────

export async function setupDefaultChartOfAccounts(orgId: string) {
  const { chartOfAccounts: coa } = await import("@/db/schema");

  const defaultAccounts = [
    // ── ASSETS ──────────────────────────
    {
      code: "1100",
      name: "Cash in Hand",
      type: "asset",
      subType: "cash",
    },
    {
      code: "1200",
      name: "Bank Account",
      type: "asset",
      subType: "bank",
    },
    {
      code: "1300",
      name: "Accounts Receivable",
      type: "asset",
      subType: "accounts_receivable",
    },
    {
      code: "1400",
      name: "Inventory / Stock",
      type: "asset",
      subType: "inventory",
    },
    {
      code: "1500",
      name: "Prepaid Expenses",
      type: "asset",
      subType: "prepaid",
    },
    {
      code: "1600",
      name: "Fixed Assets",
      type: "asset",
      subType: "fixed_assets",
    },

    // ── LIABILITIES ──────────────────────
    {
      code: "2100",
      name: "Accounts Payable",
      type: "liability",
      subType: "accounts_payable",
    },
    {
      code: "2200",
      name: "Tax Payable (GST/SRB)",
      type: "liability",
      subType: "tax_payable",
    },
    {
      code: "2300",
      name: "Salaries Payable",
      type: "liability",
      subType: "salaries_payable",
    },
    {
      code: "2400",
      name: "EOBI Payable",
      type: "liability",
      subType: "eobi_payable",
    },
    {
      code: "2500",
      name: "Income Tax Payable (WHT)",
      type: "liability",
      subType: "income_tax_payable",
    },

    // ── EQUITY ───────────────────────────
    {
      code: "3100",
      name: "Owner's Capital",
      type: "equity",
      subType: "capital",
    },
    {
      code: "3200",
      name: "Retained Earnings",
      type: "equity",
      subType: "retained_earnings",
    },
    {
      code: "3300",
      name: "Current Year Profit/Loss",
      type: "equity",
      subType: "current_year_pl",
    },

    // ── REVENUE ──────────────────────────
    {
      code: "4100",
      name: "Sales Revenue",
      type: "income",
      subType: "sales_revenue",
    },
    {
      code: "4200",
      name: "Service Revenue",
      type: "income",
      subType: "service_revenue",
    },
    {
      code: "4300",
      name: "Other Income",
      type: "income",
      subType: "other_income",
    },

    // ── EXPENSES ─────────────────────────
    {
      code: "5100",
      name: "Cost of Goods Sold",
      type: "expense",
      subType: "cogs",
    },
    {
      code: "5200",
      name: "Salaries Expense",
      type: "expense",
      subType: "salary_expense",
    },
    {
      code: "5300",
      name: "Rent Expense",
      type: "expense",
      subType: "rent_expense",
    },
    {
      code: "5400",
      name: "Utilities Expense",
      type: "expense",
      subType: "utilities",
    },
    {
      code: "5500",
      name: "Depreciation Expense",
      type: "expense",
      subType: "depreciation",
    },
    {
      code: "5600",
      name: "Miscellaneous Expense",
      type: "expense",
      subType: "misc_expense",
    },
  ];

  for (const acc of defaultAccounts) {
    await db
      .insert(coa)
      .values({
        orgId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        isSystemAccount: true,
        isActive: true,
        balance: "0",
      })
      .onConflictDoNothing();
  }
}

// ─────────────────────────────────────────
// DEFAULT TAX RATES SETUP
// ─────────────────────────────────────────

export async function setupDefaultTaxRates(orgId: string) {
  const defaults = [
    { name: "GST 17%", rate: "17.00", taxType: "GST", isDefault: true },
    { name: "SRB 16%", rate: "16.00", taxType: "SRB", isDefault: false },
    { name: "PRA 16%", rate: "16.00", taxType: "PRA", isDefault: false },
    { name: "KPRA 15%", rate: "15.00", taxType: "KPRA", isDefault: false },
    { name: "WHT 5%", rate: "5.00", taxType: "WHT", isDefault: false },
    { name: "Exempt (0%)", rate: "0.00", taxType: "EXEMPT", isDefault: false },
  ];

  for (const tax of defaults) {
    await db
      .insert(taxRates)
      .values({ orgId, ...tax })
      .onConflictDoNothing();
  }
}

// ─────────────────────────────────────────
// INVOICE POSTING — Double Entry
//
// DR: Accounts Receivable    (netAmount)
//     CR: Sales Revenue      (grossAmount - discount)
//     CR: Tax Payable        (taxAmount)
// ─────────────────────────────────────────

export async function postInvoiceToLedger(
  orgId: string,
  invoiceId: string,
  customerId: string,
  grossAmount: number,
  discountAmount: number,
  taxAmount: number,
  netAmount: number,
  userId: string
): Promise<string> {
  const arAccount = await getSystemAccount(orgId, "accounts_receivable");
  const revenueAccount = await getSystemAccount(orgId, "sales_revenue");
  const taxAccount = await getSystemAccount(orgId, "tax_payable");

  const subtotal = grossAmount - discountAmount;
  const jvNumber = await generateJournalNumber(orgId);
  const today = new Date().toISOString().split("T")[0];

  let journalEntryId = "";

  await db.transaction(async (tx) => {
    // ── 1. Journal Entry header ──────────
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber: jvNumber,
        entryDate: new Date(today),
        description: `Sales Invoice Posted — ${invoiceId}`,
        referenceType: "invoice",
        referenceId: invoiceId,
        status: "posted",
        sourceType: "invoice",
        createdBy: userId,
        postedAt: new Date(),
      })
      .returning();

    journalEntryId = entry.id;

    // ── 2. Debit/Credit Lines ────────────
    const lines = [
      // DR: Accounts Receivable (full net amount)
      {
        orgId,
        journalEntryId: entry.id,
        accountId: arAccount.id,
        debitAmount: netAmount.toFixed(2),
        creditAmount: "0.00",
        description: "Accounts Receivable",
      },
      // CR: Sales Revenue (subtotal after discount)
      {
        orgId,
        journalEntryId: entry.id,
        accountId: revenueAccount.id,
        debitAmount: "0.00",
        creditAmount: subtotal.toFixed(2),
        description: "Sales Revenue",
      },
    ];

    // CR: Tax Payable (only if tax > 0)
    if (taxAmount > 0) {
      lines.push({
        orgId,
        journalEntryId: entry.id,
        accountId: taxAccount.id,
        debitAmount: "0.00",
        creditAmount: taxAmount.toFixed(2),
        description: "Tax Payable (GST/SRB)",
      });
    }

    await tx.insert(journalEntryLines).values(lines);

    // ── 3. Invoice ko posted mark karo ───
    await tx
      .update(invoices)
      .set({
        isPosted: true,
        journalEntryId: entry.id,
        status: "sent",
      })
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId))
      );

    // ── 4. Customer balance update ───────
    await tx
      .update(customers)
      .set({ balance: sql`balance + ${netAmount}` })
      .where(
        and(eq(customers.id, customerId), eq(customers.orgId, orgId))
      );

    // ── 5. Account balances update ───────
    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance + ${netAmount}` })
      .where(eq(chartOfAccounts.id, arAccount.id));

    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance + ${subtotal}` })
      .where(eq(chartOfAccounts.id, revenueAccount.id));

    if (taxAmount > 0) {
      await tx
        .update(chartOfAccounts)
        .set({ balance: sql`balance + ${taxAmount}` })
        .where(eq(chartOfAccounts.id, taxAccount.id));
    }
  });

  return journalEntryId;
}

// ─────────────────────────────────────────
// CUSTOMER PAYMENT POSTING — Double Entry
//
// DR: Cash / Bank            (amount)
//     CR: Accounts Receivable (amount)
// ─────────────────────────────────────────

export async function postCustomerPaymentToLedger(
  orgId: string,
  paymentId: string,
  customerId: string,
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  userId: string
): Promise<string> {
  const arAccount = await getSystemAccount(orgId, "accounts_receivable");
  const cashBankAccount = await getSystemAccount(
    orgId,
    ["bank_transfer", "cheque", "online", "credit_card"].includes(paymentMethod)
      ? "bank"
      : "cash"
  );

  const jvNumber = await generateJournalNumber(orgId);

  let journalEntryId = "";

  await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber: jvNumber,
        entryDate: new Date(),
        description: `Customer Payment Received`,
        referenceType: "customer_payment",
        referenceId: paymentId,
        status: "posted",
        sourceType: "payment",
        createdBy: userId,
        postedAt: new Date(),
      })
      .returning();

    journalEntryId = entry.id;

    await tx.insert(journalEntryLines).values([
      // DR: Cash / Bank
      {
        orgId,
        journalEntryId: entry.id,
        accountId: cashBankAccount.id,
        debitAmount: amount.toFixed(2),
        creditAmount: "0.00",
        description: `Payment received via ${paymentMethod}`,
      },
      // CR: Accounts Receivable
      {
        orgId,
        journalEntryId: entry.id,
        accountId: arAccount.id,
        debitAmount: "0.00",
        creditAmount: amount.toFixed(2),
        description: "Accounts Receivable cleared",
      },
    ]);

    // Invoice update — paid/partial
    const inv = await tx.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, orgId)
      ),
    });

    if (inv) {
      const newReceived = Number(inv.receivedAmount) + amount;
      const newBalance = Number(inv.netAmount) - newReceived;
      const newStatus =
        newBalance <= 0
          ? "paid"
          : newBalance < Number(inv.netAmount)
          ? "partial"
          : inv.status;

      await tx
        .update(invoices)
        .set({
          receivedAmount: newReceived.toFixed(2),
          balanceAmount: Math.max(0, newBalance).toFixed(2),
          status: newStatus,
        })
        .where(eq(invoices.id, invoiceId));
    }

    // Customer balance reduce
    await tx
      .update(customers)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(customers.id, customerId));

    // Journal entry ID save on payment
    await tx
      .update(customerPayments)
      .set({ journalEntryId: entry.id })
      .where(eq(customerPayments.id, paymentId));

    // Account balances
    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(chartOfAccounts.id, cashBankAccount.id));

    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(chartOfAccounts.id, arAccount.id));
  });

  return journalEntryId;
}

// ─────────────────────────────────────────
// EXPENSE POSTING — Double Entry
//
// DR: Expense Account        (amount)
//     CR: Cash / Bank        (amount)
// ─────────────────────────────────────────

export async function postExpenseToLedger(
  orgId: string,
  expenseId: string,
  expenseAccountId: string,
  paidFromAccountId: string,
  amount: number,
  description: string,
  userId: string
): Promise<string> {
  const jvNumber = await generateJournalNumber(orgId);
  let journalEntryId = "";

  await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber: jvNumber,
        entryDate: new Date(),
        description: description || "Expense Posted",
        referenceType: "expense",
        referenceId: expenseId,
        status: "posted",
        sourceType: "expense",
        createdBy: userId,
        postedAt: new Date(),
      })
      .returning();

    journalEntryId = entry.id;

    await tx.insert(journalEntryLines).values([
      // DR: Expense Account
      {
        orgId,
        journalEntryId: entry.id,
        accountId: expenseAccountId,
        debitAmount: amount.toFixed(2),
        creditAmount: "0.00",
        description: description,
      },
      // CR: Cash / Bank
      {
        orgId,
        journalEntryId: entry.id,
        accountId: paidFromAccountId,
        debitAmount: "0.00",
        creditAmount: amount.toFixed(2),
        description: "Paid from account",
      },
    ]);

    // Account balances
    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(chartOfAccounts.id, expenseAccountId));

    await tx
      .update(chartOfAccounts)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(chartOfAccounts.id, paidFromAccountId));
  });

  return journalEntryId;
}

// ─────────────────────────────────────────
// TRIAL BALANCE
// ─────────────────────────────────────────

export async function getTrialBalance(orgId: string) {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.orgId, orgId),
      eq(chartOfAccounts.isActive, true)
    ),
    orderBy: [chartOfAccounts.code],
  });

  const lines = await db
    .select({
      accountId: journalEntryLines.accountId,
      totalDebit: sql<string>`coalesce(sum(${journalEntryLines.debitAmount}), 0)`,
      totalCredit: sql<string>`coalesce(sum(${journalEntryLines.creditAmount}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id)
    )
    .where(
      and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntries.status, "posted")
      )
    )
    .groupBy(journalEntryLines.accountId);

  const lineMap = new Map(lines.map((l) => [l.accountId, l]));

  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  const trialBalanceRows = accounts
    .map((account) => {
      const ledger = lineMap.get(account.id);
      const debit = Number(ledger?.totalDebit ?? 0);
      const credit = Number(ledger?.totalCredit ?? 0);

      if (debit === 0 && credit === 0) return null;

      grandTotalDebit += debit;
      grandTotalCredit += credit;

      return {
        code: account.code,
        name: account.name,
        type: account.type,
        debit: debit > 0 ? debit : null,
        credit: credit > 0 ? credit : null,
      };
    })
    .filter(Boolean);

  return {
    rows: trialBalanceRows,
    totalDebit: grandTotalDebit,
    totalCredit: grandTotalCredit,
    isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
  };
}

// ─────────────────────────────────────────
// PROFIT & LOSS STATEMENT
// ─────────────────────────────────────────

export async function getProfitAndLoss(
  orgId: string,
  fromDate: string,
  toDate: string
) {
  const lines = await db
    .select({
      accountId: journalEntryLines.accountId,
      totalDebit: sql<string>`coalesce(sum(${journalEntryLines.debitAmount}), 0)`,
      totalCredit: sql<string>`coalesce(sum(${journalEntryLines.creditAmount}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id)
    )
    .where(
      and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.entryDate} >= ${fromDate}`,
        sql`${journalEntries.entryDate} <= ${toDate}`
      )
    )
    .groupBy(journalEntryLines.accountId);

  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.orgId, orgId),
      eq(chartOfAccounts.isActive, true)
    ),
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  let totalRevenue = 0;
  let totalExpense = 0;

  const revenue: { name: string; amount: number }[] = [];
  const expenses: { name: string; amount: number }[] = [];

  for (const line of lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    const debit = Number(line.totalDebit);
    const credit = Number(line.totalCredit);

    if (account.type === "income") {
      const amount = credit - debit;
      if (amount !== 0) {
        revenue.push({ name: account.name, amount });
        totalRevenue += amount;
      }
    } else if (account.type === "expense") {
      const amount = debit - credit;
      if (amount !== 0) {
        expenses.push({ name: account.name, amount });
        totalExpense += amount;
      }
    }
  }

  const netProfit = totalRevenue - totalExpense;

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpense,
    netProfit,
    isProfit: netProfit >= 0,
    fromDate,
    toDate,
  };
}

// ─────────────────────────────────────────
// BALANCE SHEET
// ─────────────────────────────────────────

export async function getBalanceSheet(orgId: string) {
  const lines = await db
    .select({
      accountId: journalEntryLines.accountId,
      totalDebit: sql<string>`coalesce(sum(${journalEntryLines.debitAmount}), 0)`,
      totalCredit: sql<string>`coalesce(sum(${journalEntryLines.creditAmount}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id)
    )
    .where(
      and(
        eq(journalEntryLines.orgId, orgId),
        eq(journalEntries.status, "posted")
      )
    )
    .groupBy(journalEntryLines.accountId);

  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.orgId, orgId),
      eq(chartOfAccounts.isActive, true)
    ),
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  const assets: { name: string; amount: number }[] = [];
  const liabilities: { name: string; amount: number }[] = [];
  const equity: { name: string; amount: number }[] = [];

  for (const line of lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    const debit = Number(line.totalDebit);
    const credit = Number(line.totalCredit);

    if (account.type === "asset") {
      const amount = debit - credit;
      if (amount !== 0) {
        assets.push({ name: account.name, amount });
        totalAssets += amount;
      }
    } else if (account.type === "liability") {
      const amount = credit - debit;
      if (amount !== 0) {
        liabilities.push({ name: account.name, amount });
        totalLiabilities += amount;
      }
    } else if (account.type === "equity") {
      const amount = credit - debit;
      if (amount !== 0) {
        equity.push({ name: account.name, amount });
        totalEquity += amount;
      }
    }
  }

  const isBalanced =
    Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced,
  };
}

// ─────────────────────────────────────────
// PAYROLL POSTING — Double Entry
//
// DR: Salaries Expense       (total gross)
//     CR: Salaries Payable   (net payable)
//     CR: EOBI Payable       (eobi)
//     CR: Income Tax Payable (tax)
// ─────────────────────────────────────────

export async function postPayrollToLedger(
  orgId: string,
  payrollRunId: string,
  totalGross: number,
  totalNet: number,
  totalEobi: number,
  totalIncomeTax: number,
  userId: string
): Promise<string> {
  const salaryExpense = await getSystemAccount(orgId, "salary_expense");
  const salariesPayable = await getSystemAccount(orgId, "salaries_payable");
  const eobiPayable = await getSystemAccount(orgId, "eobi_payable");
  const incomeTaxPayable = await getSystemAccount(orgId, "income_tax_payable");

  const jvNumber = await generateJournalNumber(orgId);
  let journalEntryId = "";

  await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber: jvNumber,
        entryDate: new Date(),
        description: "Payroll Posted",
        referenceType: "payroll",
        referenceId: payrollRunId,
        status: "posted",
        sourceType: "payroll",
        createdBy: userId,
        postedAt: new Date(),
      })
      .returning();

    journalEntryId = entry.id;

    const lines = [
      // DR: Salaries Expense
      {
        orgId,
        journalEntryId: entry.id,
        accountId: salaryExpense.id,
        debitAmount: totalGross.toFixed(2),
        creditAmount: "0.00",
        description: "Salaries Expense",
      },
      // CR: Net Salaries Payable
      {
        orgId,
        journalEntryId: entry.id,
        accountId: salariesPayable.id,
        debitAmount: "0.00",
        creditAmount: totalNet.toFixed(2),
        description: "Net Salaries Payable",
      },
    ];

    if (totalEobi > 0) {
      lines.push({
        orgId,
        journalEntryId: entry.id,
        accountId: eobiPayable.id,
        debitAmount: "0.00",
        creditAmount: totalEobi.toFixed(2),
        description: "EOBI Payable",
      });
    }

    if (totalIncomeTax > 0) {
      lines.push({
        orgId,
        journalEntryId: entry.id,
        accountId: incomeTaxPayable.id,
        debitAmount: "0.00",
        creditAmount: totalIncomeTax.toFixed(2),
        description: "Income Tax Payable",
      });
    }

    await tx.insert(journalEntryLines).values(lines);

    // Payroll run update
    await tx
      .update(payrollRuns)
      .set({ journalEntryId: entry.id, status: "Posted" })
      .where(eq(payrollRuns.id, payrollRunId));
  });

  return journalEntryId;
}

// ─────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────

export function validateJournalBalance(
  lines: { debitAmount: string; creditAmount: string }[]
): boolean {
  const totalDebit = lines.reduce(
    (sum, l) => sum + Number(l.debitAmount),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + Number(l.creditAmount),
    0
  );
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
  taxPercent: number
): {
  lineSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
} {
  const lineSubtotal = roundCurrency(quantity * unitPrice);
  const discountAmount = roundCurrency((lineSubtotal * discountPercent) / 100);
  const taxableAmount = lineSubtotal - discountAmount;
  const taxAmount = roundCurrency((taxableAmount * taxPercent) / 100);
  const lineTotal = taxableAmount + taxAmount;

  return {
    lineSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}