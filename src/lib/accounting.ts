import { db } from "@/db";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  payrollRuns,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ─────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────

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

  return { lineSubtotal, discountAmount, taxableAmount, taxAmount, lineTotal };
}

export function validateJournalBalance(
  lines: { debitAmount: string; creditAmount: string }[]
): boolean {
  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debitAmount), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.creditAmount), 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
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
    .where(eq(journalEntryLines.orgId, orgId))
    .groupBy(journalEntryLines.accountId);

  const lineMap = new Map(lines.map((l) => [l.accountId, l]));

  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  const rows = accounts
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
    rows,
    totalDebit: grandTotalDebit,
    totalCredit: grandTotalCredit,
    isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
  };
}

// ─────────────────────────────────────────
// PROFIT & LOSS
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
        sql`${journalEntries.entryDate} >= ${new Date(fromDate)}`,
        sql`${journalEntries.entryDate} <= ${new Date(toDate)}`
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
      if (amount !== 0) { revenue.push({ name: account.name, amount }); totalRevenue += amount; }
    } else if (account.type === "expense") {
      const amount = debit - credit;
      if (amount !== 0) { expenses.push({ name: account.name, amount }); totalExpense += amount; }
    }
  }

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
    isProfit: totalRevenue >= totalExpense,
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
    .where(eq(journalEntryLines.orgId, orgId))
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
      if (amount !== 0) { assets.push({ name: account.name, amount }); totalAssets += amount; }
    } else if (account.type === "liability") {
      const amount = credit - debit;
      if (amount !== 0) { liabilities.push({ name: account.name, amount }); totalLiabilities += amount; }
    } else if (account.type === "equity") {
      const amount = credit - debit;
      if (amount !== 0) { equity.push({ name: account.name, amount }); totalEquity += amount; }
    }
  }

  return {
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

// ─────────────────────────────────────────
// PAYROLL POSTING — Double Entry
// DR: Salaries Expense     (gross)
//   CR: Salaries Payable   (net)
//   CR: EOBI Payable       (eobi)
//   CR: Income Tax Payable (tax)
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
  const findAccount = async (subType: string) => {
    const [acc] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.subType, subType)))
      .limit(1);
    if (!acc) throw new Error(`Account not found: ${subType}`);
    return acc;
  };

  const salaryExpense   = await findAccount("salary_expense");
  const salariesPayable = await findAccount("salaries_payable");
  const eobiPayable     = await findAccount("eobi_payable");
  const incomeTaxPayable = await findAccount("income_tax_payable");

  const year = new Date().getFullYear();
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(eq(journalEntries.orgId, orgId));
  const jvNumber = `JV-${year}-${String(Number(countResult.count) + 1).padStart(5, "0")}`;

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
      { orgId, journalEntryId: entry.id, accountId: salaryExpense.id, debitAmount: totalGross.toFixed(2), creditAmount: "0.00", description: "Salaries Expense" },
      { orgId, journalEntryId: entry.id, accountId: salariesPayable.id, debitAmount: "0.00", creditAmount: totalNet.toFixed(2), description: "Net Salaries Payable" },
    ];

    if (totalEobi > 0) lines.push({ orgId, journalEntryId: entry.id, accountId: eobiPayable.id, debitAmount: "0.00", creditAmount: totalEobi.toFixed(2), description: "EOBI Payable" });
    if (totalIncomeTax > 0) lines.push({ orgId, journalEntryId: entry.id, accountId: incomeTaxPayable.id, debitAmount: "0.00", creditAmount: totalIncomeTax.toFixed(2), description: "Income Tax Payable" });

    await tx.insert(journalEntryLines).values(lines);

    await tx.update(payrollRuns)
      .set({ journalEntryId: entry.id, status: "Posted" })
      .where(eq(payrollRuns.id, payrollRunId));
  });

  return journalEntryId;
}