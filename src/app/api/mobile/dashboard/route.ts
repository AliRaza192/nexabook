import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  invoices,
  expenses,
  purchaseInvoices,
  products,
  profiles,
} from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const userProfile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (userProfile.length > 0 && userProfile[0].orgId) {
    return userProfile[0].orgId;
  }

  return null;
}

function getDateRange(period: "current" | "previous") {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let from: Date;
  let to: Date;

  if (period === "current") {
    from = new Date(currentYear, currentMonth, 1);
    to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  } else {
    from = new Date(currentYear, currentMonth - 1, 1);
    to = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  }

  return { from, to };
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orgId = await getCurrentOrgId(userId);

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const currentPeriod = getDateRange("current");
    const previousPeriod = getDateRange("previous");

    // Total Revenue
    const [currentRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.netAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          gte(invoices.issueDate, currentPeriod.from),
          lte(invoices.issueDate, currentPeriod.to),
          sql`${invoices.status} IN ('approved', 'sent', 'paid', 'partial')`
        )
      );

    const totalRevenue = parseFloat(currentRevenueResult?.total || "0");

    // Net Profit (Revenue - COGS - Expenses)
    const [currentCOGSResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${purchaseInvoices.netAmount}), 0)` })
      .from(purchaseInvoices)
      .where(
        and(
          eq(purchaseInvoices.orgId, orgId),
          gte(purchaseInvoices.date, currentPeriod.from),
          lte(purchaseInvoices.date, currentPeriod.to),
          sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
        )
      );

    const [currentExpensesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.orgId, orgId),
          gte(expenses.date, currentPeriod.from),
          lte(expenses.date, currentPeriod.to)
        )
      );

    const cogs = parseFloat(currentCOGSResult?.total || "0");
    const operatingExpenses = parseFloat(currentExpensesResult?.total || "0");
    const netProfit = totalRevenue - cogs - operatingExpenses;

    // Accounts Receivable
    const [arResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.balanceAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          sql`${invoices.balanceAmount} > 0`,
          sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`
        )
      );

    const accountsReceivable = parseFloat(arResult?.total || "0");

    // Inventory Value
    const inventoryItems = await db
      .select({
        currentStock: products.currentStock,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    let inventoryValue = 0;
    for (const item of inventoryItems) {
      const stock = item.currentStock || 0;
      const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
      inventoryValue += stock * cost;
    }

    return NextResponse.json({
      totalRevenue,
      netProfit,
      accountsReceivable,
      inventoryValue,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
