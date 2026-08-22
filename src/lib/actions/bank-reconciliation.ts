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
  reconciliationPatterns,
} from "@/db/schema";
import { eq, and, desc, gte, lte, sql, ilike } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { calculateKeywordOverlap, matchWithPatterns } from "@/lib/bank-matching";
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

export async function finalizeReconciliation(
  statementId: string,
  statementBalance: number,
  bookBalance: number,
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const difference = Math.abs(statementBalance - bookBalance);
    if (difference >= 0.01) {
      return {
        success: false,
        error: `Cannot finalize: difference is Rs. ${difference.toFixed(2)}. Balance the reconciliation first.`,
      };
    }

    const [statement] = await db
      .select()
      .from(bankStatements)
      .where(and(eq(bankStatements.id, statementId), eq(bankStatements.orgId, orgId)))
      .limit(1);

    if (!statement) return { success: false, error: "Statement not found" };
    if (statement.status === "reconciled") return { success: false, error: "Already reconciled" };

    const lines = statement.lines as StatementLine[];
    const matchedCount = lines.filter((l) => l.matched).length;
    const unmatchedCount = lines.filter((l) => !l.matched).length;

    const [updated] = await db
      .update(bankStatements)
      .set({
        status: "reconciled",
        notes: JSON.stringify({
          finalizedAt: new Date().toISOString(),
          statementBalance,
          bookBalance,
          difference: 0,
          matchedCount,
          unmatchedCount,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(bankStatements.id, statementId), eq(bankStatements.orgId, orgId)))
      .returning();

    revalidatePath("/accounts/reconciliation");
    return {
      success: true,
      data: updated,
      message: `Reconciliation finalized. ${matchedCount} items matched, ${unmatchedCount} outstanding.`,
    };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to finalize reconciliation" };
  }
}

export async function undoReconciliation(statementId: string, reason: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!reason || reason.trim().length < 3) {
      return { success: false, error: "Reason is required (minimum 3 characters)" };
    }

    const [statement] = await db
      .select()
      .from(bankStatements)
      .where(and(eq(bankStatements.id, statementId), eq(bankStatements.orgId, orgId)))
      .limit(1);

    if (!statement) return { success: false, error: "Statement not found" };
    if (statement.status !== "reconciled") return { success: false, error: "Only reconciled statements can be undone" };

    const existingNotes = statement.notes ? JSON.parse(statement.notes) : {};
    const [updated] = await db
      .update(bankStatements)
      .set({
        status: "matched",
        notes: JSON.stringify({
          ...existingNotes,
          undoneAt: new Date().toISOString(),
          undoReason: reason,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(bankStatements.id, statementId), eq(bankStatements.orgId, orgId)))
      .returning();

    revalidatePath("/accounts/reconciliation");
    return { success: true, data: updated, message: "Reconciliation undone. You can now edit matches." };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to undo reconciliation" };
  }
}

export async function getReconciliationHistory(bankAccountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const statements = await db
      .select()
      .from(bankStatements)
      .where(and(eq(bankStatements.orgId, orgId), eq(bankStatements.bankAccountId, bankAccountId)))
      .orderBy(desc(bankStatements.statementDate));

    const history = statements.map((s) => {
      const notes = s.notes ? JSON.parse(s.notes) : {};
      return {
        id: s.id,
        statementDate: s.statementDate,
        openingBalance: s.openingBalance,
        closingBalance: s.closingBalance,
        totalDeposits: s.totalDeposits,
        totalWithdrawals: s.totalWithdrawals,
        status: s.status,
        matchedCount: notes.matchedCount ?? null,
        unmatchedCount: notes.unmatchedCount ?? null,
        finalizedAt: notes.finalizedAt ?? null,
        undoReason: notes.undoReason ?? null,
      };
    });

    return { success: true, data: history };
  } catch (error) {
    console.error("Error in bank-reconciliation.ts:", error);
    return { success: false, error: "Failed to fetch reconciliation history" };
  }
}

// ==================== SMART RECONCILIATION (AI-POWERED) ====================

export interface SmartMatchResult {
  statementLineId: string;
  systemTransactionId: string;
  confidence: number;
  reasoning: string;
  matchType: "exact" | "fuzzy" | "pattern" | "suggestion";
}

