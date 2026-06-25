"use server";

import { db } from "@/db";
import {
  bankAccounts,
  bankConnections,
  bankStatements,
  organizations,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";
import {
  getBankFeedProvider,
  mapTransactionsToStatementLines,
} from "@/lib/banking/bank-feeds";

// ─── Bank Connections CRUD ───

export async function getBankConnections() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const connections = await db
      .select({
        id: bankConnections.id,
        bankAccountId: bankConnections.bankAccountId,
        provider: bankConnections.provider,
        status: bankConnections.status,
        lastSyncAt: bankConnections.lastSyncAt,
        lastSyncStatus: bankConnections.lastSyncStatus,
        errorMessage: bankConnections.errorMessage,
        createdAt: bankConnections.createdAt,
        bankAccountName: bankAccounts.accountName,
        bankAccountNumber: bankAccounts.accountNumber,
        bankName: bankAccounts.bankName,
      })
      .from(bankConnections)
      .leftJoin(bankAccounts, eq(bankConnections.bankAccountId, bankAccounts.id))
      .where(eq(bankConnections.orgId, orgId))
      .orderBy(desc(bankConnections.createdAt));

    return { success: true as const, data: connections };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load connections" };
  }
}

export async function createBankConnection(data: {
  bankAccountId: string;
  provider: string;
  config?: Record<string, string>;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const provider = getBankFeedProvider(data.provider);
    if (!provider) return { success: false as const, error: `Unknown provider: ${data.provider}` };

    const connectResult = await provider.connect(data.config || {});
    if (!connectResult.success) {
      return { success: false as const, error: connectResult.error || "Failed to connect" };
    }

    const [connection] = await db
      .insert(bankConnections)
      .values({
        orgId,
        bankAccountId: data.bankAccountId,
        provider: data.provider as any,
        providerAccountId: connectResult.accountId || null,
        status: "active",
        config: data.config || {},
      })
      .returning();

    revalidatePath("/settings/bank-feeds");
    return { success: true as const, data: connection, message: "Bank connection created" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create connection" };
  }
}

export async function deleteBankConnection(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    await db
      .delete(bankConnections)
      .where(and(eq(bankConnections.id, id), eq(bankConnections.orgId, orgId)));

    revalidatePath("/settings/bank-feeds");
    return { success: true as const, message: "Connection removed" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete connection" };
  }
}

// ─── Sync ───

export async function syncBankTransactions(connectionId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [connection] = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.orgId, orgId)))
      .limit(1);

    if (!connection) return { success: false as const, error: "Connection not found" };

    const provider = getBankFeedProvider(connection.provider);
    if (!provider) return { success: false as const, error: `Unknown provider: ${connection.provider}` };

    const fromDate = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(new Date().getFullYear(), 0, 1);

    const toDate = new Date();

    const syncResult = await provider.syncTransactions(fromDate, toDate);
    if (!syncResult.success) {
      await db
        .update(bankConnections)
        .set({ lastSyncStatus: "failed", errorMessage: syncResult.error, updatedAt: new Date() })
        .where(eq(bankConnections.id, connectionId));
      return { success: false as const, error: syncResult.error || "Sync failed" };
    }

    const statementLines = mapTransactionsToStatementLines(syncResult.transactions);

    // Create/update statement
    const existingStatements = await db
      .select()
      .from(bankStatements)
      .where(and(eq(bankStatements.bankAccountId, connection.bankAccountId), eq(bankStatements.orgId, orgId)))
      .orderBy(desc(bankStatements.statementDate))
      .limit(1);

    const lastBalance = syncResult.transactions.length > 0
      ? syncResult.transactions[syncResult.transactions.length - 1].balance
      : 0;

    if (existingStatements.length > 0) {
      await db
        .update(bankStatements)
        .set({
          lines: statementLines as any,
          closingBalance: String(lastBalance),
          status: "matched",
          updatedAt: new Date(),
        })
        .where(eq(bankStatements.id, existingStatements[0].id));
    } else {
      await db.insert(bankStatements).values({
        orgId,
        bankAccountId: connection.bankAccountId,
        statementDate: toDate,
        openingBalance: "0",
        closingBalance: String(lastBalance),
        totalDeposits: String(syncResult.transactions.filter((t) => t.credit > 0).reduce((s, t) => s + t.credit, 0)),
        totalWithdrawals: String(syncResult.transactions.filter((t) => t.debit > 0).reduce((s, t) => s + t.debit, 0)),
        lines: statementLines as any,
        status: "matched",
      });
    }

    await db
      .update(bankConnections)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        errorMessage: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(bankConnections.id, connectionId));

    revalidatePath("/settings/bank-feeds");
    return {
      success: true as const,
      message: `Synced ${syncResult.transactions.length} transactions`,
      data: { count: syncResult.transactions.length },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Sync failed" };
  }
}

export async function syncAllBankConnections() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const connections = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.orgId, orgId), eq(bankConnections.status, "active")));

    const results = [];
    for (const connection of connections) {
      const result = await syncBankTransactions(connection.id);
      results.push({ connectionId: connection.id, ...result });
    }

    return { success: true as const, data: results };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Bulk sync failed" };
  }
}
