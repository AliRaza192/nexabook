"use server";

import { db } from "@/db";
import {
  bankAccounts, bankDeposits, fundsTransfers, miscContacts,
  auditLogs, journalEntries, journalEntryLines,
  chartOfAccounts,
} from "@/db/schema";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, requireRole, generateJournalEntryNumber } from "./shared";
import { checkPeriodLocked } from "./fiscal-periods";
import { postTransaction, resolveAccount } from "../accounting/posting-engine";
import { captureException } from "@/lib/error-handler";

export type MiscContactType = 'capital_investment' | 'loan_proceeds' | 'loan_repayment' | 'owner_withdrawal' | 'dividend' | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'credit_card' | 'other';

// ==========================================
// BANK ACCOUNTS
// ==========================================

export interface BankAccountFormData {
  accountName: string;
  iban?: string;
  accountNumber: string;
  branchName?: string;
  bankName?: string;
  accountType: string;
  openingBalance: string;
  openingBalanceDate?: string;
  currency?: string;
  notes?: string;
}

/**
 * Get bank accounts from Chart of Accounts (asset type with Bank/Cash in name or code)
 */
export async function getBankCOAAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.type, "asset"),
        eq(chartOfAccounts.isActive, true),
        or(
          sql`${chartOfAccounts.subType} IN ('bank', 'cash')`,
          ilike(chartOfAccounts.code, "%bank%"),
          ilike(chartOfAccounts.code, "%cash%"),
        )!
      ))
      .orderBy(chartOfAccounts.name);

    return { success: true, data: accounts };
  } catch (error) {
    captureException(error, { module: "banking", function: "getBankCOAAccounts" });
    return { success: false, error: "Failed to fetch bank accounts from COA" };
  }
}

export async function getBankAccounts(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(bankAccounts.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(bankAccounts.accountName, `%${searchQuery}%`),
          ilike(bankAccounts.accountNumber, `%${searchQuery}%`),
          ilike(bankAccounts.bankName, `%${searchQuery}%`),
        )!
      );
    }

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(and(...conditions))
      .orderBy(bankAccounts.accountName);

    return { success: true, data: accounts };
  } catch (error) {
    captureException(error, { module: "banking", function: "getBankAccounts" });
    return { success: false, error: "Failed to fetch bank accounts" };
  }
}

// FIX (2026 review): added requireRole (was open to any authenticated user
// — creating a bank account also posts an opening-balance JE).
export async function addBankAccount(data: BankAccountFormData) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.accountName || !data.accountNumber) {
      return { success: false, error: "Account name and number are required" };
    }

    const openingBalance = parseFloat(data.openingBalance || "0");

    const newAccount = await db.transaction(async (tx) => {
      const [codeRow] = await tx
        .select({ maxCode: sql<string | null>`MAX(${chartOfAccounts.code}::int)` })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.orgId, orgId), sql`${chartOfAccounts.code} ~ '^[0-9]+$'`));

      const nextCode = String(Number(codeRow?.maxCode || "1089") + 1);

      const [bankCoa] = await tx
        .insert(chartOfAccounts)
        .values({
          orgId,
          code: nextCode,
          name: `Bank - ${data.accountName}`,
          type: "asset",
          subType: null,
          isSystemAccount: false,
          description: `Sub-ledger GL account for bank account ${data.accountNumber}`,
          isActive: true,
          balance: "0",
        })
        .returning();

      const [created] = await tx
        .insert(bankAccounts)
        .values({
          orgId,
          accountName: data.accountName,
          iban: data.iban,
          accountNumber: data.accountNumber,
          branchName: data.branchName,
          bankName: data.bankName,
          accountType: data.accountType,
          coaAccountId: bankCoa.id,
          openingBalance: openingBalance.toFixed(2),
          currentBalance: openingBalance.toFixed(2),
          currency: data.currency || "PKR",
          notes: data.notes,
          approvalStatus: "approved",
          approvedBy: (await auth()).userId || "system",
          approvedAt: new Date(),
        })
        .returning();

      if (openingBalance !== 0) {
        const equityAcc = await resolveAccount(tx, orgId, "opening_balance_equity");

        await postTransaction(tx, {
          orgId,
          description: `Opening balance for ${data.accountName}`,
          date: new Date(data.openingBalanceDate || new Date()),
          referenceType: "bank_opening_balance",
          referenceId: created.id,
          sourceType: "bank_account",
          lines: openingBalance > 0
            ? [
                { accountId: bankCoa.id, description: "Bank opening balance", debit: openingBalance.toFixed(2), credit: "0" },
                { accountId: equityAcc.id, description: "Opening balance equity", debit: "0", credit: openingBalance.toFixed(2) },
              ]
            : [
                { accountId: equityAcc.id, description: "Opening balance equity", debit: Math.abs(openingBalance).toFixed(2), credit: "0" },
                { accountId: bankCoa.id, description: "Bank opening balance (overdrawn)", debit: "0", credit: Math.abs(openingBalance).toFixed(2) },
              ],
        });
      }

      return created;
    });

    revalidatePath("/accounts/banking");
    return { success: true, data: newAccount, message: "Bank account added successfully" };
  } catch (error) {
    captureException(error, { module: "banking", function: "addBankAccount" });
    return { success: false, error: "Failed to add bank account" };
  }
}