// Keyword overlap scoring (fallback when Gemini is unavailable)
// Calculate confidence score based on amount, date, and description
function calculateConfidence(
  amountMatch: boolean,
  amountDiff: number,
  dateDiff: number,
  descriptionScore: number
): number {
  let score = 0;

  // Amount match (40% weight)
  if (amountMatch) score += 40;
  else if (amountDiff < 0.05) score += 20; // Within 5%
  else if (amountDiff < 0.10) score += 10; // Within 10%

  // Date proximity (30% weight)
  if (dateDiff <= 1) score += 30;
  else if (dateDiff <= 3) score += 20;
  else if (dateDiff <= 5) score += 10;

  // Description similarity (30% weight)
  score += descriptionScore * 30;

  return Math.min(Math.round(score), 100);
}

// AI-powered smart matching
export async function smartMatchTransactions(
  bankAccountId: string,
  statementLines: StatementLine[],
  dateFrom: string,
  dateTo: string
): Promise<{
  success: boolean;
  data?: SmartMatchResult[];
  unmatched?: StatementLine[];
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get system transactions (same as autoMatchTransactions)
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.orgId, orgId)))
      .limit(1);
    if (!bankAccount) return { success: false, error: "Bank account not found" };

    const [coaAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.type, "asset"),
          ilike(chartOfAccounts.name, `%${bankAccount.accountName}%`)
        )
      )
      .limit(1);

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

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
        .where(
          and(
            eq(journalEntryLines.accountId, coaAccount.id),
            eq(journalEntries.orgId, orgId),
            gte(journalEntries.entryDate, fromDate),
            lte(journalEntries.entryDate, toDate)
          )
        );

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

    // Get learned patterns for this org
    const learnedPatterns = await getLearnedPatterns(orgId);

    // Smart matching with confidence scores
    const results: SmartMatchResult[] = [];
    const unmatched: StatementLine[] = [];

    for (const line of statementLines) {
      const lineAmount = line.debit || line.credit;
      let bestMatch: SmartMatchResult | null = null;

      // First, try learned patterns
      const patternMatch = matchWithPatterns(line.description || "", learnedPatterns);
      if (patternMatch && lineAmount > 0) {
        // Find system transaction matching the learned book pattern
        for (const tx of systemTransactions) {
          const txDesc = (tx.description || "").toLowerCase();
          if (txDesc.includes(patternMatch.bookPattern.split(" ")[0])) {
            const amountDiff = Math.abs(tx.amount - lineAmount);
            if (amountDiff < 0.01) {
              bestMatch = {
                statementLineId: line.id,
                systemTransactionId: tx.id,
                confidence: Math.min(patternMatch.confidence + 20, 100),
                reasoning: `Pattern match: "${line.description}" → "${patternMatch.bookPattern}" (${patternMatch.confidence}%)`,
                matchType: "pattern",
              };
              break;
            }
          }
        }
      }

      // Fall back to amount+date+description matching
      if (!bestMatch) {
        for (const tx of systemTransactions) {
          const amountDiff = Math.abs(tx.amount - lineAmount);
          const amountMatch = amountDiff < 0.01;
          const amountDiffPercent = lineAmount > 0 ? amountDiff / lineAmount : 1;

          const txDate = new Date(tx.date);
          const lineDate = new Date(line.date);
          const dateDiff = Math.abs(txDate.getTime() - lineDate.getTime()) / (1000 * 60 * 60 * 24);

          const descScore = calculateKeywordOverlap(line.description || "", tx.description || "");
          const confidence = calculateConfidence(amountMatch, amountDiffPercent, dateDiff, descScore);

          if (confidence > 50) {
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                statementLineId: line.id,
                systemTransactionId: tx.id,
                confidence,
                reasoning: `Amount: ${amountMatch ? "exact" : `${(amountDiffPercent * 100).toFixed(1)}% diff`}, Date: ${dateDiff.toFixed(0)} days, Description: ${(descScore * 100).toFixed(0)}% match`,
                matchType: confidence >= 90 ? "exact" : confidence >= 70 ? "fuzzy" : "suggestion",
              };
            }
          }
        }
      }

      if (bestMatch) {
        results.push(bestMatch);
      } else {
        unmatched.push(line);
      }
    }

    return { success: true, data: results, unmatched };
  } catch (error) {
    console.error("[smartMatchTransactions]", error);
    return { success: false, error: "Smart matching failed" };
  }
}

