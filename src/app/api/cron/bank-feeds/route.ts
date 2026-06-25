import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bankConnections, bankAccounts, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getBankFeedProvider,
  mapTransactionsToStatementLines,
} from "@/lib/banking/bank-feeds";
import { bankStatements } from "@/db/schema";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeConnections = await db
      .select({
        id: bankConnections.id,
        provider: bankConnections.provider,
        bankAccountId: bankConnections.bankAccountId,
        lastSyncAt: bankConnections.lastSyncAt,
        config: bankConnections.config,
        bankAccountName: bankAccounts.accountName,
        orgId: bankConnections.orgId,
      })
      .from(bankConnections)
      .leftJoin(bankAccounts, eq(bankConnections.bankAccountId, bankAccounts.id))
      .where(eq(bankConnections.status, "active"));

    const results = [];

    for (const conn of activeConnections) {
      try {
        const provider = getBankFeedProvider(conn.provider);
        if (!provider) {
          results.push({ connectionId: conn.id, status: "error", error: `Unknown provider: ${conn.provider}` });
          continue;
        }

        const fromDate = conn.lastSyncAt
          ? new Date(conn.lastSyncAt.getTime() - 24 * 60 * 60 * 1000)
          : new Date(new Date().getFullYear(), 0, 1);
        const toDate = new Date();

        const syncResult = await provider.syncTransactions(fromDate, toDate);
        if (!syncResult.success) {
          await db.update(bankConnections)
            .set({ lastSyncStatus: "failed", errorMessage: syncResult.error, updatedAt: new Date() })
            .where(eq(bankConnections.id, conn.id));
          results.push({ connectionId: conn.id, status: "error", error: syncResult.error });
          continue;
        }

        const statementLines = mapTransactionsToStatementLines(syncResult.transactions);
        const lastBalance = syncResult.transactions.length > 0
          ? syncResult.transactions[syncResult.transactions.length - 1].balance
          : 0;

        const existingStatements = await db
          .select()
          .from(bankStatements)
          .where(and(eq(bankStatements.bankAccountId, conn.bankAccountId), eq(bankStatements.orgId, conn.orgId)))
          .orderBy(bankStatements.statementDate)
          .limit(1);

        if (existingStatements.length > 0) {
          await db.update(bankStatements)
            .set({ lines: statementLines as any, closingBalance: String(lastBalance), updatedAt: new Date() })
            .where(eq(bankStatements.id, existingStatements[0].id));
        } else if (syncResult.transactions.length > 0) {
          await db.insert(bankStatements).values({
            orgId: conn.orgId,
            bankAccountId: conn.bankAccountId,
            statementDate: toDate,
            openingBalance: "0",
            closingBalance: String(lastBalance),
            totalDeposits: String(syncResult.transactions.filter((t) => t.credit > 0).reduce((s, t) => s + t.credit, 0)),
            totalWithdrawals: String(syncResult.transactions.filter((t) => t.debit > 0).reduce((s, t) => s + t.debit, 0)),
            lines: statementLines as any,
            status: "matched",
          });
        }

        await db.update(bankConnections)
          .set({ lastSyncAt: new Date(), lastSyncStatus: "success", errorMessage: null, updatedAt: new Date() })
          .where(eq(bankConnections.id, conn.id));

        results.push({
          connectionId: conn.id,
          accountName: conn.bankAccountName,
          status: "success",
          transactions: syncResult.transactions.length,
        });
      } catch (err: any) {
        await db.update(bankConnections)
          .set({ lastSyncStatus: "failed", errorMessage: err.message, updatedAt: new Date() })
          .where(eq(bankConnections.id, conn.id));
        results.push({ connectionId: conn.id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      connectionsProcessed: activeConnections.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Bank feeds cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