export async function updateBankAccount(accountId: string, data: Partial<BankAccountFormData>) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Partial<typeof bankAccounts.$inferInsert> = {};
    if (data.accountName !== undefined) updateData.accountName = data.accountName;
    if (data.iban !== undefined) updateData.iban = data.iban;
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber;
    if (data.branchName !== undefined) updateData.branchName = data.branchName;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.accountType !== undefined) updateData.accountType = data.accountType;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
      .update(bankAccounts)
      .set(updateData)
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.orgId, orgId)))
      .returning();

    if (!updated) return { success: false, error: "Bank account not found" };

    revalidatePath("/accounts/banking");
    return { success: true, data: updated, message: "Bank account updated successfully" };
  } catch (error) {
    captureException(error, { module: "banking", function: "updateBankAccount" });
    return { success: false, error: "Failed to update bank account" };
  }
}

// FIX (2026 review): added requireRole.
export async function approveBankAccount(accountId: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    const [updated] = await db
      .update(bankAccounts)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.orgId, orgId)))
      .returning();

    if (!updated) return { success: false, error: "Bank account not found" };

    revalidatePath("/accounts/banking");
    return { success: true, message: "Bank account approved" };
  } catch (error) {
    captureException(error, { module: "banking", function: "approveBankAccount" });
    return { success: false, error: "Failed to approve bank account" };
  }
}

// ==========================================
// BANK DEPOSITS
// ==========================================

export interface BankDepositFormData {
  bankAccountId: string;
  depositType: "cash" | "cheque";
  amount: string;
  depositDate: string;
  reference?: string;
  chequeNumber?: string;
  chequeDate?: string;
  drawnFrom?: string;
  notes?: string;
}

export async function getBankDeposits(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(bankDeposits.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(bankDeposits.depositNumber, `%${searchQuery}%`),
          ilike(bankDeposits.reference, `%${searchQuery}%`),
          ilike(bankDeposits.drawnFrom, `%${searchQuery}%`),
        )!
      );
    }

    const deposits = await db
      .select()
      .from(bankDeposits)
      .where(and(...conditions))
      .orderBy(desc(bankDeposits.depositDate));

    return { success: true, data: deposits };
  } catch (error) {
    captureException(error, { module: "banking", function: "getBankDeposits" });
    return { success: false, error: "Failed to fetch bank deposits" };
  }
}