// Get smart suggestions for unmatched items
export async function getSmartSuggestions(
  unmatchedLines: StatementLine[],
  orgId: string
): Promise<{
  success: boolean;
  data?: Array<{ line: StatementLine; suggestions: SmartMatchResult[] }>;
  error?: string;
}> {
  try {
    // Get recent journal entries for pattern matching
    const recentEntries = await db
      .select({
        id: journalEntryLines.id,
        description: journalEntryLines.description,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
        entryDate: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(eq(journalEntries.orgId, orgId))
      .orderBy(desc(journalEntries.entryDate))
      .limit(100);

    const suggestions: Array<{ line: StatementLine; suggestions: SmartMatchResult[] }> = [];

    for (const line of unmatchedLines) {
      const lineAmount = line.debit || line.credit;
      const lineSuggestions: SmartMatchResult[] = [];

      for (const entry of recentEntries) {
        const amount = parseFloat(entry.debitAmount || "0") || parseFloat(entry.creditAmount || "0");
        const amountDiff = Math.abs(amount - lineAmount);
        const amountDiffPercent = lineAmount > 0 ? amountDiff / lineAmount : 1;

        if (amountDiffPercent < 0.05) {
          const descScore = calculateKeywordOverlap(line.description || "", entry.description || "");
          const txDate = new Date(entry.entryDate);
          const lineDate = new Date(line.date);
          const dateDiff = Math.abs(txDate.getTime() - lineDate.getTime()) / (1000 * 60 * 60 * 24);

          const confidence = calculateConfidence(amountDiff < 0.01, amountDiffPercent, dateDiff, descScore);

          if (confidence >= 40) {
            lineSuggestions.push({
              statementLineId: line.id,
              systemTransactionId: entry.id,
              confidence,
              reasoning: `Potential match: ${entry.description || entry.entryNumber}`,
              matchType: "suggestion",
            });
          }
        }
      }

      // Sort by confidence, take top 3
      lineSuggestions.sort((a, b) => b.confidence - a.confidence);
      if (lineSuggestions.length > 0) {
        suggestions.push({ line, suggestions: lineSuggestions.slice(0, 3) });
      }
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error("[getSmartSuggestions]", error);
    return { success: false, error: "Failed to get suggestions" };
  }
}

// ==================== PATTERN LEARNING ====================

// Save a learned pattern from manual match
export async function saveReconciliationPattern(
  bankDescription: string,
  bookDescription: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Extract key words (ignore numbers, dates, amounts)
    const bankWords = bankDescription
      .toLowerCase()
      .replace(/\d+/g, "")
      .replace(/[-/.,]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .sort()
      .join(" ");

    const bookWords = bookDescription
      .toLowerCase()
      .replace(/\d+/g, "")
      .replace(/[-/.,]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .sort()
      .join(" ");

    if (!bankWords || !bookWords) {
      return { success: false, error: "Insufficient pattern data" };
    }

    // Check if pattern already exists
    const existing = await db
      .select()
      .from(reconciliationPatterns)
      .where(
        and(
          eq(reconciliationPatterns.orgId, orgId),
          eq(reconciliationPatterns.bankPattern, bankWords),
          eq(reconciliationPatterns.bookPattern, bookWords)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update match count
      await db
        .update(reconciliationPatterns)
        .set({
          matchCount: sql`${reconciliationPatterns.matchCount} + 1`,
          confidence: sql`LEAST(${reconciliationPatterns.confidence} + 5, 100)`,
          updatedAt: new Date(),
        })
        .where(eq(reconciliationPatterns.id, existing[0].id));
    } else {
      // Insert new pattern
      await db.insert(reconciliationPatterns).values({
        orgId,
        bankPattern: bankWords,
        bookPattern: bookWords,
        matchCount: 1,
        confidence: "75",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[saveReconciliationPattern]", error);
    return { success: false, error: "Failed to save pattern" };
  }
}

// Get learned patterns for matching
export async function getLearnedPatterns(
  orgId: string
): Promise<Array<{ bankPattern: string; bookPattern: string; confidence: number }>> {
  try {
    const patterns = await db
      .select({
        bankPattern: reconciliationPatterns.bankPattern,
        bookPattern: reconciliationPatterns.bookPattern,
        confidence: reconciliationPatterns.confidence,
      })
      .from(reconciliationPatterns)
      .where(
        and(
          eq(reconciliationPatterns.orgId, orgId),
          sql`${reconciliationPatterns.matchCount} >= 2`
        )
      )
      .orderBy(sql`${reconciliationPatterns.confidence} DESC`);

    return patterns.map((p) => ({
      bankPattern: p.bankPattern,
      bookPattern: p.bookPattern,
      confidence: parseFloat(p.confidence),
    }));
  } catch (error) {
    console.error("[getLearnedPatterns]", error);
    return [];
  }
}

// Match using learned patterns
