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
import { getCurrentOrgId } from "./shared";

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
  currency?: string;
  notes?: string;
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
    return { success: false, error: "Failed to fetch bank accounts" };
  }
}

export async function addBankAccount(data: BankAccountFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.accountName || !data.accountNumber) {
      return { success: false, error: "Account name and number are required" };
    }

    const openingBalance = parseFloat(data.openingBalance || "0");

    const [newAccount] = await db
      .insert(bankAccounts)
      .values({
        orgId,
        accountName: data.accountName,
        iban: data.iban,
        accountNumber: data.accountNumber,
        branchName: data.branchName,
        bankName: data.bankName,
        accountType: data.accountType,
        openingBalance: data.openingBalance,
        currentBalance: data.openingBalance,
        currency: data.currency || "PKR",
        notes: data.notes,
        approvalStatus: "approved",
        approvedBy: (await auth()).userId || "system",
        approvedAt: new Date(),
      })
      .returning();

    // Create opening balance journal entry if opening balance is non-zero
    if (openingBalance !== 0) {
      const entryCount = await db.select().from(journalEntries).where(eq(journalEntries.orgId, orgId));
      const entryNumber = `JE-OPEN-${String(entryCount.length + 1).padStart(5, "0")}`;

      const [journalEntry] = await db
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber,
          entryDate: new Date(),
          referenceType: "bank_opening_balance",
          referenceId: newAccount.id,
          description: `Opening balance for ${data.accountName}`,
        })
        .returning();

      const bankAccountId = await findAccountByType(orgId, "asset", "Bank");
      const cashAccountId = await findAccountByType(orgId, "asset", "Cash");

      if (openingBalance > 0) {
        // Debit Bank, Credit Opening Equity
        await db.insert(journalEntryLines).values({
          orgId, journalEntryId: journalEntry.id, accountId: bankAccountId, debitAmount: data.openingBalance, creditAmount: "0", description: "Bank opening balance"
        });
        await db.insert(journalEntryLines).values({
          orgId, journalEntryId: journalEntry.id, accountId: cashAccountId, debitAmount: "0", creditAmount: data.openingBalance, description: "Opening balance equity"
        });
      }
    }

    revalidatePath("/accounts/banking");
    return { success: true, data: newAccount, message: "Bank account added successfully" };
  } catch (error) {
    return { success: false, error: "Failed to add bank account" };
  }
}

export async function updateBankAccount(accountId: string, data: Partial<BankAccountFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
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
    return { success: false, error: "Failed to update bank account" };
  }
}

export async function approveBankAccount(accountId: string) {
  try {
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
    return { success: false, error: "Failed to fetch bank deposits" };
  }
}

export async function addBankDeposit(data: BankDepositFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.bankAccountId || !data.amount || !data.depositDate) {
      return { success: false, error: "Bank account, amount, and date are required" };
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Invalid deposit amount" };
    }

    // Get bank account to verify
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);

    if (!bankAccount) {
      return { success: false, error: "Bank account not found" };
    }

    // Generate deposit number
    const count = await db.select().from(bankDeposits).where(eq(bankDeposits.orgId, orgId));
    const depositNumber = `BD-${String(count.length + 1).padStart(5, "0")}`;

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
    return { success: false, error: "Failed to record bank deposit" };
  }
}

export async function approveBankDeposit(depositId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    // Get deposit
    const [deposit] = await db
      .select()
      .from(bankDeposits)
      .where(and(eq(bankDeposits.id, depositId), eq(bankDeposits.orgId, orgId)))
      .limit(1);

    if (!deposit) return { success: false, error: "Deposit not found" };
    if (deposit.approvalStatus === "approved") return { success: false, error: "Deposit already approved" };

    // Update bank account balance
    await db
      .update(bankAccounts)
      .set({
        currentBalance: (parseFloat(deposit.amount) + parseFloat((await db.select({ currentBalance: bankAccounts.currentBalance }).from(bankAccounts).where(eq(bankAccounts.id, deposit.bankAccountId)).limit(1))[0].currentBalance || "0")).toString(),
      })
      .where(eq(bankAccounts.id, deposit.bankAccountId));

    // Update deposit status
    await db
      .update(bankDeposits)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(eq(bankDeposits.id, depositId));

    // Create journal entry
    const entryCount = await db.select().from(journalEntries).where(eq(journalEntries.orgId, orgId));
    const entryNumber = `JE-DEP-${String(entryCount.length + 1).padStart(5, "0")}`;

    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: deposit.depositDate,
        referenceType: "bank_deposit",
        referenceId: deposit.id,
        description: `Bank deposit ${deposit.depositNumber}`,
      })
      .returning();

    const bankAccountId = await findAccountByType(orgId, "asset", "Bank");
    const cashAccountId = await findAccountByType(orgId, "asset", "Cash");

    await db.insert(journalEntryLines).values({
      orgId, journalEntryId: journalEntry.id, accountId: bankAccountId, debitAmount: deposit.amount, creditAmount: "0", description: "Bank deposit"
    });
    await db.insert(journalEntryLines).values({
      orgId, journalEntryId: journalEntry.id, accountId: cashAccountId, debitAmount: "0", creditAmount: deposit.amount, description: "Cash deposited"
    });

    revalidatePath("/accounts/banking");
    return { success: true, message: "Bank deposit approved and posted" };
  } catch (error) {
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
    return { success: false, error: "Failed to fetch funds transfers" };
  }
}