// FIX (2026 review): number generation no longer fetches the entire table
// just to count rows — uses generateJournalEntryNumber-style MAX-parse +
// retry instead (matches migration 0005's unique constraint on this table).
async function generateBankDepositNumber(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [latest] = await db
        .select({ depositNumber: bankDeposits.depositNumber })
        .from(bankDeposits)
        .where(eq(bankDeposits.orgId, orgId))
        .orderBy(desc(bankDeposits.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (latest?.depositNumber) {
        const match = latest.depositNumber.match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const jitter = attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      return `BD-${String(nextNumber + jitter).padStart(5, "0")}`;
    } catch {
      if (attempt < 4) await new Promise(r => setTimeout(r, Math.random() * 100 * (attempt + 1)));
    }
  }
  return `BD-${String(Date.now() % 100000).padStart(5, "0")}`;
}

export async function addBankDeposit(data: BankDepositFormData) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.bankAccountId || !data.amount || !data.depositDate) {
      return { success: false, error: "Bank account, amount, and date are required" };
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Invalid deposit amount" };
    }

    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);

    if (!bankAccount) {
      return { success: false, error: "Bank account not found" };
    }

    const depositNumber = await generateBankDepositNumber(orgId);

    const [deposit] = await db
      .insert(bankDeposits)
      .values({
        orgId,
        depositNumber,
        bankAccountId: data.bankAccountId,
        depositType: data.depositType,
        amount: data.amount,
        depositDate: new Date(data.depositDate),
        reference: data.reference,
        chequeNumber: data.chequeNumber,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
        drawnFrom: data.drawnFrom,
        notes: data.notes,
        approvalStatus: "pending_approval",
      })
      .returning();

    revalidatePath("/accounts/banking");
    return { success: true, data: deposit, message: "Bank deposit recorded successfully" };
  } catch (error) {
    captureException(error, { module: "banking", function: "addBankDeposit" });
    return { success: false, error: "Failed to record bank deposit" };
  }
}

// FIX (2026 review):
//  - The findAccountBySubType(orgId, "asset", "Bank") / (orgId, "asset",
//    "Cash") calls here had their arguments swapped relative to the
//    function's (orgId, subType, type) signature — subType="asset" and
//    type="Bank"/"Cash" never matches any row (type values are lowercase
//    "asset", not "Bank"/"Cash"), so this always resolved to an empty
//    string, which the NOT NULL, FK-constrained journalEntryLines.accountId
//    column would reject outright — every deposit approval crashed.
//    Replaced with resolveAccount(), which is also now the single
//    consistent account-resolution path used everywhere else.
//  - Balance update now uses atomic SQL arithmetic instead of
//    read-then-write, closing a lost-update race between concurrent
//    approvals on the same bank account.
//  - JE construction routed through postTransaction() (was hand-rolled
//    with a non-retrying, full-table-scan entry number).
export async function approveBankDeposit(depositId: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [deposit] = await db
      .select()
      .from(bankDeposits)
      .where(and(eq(bankDeposits.id, depositId), eq(bankDeposits.orgId, orgId)))
      .limit(1);

    if (!deposit) return { success: false, error: "Deposit not found" };
    if (deposit.approvalStatus === "approved") return { success: false, error: "Deposit already approved" };

    const locked = await checkPeriodLocked(new Date(deposit.depositDate));
    if (locked) return { success: false, error: "Cannot approve deposit in a locked fiscal period" };

    const { userId } = await auth();

    await db.transaction(async (tx) => {
      await tx
        .update(bankAccounts)
        .set({ currentBalance: sql`${bankAccounts.currentBalance}::numeric + ${deposit.amount}::numeric` })
        .where(and(eq(bankAccounts.id, deposit.bankAccountId), eq(bankAccounts.orgId, orgId)));

      await tx
        .update(bankDeposits)
        .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
        .where(eq(bankDeposits.id, depositId));

      const [depositBank] = await tx
        .select({ coaAccountId: bankAccounts.coaAccountId })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.id, deposit.bankAccountId), eq(bankAccounts.orgId, orgId)))
        .limit(1);

      const bankAcc = depositBank?.coaAccountId
        ? { id: depositBank.coaAccountId }
        : await resolveAccount(tx, orgId, "bank");
      const cashAcc = await resolveAccount(tx, orgId, "cash");

      await postTransaction(tx, {
        orgId,
        description: `Bank deposit ${deposit.depositNumber}`,
        date: deposit.depositDate,
        referenceType: "bank_deposit",
        referenceId: deposit.id,
        sourceType: "bank_deposit",
        createdBy: userId || undefined,
        lines: [
          { accountId: bankAcc.id, description: "Bank deposit", debit: deposit.amount, credit: "0" },
          { accountId: cashAcc.id, description: "Cash deposited", debit: "0", credit: deposit.amount },
        ],
      });
    });

    revalidatePath("/accounts/banking");
    return { success: true, message: "Bank deposit approved and posted" };
  } catch (error) {
    captureException(error, { module: "banking", function: "approveBankDeposit" });
    return { success: false, error: "Failed to approve bank deposit" };
  }
}

