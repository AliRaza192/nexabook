import { journalEntries, journalEntryLines, chartOfAccounts, customers, vendors } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { validateJournalBalance } from "@/lib/accounting";
import { generateJournalEntryNumber } from "@/lib/actions/shared";

export interface JournalLineSpec {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export interface PostTransactionSpec {
  orgId: string;
  description: string;
  date: Date;
  referenceType: string;
  referenceId: string;
  sourceType?: string;
  lines: JournalLineSpec[];
  customerId?: string;
  vendorId?: string;
}

/**
 * Create a balanced, posted journal entry within an existing DB transaction.
 *
 * This is the SINGLE entry point for all JE creation in NexaBook.
 * Every financial mutation (invoice, payment, return, settlement, expense,
 * payroll) must route through here so that:
 *   1. Debits always equal credits (validated before any insert)
 *   2. Entry numbers are generated atomically (no duplicates)
 *   3. Every line carries orgId for tenant isolation
 *   4. The entry is born in "posted" status — never "draft"
 *
 * @param tx  A Drizzle transaction client (or the db object itself outside a tx)
 * @param spec  The journal entry specification
 * @returns The created entry's ID and generated entry number
 */
export async function postTransaction(
  tx: { insert: any; select: any; update: any; delete: any },
  spec: PostTransactionSpec,
): Promise<{ journalEntryId: string; entryNumber: string }> {
  if (spec.lines.length === 0) {
    throw new Error("Journal entry must have at least one line");
  }

  if (!validateJournalBalance(spec.lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))) {
    const totalDebit = spec.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = spec.lines.reduce((s, l) => s + Number(l.credit), 0);
    throw new Error(
      `Journal entry out of balance: debits=${totalDebit.toFixed(2)} credits=${totalCredit.toFixed(2)}`,
    );
  }

  const entryNumber = await generateJournalEntryNumber(spec.orgId);

  const [entry] = await tx
    .insert(journalEntries)
    .values({
      orgId: spec.orgId,
      entryNumber,
      entryDate: spec.date,
      referenceType: spec.referenceType,
      referenceId: spec.referenceId,
      description: spec.description,
      status: "posted",
      sourceType: spec.sourceType || "",
      postedAt: new Date(),
    })
    .returning();

  const lines = spec.lines.map((l) => ({
    orgId: spec.orgId,
    journalEntryId: entry.id,
    accountId: l.accountId,
    description: l.description,
    debitAmount: l.debit,
    creditAmount: l.credit,
  }));

  await tx.insert(journalEntryLines).values(lines);

  // NB-P0-02/03: Atomically update customer/vendor balance from AR/AP lines
  if (spec.customerId || spec.vendorId) {
    const arApAccounts = await tx
      .select({ id: chartOfAccounts.id, subType: chartOfAccounts.subType })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.orgId, spec.orgId),
          sql`${chartOfAccounts.subType} IN ('accounts_receivable', 'accounts_payable')`,
        ),
      );

    const arApIds = new Set(arApAccounts.map((a: { id: string; subType: string | null }) => a.id));
    const arAccountId = arApAccounts.find((a: { id: string; subType: string | null }) => a.subType === "accounts_receivable")?.id;
    const apAccountId = arApAccounts.find((a: { id: string; subType: string | null }) => a.subType === "accounts_payable")?.id;

    if (spec.customerId && arAccountId) {
      const arLines = spec.lines.filter((l) => l.accountId === arAccountId && arApIds.has(l.accountId));
      const netAR = arLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      if (netAR !== 0) {
        await tx
          .update(customers)
          .set({ balance: sql`COALESCE(${customers.balance}, 0) + ${netAR}` })
          .where(and(eq(customers.id, spec.customerId), eq(customers.orgId, spec.orgId)));
      }
    }

    if (spec.vendorId && apAccountId) {
      const apLines = spec.lines.filter((l) => l.accountId === apAccountId && arApIds.has(l.accountId));
      const netAP = apLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
      if (netAP !== 0) {
        await tx
          .update(vendors)
          .set({ balance: sql`GREATEST(COALESCE(${vendors.balance}, 0) + ${netAP}, 0)` })
          .where(and(eq(vendors.id, spec.vendorId), eq(vendors.orgId, spec.orgId)));
      }
    }
  }

  return { journalEntryId: entry.id, entryNumber };
}

/**
 * Reverse a posted journal entry by creating an equal-and-opposite entry.
 *
 * The original entry's status is set to "reversed". The new reversal entry
 * carries referenceType="reversal" and referenceId=<original entry id>.
 * Each original line is mirrored with debit↔credit swapped.
 *
 * @returns The reversal entry's ID and entry number
 */
export async function reverseTransaction(
  tx: { insert: any; select: any; update: any; delete: any },
  originalEntryId: string,
  description: string,
  reversalDate: Date,
  orgId: string,
): Promise<{ journalEntryId: string; entryNumber: string }> {
  const [original] = await tx
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, originalEntryId))
    .limit(1);

  if (!original) throw new Error("Journal entry not found for reversal");
  if (original.status === "reversed") {
    throw new Error("Journal entry is already reversed");
  }

  const originalLines = await tx
    .select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.journalEntryId, originalEntryId));

  const reversalLines: JournalLineSpec[] = originalLines.map((l: any) => ({
    accountId: l.accountId,
    description: `Reversal: ${l.description}`,
    debit: l.creditAmount,
    credit: l.debitAmount,
  }));

  const result = await postTransaction(tx, {
    orgId,
    description,
    date: reversalDate,
    referenceType: "reversal",
    referenceId: originalEntryId,
    sourceType: original.sourceType || "",
    lines: reversalLines,
  });

  await tx
    .update(journalEntries)
    .set({ status: "reversed" })
    .where(eq(journalEntries.id, originalEntryId));

  return result;
}

/**
 * Resolve a chart-of-accounts entry by subType for the given org.
 * Throws if no matching account exists.
 */
export async function resolveAccount(
  tx: { select: any },
  orgId: string,
  subType: string,
): Promise<{ id: string; name: string; type: string; subType: string | null }> {
  const [account] = await tx
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.subType, subType),
      ),
    )
    .limit(1);

  if (!account) {
    throw new Error(`Chart of accounts: no account with subType "${subType}" for this organization`);
  }
  return account;
}