export async function addFundsTransfer(data: FundsTransferFormData) {
  try {
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

    // Check sufficient balance in from account
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

    const count = await db.select().from(fundsTransfers).where(eq(fundsTransfers.orgId, orgId));
    const transferNumber = `FT-${String(count.length + 1).padStart(5, "0")}`;

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
    return { success: false, error: "Failed to record funds transfer" };
  }
}

export async function approveFundsTransfer(transferId: string) {
  try {
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

    const amount = parseFloat(transfer.amount);

    // Update balances
    await db
      .update(bankAccounts)
      .set({ currentBalance: (parseFloat((await db.select({ currentBalance: bankAccounts.currentBalance }).from(bankAccounts).where(eq(bankAccounts.id, transfer.fromBankAccountId)).limit(1))[0].currentBalance || "0") - amount).toString() })
      .where(eq(bankAccounts.id, transfer.fromBankAccountId));

    await db
      .update(bankAccounts)
      .set({ currentBalance: (parseFloat((await db.select({ currentBalance: bankAccounts.currentBalance }).from(bankAccounts).where(eq(bankAccounts.id, transfer.toBankAccountId)).limit(1))[0].currentBalance || "0") + amount).toString() })
      .where(eq(bankAccounts.id, transfer.toBankAccountId));

    // Update transfer status
    await db
      .update(fundsTransfers)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(eq(fundsTransfers.id, transferId));

    // Create journal entry
    const entryCount = await db.select().from(journalEntries).where(eq(journalEntries.orgId, orgId));
    const entryNumber = `JE-FT-${String(entryCount.length + 1).padStart(5, "0")}`;

    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: transfer.transferDate,
        referenceType: "funds_transfer",
        referenceId: transfer.id,
        description: `Funds transfer ${transfer.transferNumber}`,
      })
      .returning();

    await db.insert(journalEntryLines).values([
      { orgId, journalEntryId: journalEntry.id, accountId: transfer.toBankAccountId, debitAmount: transfer.amount, creditAmount: "0", description: "Funds transfer to" },
      { orgId, journalEntryId: journalEntry.id, accountId: transfer.fromBankAccountId, debitAmount: "0", creditAmount: transfer.amount, description: "Funds transfer from" },
    ]);

    revalidatePath("/accounts/banking");
    return { success: true, message: "Funds transfer approved and posted" };
  } catch (error) {
    return { success: false, error: "Failed to approve funds transfer" };
  }
}

// ==========================================
// OTHER COLLECTIONS & PAYMENTS (MISC CONTACTS)
// ==========================================

export interface MiscContactFormData {
  contactType: string;
  partyName: string;
  amount: string;
  paymentMethod: string;
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
    return { success: false, error: "Failed to fetch misc contacts" };
  }
}

export async function addMiscContact(data: MiscContactFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.partyName || !data.amount || !data.transactionDate) {
      return { success: false, error: "Party name, amount, and date are required" };
    }

    const count = await db.select().from(miscContacts).where(eq(miscContacts.orgId, orgId));
    const referenceNumber = `MC-${String(count.length + 1).padStart(5, "0")}`;

    const [contact] = await db
      .insert(miscContacts)
      .values({
        orgId,
        referenceNumber,
        contactType: data.contactType as any,
        partyName: data.partyName,
        amount: data.amount,
        paymentMethod: data.paymentMethod as any,
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
    return { success: false, error: "Failed to record transaction" };
  }
}

export async function approveMiscContact(contactId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    const [contact] = await db
      .select()
      .from(miscContacts)
      .where(and(eq(miscContacts.id, contactId), eq(miscContacts.orgId, orgId)))
      .limit(1);

    if (!contact) return { success: false, error: "Transaction not found" };
    if (contact.approvalStatus === "approved") return { success: false, error: "Already approved" };

    // Update bank account balance if applicable
    if (contact.bankAccountId) {
      const amount = parseFloat(contact.amount);
      const [bankAccount] = await db
        .select({ currentBalance: bankAccounts.currentBalance })
        .from(bankAccounts)
        .where(eq(bankAccounts.id, contact.bankAccountId))
        .limit(1);

      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.currentBalance || "0");
        const isIncome = ["capital_investment", "loan_proceeds"].includes(contact.contactType);
        const newBalance = isIncome ? currentBalance + amount : currentBalance - amount;

        await db
          .update(bankAccounts)
          .set({ currentBalance: newBalance.toString() })
          .where(eq(bankAccounts.id, contact.bankAccountId));
      }
    }

    await db
      .update(miscContacts)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(eq(miscContacts.id, contactId));

    revalidatePath("/accounts/banking");
    return { success: true, message: "Transaction approved" };
  } catch (error) {
    return { success: false, error: "Failed to approve transaction" };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function findAccountByType(orgId: string, type: string, keyword: string): Promise<string> {
  const [account] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.type, type), ilike(chartOfAccounts.name, `%${keyword}%`)))
    .limit(1);

  return account?.id || "";
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

    // Fetch bank account details
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);

    if (!bankAccount) return { success: false, error: "Bank account not found" };

    // Find the corresponding chartOfAccounts entry for this bank account
    // Match by account name — bank account names usually match COA names
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

    // If no COA account found, fall back to searching by bank name pattern
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
    return { success: false, error: "Failed to fetch bank reconciliation data" };
  }
}