// ==========================================
// FUNDS TRANSFERS
// ==========================================

export interface FundsTransferFormData {
  transferType: "bank_to_bank" | "cash_to_bank" | "bank_to_cash";
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: string;
  transferDate: string;
  reference?: string;
  notes?: string;
}

export async function getFundsTransfers(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(fundsTransfers.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(fundsTransfers.transferNumber, `%${searchQuery}%`),
          ilike(fundsTransfers.reference, `%${searchQuery}%`),
        )!
      );
    }

    const transfers = await db
      .select()
      .from(fundsTransfers)
      .where(and(...conditions))
      .orderBy(desc(fundsTransfers.transferDate));

    return { success: true, data: transfers };
  } catch (error) {
    captureException(error, { module: "banking", function: "getFundsTransfers" });
    return { success: false, error: "Failed to fetch funds transfers" };
  }
}

async function generateFundsTransferNumber(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [latest] = await db
        .select({ transferNumber: fundsTransfers.transferNumber })
        .from(fundsTransfers)
        .where(eq(fundsTransfers.orgId, orgId))
        .orderBy(desc(fundsTransfers.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (latest?.transferNumber) {
        const match = latest.transferNumber.match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const jitter = attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      return `FT-${String(nextNumber + jitter).padStart(5, "0")}`;
    } catch {
      if (attempt < 4) await new Promise(r => setTimeout(r, Math.random() * 100 * (attempt + 1)));
    }
  }
  return `FT-${String(Date.now() % 100000).padStart(5, "0")}`;
}

// NOTE (2026 review, flagged not fixed): balance sufficiency is checked
// here at creation time, but the actual deduction happens later at
// approval time. Between creation and approval, other approved
// transactions could change the balance, making this check stale. A
// re-check at approval time (added below) is the real guard; this one is
// just an early, best-effort UX check.
export async function addFundsTransfer(data: FundsTransferFormData) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.fromBankAccountId || !data.toBankAccountId || !data.amount) {
      return { success: false, error: "From account, to account, and amount are required" };
    }

    if (data.fromBankAccountId === data.toBankAccountId) {
      return { success: false, error: "From and to accounts must be different" };
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Invalid transfer amount" };
    }

    const [fromAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, data.fromBankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);

    if (!fromAccount) return { success: false, error: "Source account not found" };

    const fromBalance = parseFloat(fromAccount.currentBalance || "0");
    if (fromBalance < amount) {
      return { success: false, error: `Insufficient balance. Available: ${fromBalance.toFixed(2)}` };
    }

    const transferNumber = await generateFundsTransferNumber(orgId);

    const [transfer] = await db
      .insert(fundsTransfers)
      .values({
        orgId,
        transferNumber,
        transferType: data.transferType,
        fromBankAccountId: data.fromBankAccountId,
        toBankAccountId: data.toBankAccountId,
        amount: data.amount,
        transferDate: new Date(data.transferDate),
        reference: data.reference,
        notes: data.notes,
        approvalStatus: "pending_approval",
      })
      .returning();

    revalidatePath("/accounts/banking");
    return { success: true, data: transfer, message: "Funds transfer recorded successfully" };
  } catch (error) {
    captureException(error, { module: "banking", function: "addFundsTransfer" });
    return { success: false, error: "Failed to record funds transfer" };
  }
}

