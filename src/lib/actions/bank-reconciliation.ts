"use server";

import { db } from "@/db";
import {
  bankAccounts,
  bankStatements,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  customerPayments,
  vendorPayments,
  invoices,
  purchaseInvoices,
} from "@/db/schema";
import { eq, and, desc, gte, lte, sql, ilike } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

export interface StatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  matched: boolean;
  matchedTransactionId?: string;
  matchedType?: string;
}

export interface MatchedTransaction {
  id: string;
  date: Date;
  description: string;
  reference: string;
  amount: number;
  type: "payment" | "deposit" | "transfer" | "expense" | "journal";
}

export async function getBankStatements(bankAccountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const statements = await db
      .select()
      .from(bankStatements)
      .where(and(eq(bankStatements.orgId, orgId), eq(bankStatements.bankAccountId, bankAccountId)))
      .orderBy(desc(bankStatements.statementDate));

    return { success: true, data: statements };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to fetch bank statements" };
  }
}

export async function createBankStatement(data: {
  bankAccountId: string;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  lines: Omit<StatementLine, "id" | "matched" | "matchedTransactionId" | "matchedType">[];
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const statementLines: StatementLine[] = data.lines.map((line, idx) => ({
      id: `line-${idx}-${Date.now()}`,
      ...line,
      matched: false,
    }));

    const totalDeposits = data.lines.reduce((s, l) => s + l.credit, 0);
    const totalWithdrawals = data.lines.reduce((s, l) => s + l.debit, 0);

    const [statement] = await db
      .insert(bankStatements)
      .values({
        orgId,
        bankAccountId: data.bankAccountId,
        statementDate: new Date(data.statementDate),
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        totalDeposits: String(totalDeposits),
        totalWithdrawals: String(totalWithdrawals),
        lines: statementLines,
        status: "pending",
      })
      .returning();

    revalidatePath("/accounts/reconciliation");
    return { success: true, data: statement, message: "Bank statement saved" };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to create bank statement" };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): string {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return dateStr;
}

export async function parseBankStatementCSV(csvContent: string, bankAccountId: string) {
  try {
    const lines = csvContent.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { success: false, error: "CSV must have a header row and at least one data row" };

    const header = parseCSVLine(lines[0]);
    const dateIdx = header.findIndex(h => /date|date|transaction.*date/i.test(h));
    const descIdx = header.findIndex(h => /desc|narrative|particular|details|description/i.test(h));
    const refIdx = header.findIndex(h => /ref|cheque|chq|check|reference|trx.*id/i.test(h));
    const debitIdx = header.findIndex(h => /debit|withdrawal|payment|dr/i.test(h));
    const creditIdx = header.findIndex(h => /credit|deposit|cr/i.test(h));
    const balanceIdx = header.findIndex(h => /balance|running.*balance/i.test(h));

    if (dateIdx === -1 || (debitIdx === -1 && creditIdx === -1))
      return { success: false, error: "CSV must have Date and Debit/Credit columns" };

    const parsed: Omit<StatementLine, "id" | "matched" | "matchedTransactionId" | "matchedType">[] = [];
    let runningBalance = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= Math.max(dateIdx, descIdx, debitIdx, creditIdx)) continue;

      const debit = debitIdx >= 0 ? parseFloat(cols[debitIdx]?.replace(/[^0-9.\-]/g, "") || "0") : 0;
      const credit = creditIdx >= 0 ? parseFloat(cols[creditIdx]?.replace(/[^0-9.\-]/g, "") || "0") : 0;
      const balance = balanceIdx >= 0 ? parseFloat(cols[balanceIdx]?.replace(/[^0-9.\-]/g, "") || "0") : 0;

      if (i === 1 && balance === 0 && balanceIdx === -1) {
        runningBalance = credit - debit;
      } else if (balanceIdx >= 0) {
        runningBalance = balance;
      } else {
        runningBalance += credit - debit;
      }

      parsed.push({
        date: parseDate(cols[dateIdx]),
        description: descIdx >= 0 ? cols[descIdx] : "",
        reference: refIdx >= 0 ? cols[refIdx] : "",
        debit,
        credit,
        balance: runningBalance,
      });
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to parse CSV" };
  }
}

export async function autoMatchTransactions(
  bankAccountId: string,
  statementLines: StatementLine[],
  dateFrom: string,
  dateTo: string,
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);
    if (!bankAccount) return { success: false, error: "Bank account not found" };

    // Find matching COA account
    const [coaAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.type, "asset"),
        ilike(chartOfAccounts.name, `%${bankAccount.accountName}%`),
      ))
      .limit(1);

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Fetch system transactions for this bank account
    const systemTransactions: MatchedTransaction[] = [];

    if (coaAccount) {
      const journalLines = await db
        .select({
          id: journalEntryLines.id,
          journalEntryId: journalEntryLines.journalEntryId,
          debitAmount: journalEntryLines.debitAmount,
          creditAmount: journalEntryLines.creditAmount,
          description: journalEntryLines.description,
          entryDate: journalEntries.entryDate,
          entryNumber: journalEntries.entryNumber,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(
          eq(journalEntryLines.accountId, coaAccount.id),
          eq(journalEntries.orgId, orgId),
          gte(journalEntries.entryDate, fromDate),
          lte(journalEntries.entryDate, toDate),
        ));

      for (const jl of journalLines) {
        const amount = parseFloat(jl.debitAmount || "0") || parseFloat(jl.creditAmount || "0");
        systemTransactions.push({
          id: jl.id,
          date: jl.entryDate,
          description: jl.description || jl.entryNumber,
          reference: jl.entryNumber,
          amount,
          type: "journal",
        });
      }
    }

    // Auto-match: by exact amount + date proximity
    const matched = statementLines.map((line) => {
      const match = systemTransactions.find((tx) => {
        const amountMatch = Math.abs(tx.amount - (line.debit || line.credit)) < 0.01;
        if (!amountMatch) return false;

        const txDate = new Date(tx.date);
        const lineDate = new Date(line.date);
        const dayDiff = Math.abs(txDate.getTime() - lineDate.getTime()) / (1000 * 60 * 60 * 24);
        return dayDiff <= 3;
      });

      return {
        ...line,
        matched: !!match,
        matchedTransactionId: match?.id || undefined,
        matchedType: match?.type || undefined,
      };
    });

    return { success: true, data: matched, systemTransactions };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to auto-match transactions" };
  }
}

export async function saveMatchResult(
  statementId: string,
  lines: StatementLine[],
  status: "matched" | "reconciled" = "matched",
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [statement] = await db
      .update(bankStatements)
      .set({ lines, status, updatedAt: new Date() })
      .where(and(eq(bankStatements.id, statementId), eq(bankStatements.orgId, orgId)))
      .returning();

    revalidatePath("/accounts/reconciliation");
    return { success: true, data: statement, message: "Match results saved" };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to save match results" };
  }
}

export async function deleteBankStatement(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(bankStatements)
      .where(and(eq(bankStatements.id, id), eq(bankStatements.orgId, orgId)));

    revalidatePath("/accounts/reconciliation");
    return { success: true, message: "Bank statement deleted" };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to delete bank statement" };
  }
}
