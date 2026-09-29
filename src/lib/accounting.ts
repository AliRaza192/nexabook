import { db } from "@/db";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  payrollRuns,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { postTransaction, resolveAccount } from "./accounting/posting-engine";

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
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      sql`${journalEntries.status} = 'posted'`,
    ))
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
      // Compute net balance based on account type
      const normalDebit = ["asset", "expense"].includes(account.type || "");
      const netBalance = normalDebit ? debit - credit : credit - debit;
      if (Math.abs(netBalance) < 0.01) return null;
      grandTotalDebit += netBalance > 0 ? netBalance : 0;
      grandTotalCredit += netBalance < 0 ? Math.abs(netBalance) : 0;
      return {
        code: account.code,
        name: account.name,
        type: account.type,
        debit: netBalance > 0 ? netBalance : null,
        credit: netBalance < 0 ? Math.abs(netBalance) : null,
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
        sql`${journalEntries.entryDate} <= ${new Date(toDate)}`,
        sql`${journalEntries.status} = 'posted'`,
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

// FIX (2026 review): previously only summed asset/liability/equity accounts.
// Under double-entry, every transaction balances across ALL account types —
// e.g. "Dr AR / Cr Sales Revenue" increases an asset with no corresponding
// equity/liability line. Excluding income/expense accounts meant Assets could
// never equal Liabilities + Equity once any revenue or expense was posted,
// and totalEquity itself understated the org's real position.
//
// No period-closing mechanism exists in this codebase (confirmed) — net
// income is never swept into retained_earnings. So the correct fix for a
// live/perpetual balance sheet is to fold the full, ever-accumulating net
// income (income − expense, from inception through asOfDate) into equity as
// a single synthetic line. It is explicitly labeled "(Accumulated,
// Unclosed)" rather than "(Current Period)" because, absent closing entries,
// it is not scoped to a period — it is the running total since inception.
export async function getBalanceSheet(orgId: string, asOfDate?: Date) {
  const dateFilter = asOfDate
    ? sql`${journalEntries.entryDate} <= ${asOfDate}`
    : sql`1=1`;

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
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      sql`${journalEntries.status} = 'posted'`,
      dateFilter,
    ))
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
  let accumulatedNetIncome = 0;
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
    } else if (account.type === "income") {
      accumulatedNetIncome += credit - debit;
    } else if (account.type === "expense") {
      accumulatedNetIncome -= debit - credit;
    }
  }

  if (Math.abs(accumulatedNetIncome) >= 0.01) {
    equity.push({ name: "Retained Earnings (Accumulated, Unclosed)", amount: accumulatedNetIncome });
    totalEquity += accumulatedNetIncome;
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
//
// FIX (2026 review): was hand-rolling JE construction with its own
// "JV-{year}-{padded}" number generator, which had the same
// count-based delete-causes-duplicate flaw fixed elsewhere in
// generateJournalEntryNumber(), and used a different number format
// (JV- instead of JE-) than every other journal entry in the system.
// Now routed through the shared postTransaction()/resolveAccount()
// path — consistent numbering, consistent balance validation, and
// tenant-scoped account resolution, matching every other financial
// write in the app.
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
  const journalEntryId = await db.transaction(async (tx) => {
    const salaryExpense = await resolveAccount(tx, orgId, "salary_expense");
    const salariesPayable = await resolveAccount(tx, orgId, "salaries_payable");

    const lines = [
      {
        accountId: salaryExpense.id,
        description: "Salaries Expense",
        debit: totalGross.toFixed(2),
        credit: "0.00",
      },
      {
        accountId: salariesPayable.id,
        description: "Net Salaries Payable",
        debit: "0.00",
        credit: totalNet.toFixed(2),
      },
    ];

    if (totalEobi > 0) {
      const eobiPayable = await resolveAccount(tx, orgId, "eobi_payable");
      lines.push({
        accountId: eobiPayable.id,
        description: "EOBI Payable",
        debit: "0.00",
        credit: totalEobi.toFixed(2),
      });
    }

    if (totalIncomeTax > 0) {
      const incomeTaxPayable = await resolveAccount(tx, orgId, "income_tax_payable");
      lines.push({
        accountId: incomeTaxPayable.id,
        description: "Income Tax Payable",
        debit: "0.00",
        credit: totalIncomeTax.toFixed(2),
      });
    }

    const { journalEntryId: entryId } = await postTransaction(tx, {
      orgId,
      description: "Payroll Posted",
      date: new Date(),
      referenceType: "payroll",
      referenceId: payrollRunId,
      sourceType: "payroll",
      createdBy: userId,
      lines,
    });

    await tx
      .update(payrollRuns)
      .set({ journalEntryId: entryId, status: "Posted" })
      .where(eq(payrollRuns.id, payrollRunId));

    return entryId;
  });

  return journalEntryId;
}