// FIX (2026 review): balance re-checked at approval time (creation-time
// check can go stale — see note on addFundsTransfer). Balance updates now
// atomic SQL arithmetic instead of read-then-write. JE routed through
// postTransaction().
export async function approveFundsTransfer(transferId: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    const [transfer] = await db
      .select()
      .from(fundsTransfers)
      .where(and(eq(fundsTransfers.id, transferId), eq(fundsTransfers.orgId, orgId)))
      .limit(1);

    if (!transfer) return { success: false, error: "Transfer not found" };
    if (transfer.approvalStatus === "approved") return { success: false, error: "Transfer already approved" };

    const locked = await checkPeriodLocked(new Date(transfer.transferDate));
    if (locked) return { success: false, error: "Cannot approve transfer in a locked fiscal period" };

    await db.transaction(async (tx) => {
      const [fromAcct] = await tx
        .select({ currentBalance: bankAccounts.currentBalance, coaAccountId: bankAccounts.coaAccountId })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.id, transfer.fromBankAccountId), eq(bankAccounts.orgId, orgId)))
        .for("update");

      if (parseFloat(fromAcct?.currentBalance || "0") < parseFloat(transfer.amount)) {
        throw new Error("Insufficient balance in source account at approval time");
      }

      const [toAcct] = await tx
        .select({ coaAccountId: bankAccounts.coaAccountId })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.id, transfer.toBankAccountId), eq(bankAccounts.orgId, orgId)))
        .limit(1);

      if (!toAcct) {
        throw new Error("Destination bank account not found");
      }

      await tx
        .update(bankAccounts)
        .set({ currentBalance: sql`${bankAccounts.currentBalance}::numeric - ${transfer.amount}::numeric` })
        .where(and(eq(bankAccounts.id, transfer.fromBankAccountId), eq(bankAccounts.orgId, orgId)));

      await tx
        .update(bankAccounts)
        .set({ currentBalance: sql`${bankAccounts.currentBalance}::numeric + ${transfer.amount}::numeric` })
        .where(and(eq(bankAccounts.id, transfer.toBankAccountId), eq(bankAccounts.orgId, orgId)));

      await tx
        .update(fundsTransfers)
        .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
        .where(eq(fundsTransfers.id, transferId));

      const sharedBankAcc = !fromAcct?.coaAccountId || !toAcct.coaAccountId
        ? await resolveAccount(tx, orgId, "bank")
        : null;
      const fromCoaId = fromAcct?.coaAccountId || sharedBankAcc?.id;
      const toCoaId = toAcct.coaAccountId || sharedBankAcc?.id;

      if (!fromCoaId || !toCoaId) {
        throw new Error("Bank GL account not found");
      }

      await postTransaction(tx, {
        orgId,
        description: `Funds transfer ${transfer.transferNumber}`,
        date: transfer.transferDate,
        referenceType: "funds_transfer",
        referenceId: transfer.id,
        sourceType: "funds_transfer",
        createdBy: userId || undefined,
        lines: [
          { accountId: toCoaId, description: "Funds transfer to", debit: transfer.amount, credit: "0" },
          { accountId: fromCoaId, description: "Funds transfer from", debit: "0", credit: transfer.amount },
        ],
      });
    });

    revalidatePath("/accounts/banking");
    return { success: true, message: "Funds transfer approved and posted" };
  } catch (error) {
    captureException(error, { module: "banking", function: "approveFundsTransfer" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve funds transfer" };
  }
}

// ==========================================
// OTHER COLLECTIONS & PAYMENTS (MISC CONTACTS)
// ==========================================

export interface MiscContactFormData {
  contactType: MiscContactType;
  partyName: string;
  amount: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  transactionDate: string;
  reference?: string;
  description?: string;
}

export async function getMiscContacts(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(miscContacts.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(miscContacts.referenceNumber, `%${searchQuery}%`),
          ilike(miscContacts.partyName, `%${searchQuery}%`),
          ilike(miscContacts.description, `%${searchQuery}%`),
        )!
      );
    }

    const contacts = await db
      .select()
      .from(miscContacts)
      .where(and(...conditions))
      .orderBy(desc(miscContacts.transactionDate));

    return { success: true, data: contacts };
  } catch (error) {
    captureException(error, { module: "banking", function: "getMiscContacts" });
    return { success: false, error: "Failed to fetch misc contacts" };
  }
}

async function generateMiscContactNumber(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [latest] = await db
        .select({ referenceNumber: miscContacts.referenceNumber })
        .from(miscContacts)
        .where(eq(miscContacts.orgId, orgId))
        .orderBy(desc(miscContacts.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (latest?.referenceNumber) {
        const match = latest.referenceNumber.match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const jitter = attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      return `MC-${String(nextNumber + jitter).padStart(5, "0")}`;
    } catch {
      if (attempt < 4) await new Promise(r => setTimeout(r, Math.random() * 100 * (attempt + 1)));
    }
  }
  return `MC-${String(Date.now() % 100000).padStart(5, "0")}`;
}

export async function addMiscContact(data: MiscContactFormData) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.partyName || !data.amount || !data.transactionDate) {
      return { success: false, error: "Party name, amount, and date are required" };
    }

    const referenceNumber = await generateMiscContactNumber(orgId);

    const [contact] = await db
      .insert(miscContacts)
      .values({
        orgId,
        referenceNumber,
        contactType: data.contactType,
        partyName: data.partyName,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId || null,
        transactionDate: new Date(data.transactionDate),
        reference: data.reference,
        description: data.description,
        approvalStatus: "pending_approval",
      })
      .returning();

    revalidatePath("/accounts/banking");
    return { success: true, data: contact, message: "Transaction recorded successfully" };
  } catch (error) {
    captureException(error, { module: "banking", function: "addMiscContact" });
    return { success: false, error: "Failed to record transaction" };
  }
}

// FIX (2026 review): this previously updated bankAccounts.currentBalance
// directly with NO journal entry at all — capital investments, loan
// proceeds/repayments, owner withdrawals, and dividends never reached the
// GL, permanently diverging bank-account balances from the books. Also
// added the missing requireRole and checkPeriodLocked (present on every
// sibling approval function but absent here), and switched the balance
// update to atomic SQL arithmetic.
export async function approveMiscContact(contactId: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [contact] = await db
      .select()
      .from(miscContacts)
      .where(and(eq(miscContacts.id, contactId), eq(miscContacts.orgId, orgId)))
      .limit(1);

    if (!contact) return { success: false, error: "Transaction not found" };
    if (contact.approvalStatus === "approved") return { success: false, error: "Already approved" };

    const locked = await checkPeriodLocked(new Date(contact.transactionDate));
    if (locked) return { success: false, error: "Cannot approve transaction in a locked fiscal period" };

    const { userId } = await auth();
    const isIncome = ["capital_investment", "loan_proceeds"].includes(contact.contactType);

    await db.transaction(async (tx) => {
      if (contact.bankAccountId) {
        await tx
          .update(bankAccounts)
          .set({
            currentBalance: isIncome
              ? sql`${bankAccounts.currentBalance}::numeric + ${contact.amount}::numeric`
              : sql`${bankAccounts.currentBalance}::numeric - ${contact.amount}::numeric`,
          })
          .where(and(eq(bankAccounts.id, contact.bankAccountId), eq(bankAccounts.orgId, orgId)));
      }

      await tx
        .update(miscContacts)
        .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
        .where(eq(miscContacts.id, contactId));

      const cashOrBankAcc = await (async () => {
        if (contact.paymentMethod === "cash") return resolveAccount(tx, orgId, "cash");
        if (contact.bankAccountId) {
          const [bankRow] = await tx
            .select({ coaAccountId: bankAccounts.coaAccountId })
            .from(bankAccounts)
            .where(and(eq(bankAccounts.id, contact.bankAccountId), eq(bankAccounts.orgId, orgId)))
            .limit(1);
          if (bankRow?.coaAccountId) return { id: bankRow.coaAccountId };
        }
        return resolveAccount(tx, orgId, "bank");
      })();
      const counterpartSubType: Record<MiscContactType, string> = {
        capital_investment: "capital",
        loan_proceeds: "loan_payable_shortterm",
        loan_repayment: "loan_payable_shortterm",
        owner_withdrawal: "owners_drawings",
        dividend: "owners_drawings",
        other: "other_income",
      };
      const counterpartAcc = await resolveAccount(tx, orgId, counterpartSubType[contact.contactType] || "other_income");

      await postTransaction(tx, {
        orgId,
        description: `${contact.contactType.replace(/_/g, " ")} - ${contact.partyName} (${contact.referenceNumber})`,
        date: contact.transactionDate,
        referenceType: "misc_contact",
        referenceId: contact.id,
        sourceType: "misc_contact",
        createdBy: userId || undefined,
        lines: isIncome
          ? [
              { accountId: cashOrBankAcc.id, description: `Received from ${contact.partyName}`, debit: contact.amount, credit: "0" },
              { accountId: counterpartAcc.id, description: contact.description || contact.contactType, debit: "0", credit: contact.amount },
            ]
          : [
              { accountId: counterpartAcc.id, description: contact.description || contact.contactType, debit: contact.amount, credit: "0" },
              { accountId: cashOrBankAcc.id, description: `Paid to ${contact.partyName}`, debit: "0", credit: contact.amount },
            ],
      });
    });

    revalidatePath("/accounts/banking");
    return { success: true, message: "Transaction approved" };
  } catch (error) {
    captureException(error, { module: "banking", function: "approveMiscContact" });
    return { success: false, error: "Failed to approve transaction" };
  }
}

// ==========================================
// BANK RECONCILIATION
// ==========================================

export interface ReconciliationTransaction {
  id: string;
  date: Date;
  entryNumber: string;
  description: string;
  debit: string;
  credit: string;
  referenceType: string;
  referenceNumber: string | null;
}

// NOTE (2026 review, flagged not fixed pending Q1/Q2 above): still matches
// the COA account by fuzzy ILIKE name matching against bankAccounts, since
// there's no explicit FK between the two tables. Left as-is until the
// chartOfAccountId linkage question is resolved — replacing this with a
// direct join would be straightforward once that column exists.
export async function getBankReconciliation(
  bankAccountId: string,
  statementDate: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  success: boolean;
  data?: {
    bankAccount: {
      id: string;
      name: string;
      accountNumber: string;
      currentBalance: string;
    };
    transactions: ReconciliationTransaction[];
    systemBookBalance: string;
    totalDebits: string;
    totalCredits: string;
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);

    if (!bankAccount) return { success: false, error: "Bank account not found" };

    const [coaAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.type, "asset"),
        ilike(chartOfAccounts.name, `%${bankAccount.accountName}%`)
      ))
      .limit(1);

    const accountId = coaAccount?.id || null;

    let transactions: ReconciliationTransaction[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    if (accountId) {
      const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-12-31');

      const rows = await db
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
          eq(journalEntryLines.accountId, accountId),
          sql`${journalEntries.entryDate} >= ${from}`,
          sql`${journalEntries.entryDate} <= ${to}`
        ))
        .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

      transactions = rows.map(row => {
        const debit = parseFloat(row.debitAmount || '0');
        const credit = parseFloat(row.creditAmount || '0');
        totalDebits += debit;
        totalCredits += credit;

        return {
          id: row.id,
          date: row.date,
          entryNumber: row.entryNumber,
          description: row.description || '',
          debit: debit.toFixed(2),
          credit: credit.toFixed(2),
          referenceType: row.referenceType || '',
          referenceNumber: null,
        };
      });
    }

    const systemBookBalance = totalDebits - totalCredits;

    return {
      success: true,
      data: {
        bankAccount: {
          id: bankAccount.id,
          name: bankAccount.accountName,
          accountNumber: bankAccount.accountNumber,
          currentBalance: bankAccount.currentBalance || '0',
        },
        transactions,
        systemBookBalance: systemBookBalance.toFixed(2),
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
      },
    };
  } catch (error) {
    captureException(error, { module: "banking", function: "getBankReconciliation" });
    return { success: false, error: "Failed to fetch bank reconciliation data" };
  }
}

// ==========================================
// CONTRA ENTRIES (Cash <-> Bank Transfers)
// ==========================================

export interface ContraEntryFormData {
  entryDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  reference?: string;
  description?: string;
}

/**
 * Create a contra entry for Cash <-> Bank transfers
 * Creates a journal entry with:
 * - Debit: To Account (receiving account)
 * - Credit: From Account (sending account)
 *
 * NOTE (2026 review, flagged not merged pending confirmation): this
 * duplicates createVoucher()'s CONTRA case in accounts.ts — same
 * behavior, implemented twice independently. Left both in place; consider
 * consolidating once confirmed they serve genuinely separate entry points.
 */
export async function createContraEntry(data: ContraEntryFormData) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const locked = await checkPeriodLocked(new Date(data.entryDate));
    if (locked) return { success: false, error: "Cannot create contra entry in a locked fiscal period" };

    if (!data.fromAccountId || !data.toAccountId) {
      return { success: false, error: "From and To accounts are required" };
    }

    if (!data.amount || parseFloat(data.amount) <= 0) {
      return { success: false, error: "Valid amount is required" };
    }

    if (data.fromAccountId === data.toAccountId) {
      return { success: false, error: "From and To accounts cannot be the same" };
    }

    const [fromAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, data.fromAccountId),
        eq(chartOfAccounts.orgId, orgId)
      ))
      .limit(1);

    const [toAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, data.toAccountId),
        eq(chartOfAccounts.orgId, orgId)
      ))
      .limit(1);

    if (!fromAccount || !toAccount) {
      return { success: false, error: "One or both accounts not found" };
    }

    const { userId } = await auth();

    const posted = await db.transaction(async (tx) => {
      const { journalEntryId, entryNumber } = await postTransaction(tx, {
        orgId,
        description: data.description || `Contra transfer: ${fromAccount.name} → ${toAccount.name}`,
        date: new Date(data.entryDate),
        referenceType: "contra_entry",
        referenceId: data.reference || "",
        sourceType: "contra_entry",
        createdBy: userId || undefined,
        lines: [
          { accountId: data.toAccountId, description: `Transfer from ${fromAccount.name}`, debit: data.amount, credit: "0" },
          { accountId: data.fromAccountId, description: `Transfer to ${toAccount.name}`, debit: "0", credit: data.amount },
        ],
      });

      await tx.insert(auditLogs).values({
        orgId,
        userId: userId || 'system',
        action: 'CONTRA_ENTRY_CREATED',
        entityType: 'journal_entry',
        entityId: journalEntryId,
        changes: JSON.stringify({
          entryNumber,
          fromAccount: fromAccount.name,
          toAccount: toAccount.name,
          amount: data.amount,
        }),
      });

      return { journalEntryId, entryNumber };
    });

    revalidatePath('/accounts/banking');
    revalidatePath('/reports/cash-book');

    return {
      success: true,
      data: { id: posted.journalEntryId },
      entryNumber: posted.entryNumber,
      message: `Contra entry ${posted.entryNumber} created successfully`,
    };
  } catch (error) {
    captureException(error, { module: "banking", function: "createContraEntry" });
    return { success: false, error: "Failed to create contra entry" };
  }
}