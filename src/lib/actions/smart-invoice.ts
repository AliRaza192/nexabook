"use server";

import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  customers,
  products,
  organizations,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

// ==================== SMART INVOICE ACTIONS ====================

export interface SmartDefaults {
  suggestedDueDate: string | null;
  suggestedOrderBooker: string | null;
  suggestedWarehouseId: string | null;
  suggestedCurrency: string;
  confidence: number;
}

export interface DuplicateInvoice {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  netAmount: string;
  itemCount: number;
  overlapPercentage: number;
}

export interface PricingSuggestion {
  lastSoldPrice: string | null;
  averagePrice30d: string | null;
  customerPriceRange: { min: string; max: string; count: number } | null;
}

export interface AnomalyFlag {
  type: "high_amount" | "new_customer" | "bulk_order";
  severity: "info" | "warning";
  message: string;
  threshold: string;
  actual: string;
}

export interface PaymentPrediction {
  onTimeRate: number;
  averageDaysToPay: number;
  totalInvoices: number;
  prediction: "likely_on_time" | "likely_delayed" | "insufficient_data";
  confidence: number;
}

// ==================== FR-1: SMART DEFAULTS ====================

export async function getSmartDefaults(
  customerId: string,
  orgId: string
): Promise<{ success: boolean; data?: SmartDefaults; error?: string }> {
  try {
    // Get customer's historical invoices (last 20, approved/paid only)
    const history = await db
      .select({
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        orderBooker: invoices.orderBooker,
        warehouseId: invoices.warehouseId,
        currency: invoices.currency,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(20);

    if (history.length === 0) {
      return {
        success: true,
        data: {
          suggestedDueDate: null,
          suggestedOrderBooker: null,
          suggestedWarehouseId: null,
          suggestedCurrency: "PKR",
          confidence: 0,
        },
      };
    }

    // Calculate most common payment terms (days between issue and due)
    const paymentTerms: number[] = [];
    for (const inv of history) {
      if (inv.issueDate && inv.dueDate) {
        const diff =
          (new Date(inv.dueDate).getTime() -
            new Date(inv.issueDate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff > 0 && diff <= 365) paymentTerms.push(diff);
      }
    }

    let suggestedDueDate: string | null = null;
    if (paymentTerms.length > 0) {
      // Most common payment terms
      const termsCount = new Map<number, number>();
      for (const t of paymentTerms) {
        termsCount.set(t, (termsCount.get(t) || 0) + 1);
      }
      const mostCommon = [...termsCount.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + mostCommon);
      suggestedDueDate = dueDate.toISOString().split("T")[0];
    }

    // Most frequent order booker
    const bookerCount = new Map<string, number>();
    for (const inv of history) {
      if (inv.orderBooker) {
        bookerCount.set(
          inv.orderBooker,
          (bookerCount.get(inv.orderBooker) || 0) + 1
        );
      }
    }
    const suggestedOrderBooker =
      bookerCount.size > 0
        ? [...bookerCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Most frequent warehouse
    const warehouseCount = new Map<string, number>();
    for (const inv of history) {
      if (inv.warehouseId) {
        warehouseCount.set(
          inv.warehouseId,
          (warehouseCount.get(inv.warehouseId) || 0) + 1
        );
      }
    }
    const suggestedWarehouseId =
      warehouseCount.size > 0
        ? [...warehouseCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Most common currency
    const currencyCount = new Map<string, number>();
    for (const inv of history) {
      if (inv.currency) {
        currencyCount.set(
          inv.currency,
          (currencyCount.get(inv.currency) || 0) + 1
        );
      }
    }
    const suggestedCurrency =
      currencyCount.size > 0
        ? [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : "PKR";

    const confidence = Math.min(history.length / 5, 1); // Max confidence at 5+ invoices

    return {
      success: true,
      data: {
        suggestedDueDate,
        suggestedOrderBooker,
        suggestedWarehouseId,
        suggestedCurrency,
        confidence,
      },
    };
  } catch (error) {
    console.error("[getSmartDefaults]", error);
    return { success: false, error: "Failed to get smart defaults" };
  }
}

// ==================== FR-2: DUPLICATE DETECTION ====================

export async function detectDuplicateInvoices(
  customerId: string,
  lineItems: { productId?: string; unitPrice: string; quantity: string }[],
  netAmount: string,
  orgId: string
): Promise<{ success: boolean; data?: DuplicateInvoice[]; error?: string }> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get recent invoices for this customer
    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        netAmount: invoices.netAmount,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          gte(invoices.createdAt, sevenDaysAgo),
          inArray(invoices.status, [
            "draft",
            "pending",
            "approved",
            "sent",
            "paid",
            "partial",
          ])
        )
      )
      .orderBy(desc(invoices.createdAt));

    if (recentInvoices.length === 0) {
      return { success: true, data: [] };
    }

    const currentAmount = parseFloat(netAmount);
    const duplicates: DuplicateInvoice[] = [];

    for (const inv of recentInvoices) {
      const invAmount = parseFloat(inv.netAmount);

      // Check amount similarity (±20%)
      const amountDiff = Math.abs(currentAmount - invAmount);
      const amountThreshold = Math.max(currentAmount, invAmount) * 0.2;
      if (amountDiff > amountThreshold) continue;

      // Check item overlap
      const currentProductIds = lineItems
        .filter((item) => item.productId)
        .map((item) => item.productId as string);

      if (currentProductIds.length === 0) continue;

      const invItems = await db
        .select({ productId: invoiceItems.productId })
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, inv.id));

      const invProductIds = invItems
        .map((item) => item.productId)
        .filter(Boolean) as string[];

      if (invProductIds.length === 0) continue;

      // Calculate overlap
      const overlap = currentProductIds.filter((id) =>
        invProductIds.includes(id)
      ).length;
      const overlapPercentage =
        (overlap / Math.max(currentProductIds.length, invProductIds.length)) *
        100;

      if (overlapPercentage >= 80) {
        duplicates.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issueDate:
            inv.issueDate instanceof Date
              ? inv.issueDate.toISOString().split("T")[0]
              : String(inv.issueDate),
          netAmount: inv.netAmount,
          itemCount: invProductIds.length,
          overlapPercentage: Math.round(overlapPercentage),
        });
      }
    }

    return { success: true, data: duplicates };
  } catch (error) {
    console.error("[detectDuplicateInvoices]", error);
    return { success: false, error: "Failed to detect duplicates" };
  }
}

// ==================== FR-3: PRICING SUGGESTIONS ====================

export async function getPricingSuggestions(
  productId: string,
  customerId: string,
  orgId: string
): Promise<{ success: boolean; data?: PricingSuggestion; error?: string }> {
  try {
    // Last sold price to this customer
    const lastToCustomer = await db
      .select({ unitPrice: invoiceItems.unitPrice })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          eq(invoiceItems.productId, productId),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);

    // 30-day average price across all customers
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const avgPriceResult = await db
      .select({
        avgPrice: sql<string>`AVG(CAST(${invoiceItems.unitPrice} AS DECIMAL(12,2)))`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoiceItems.productId, productId),
          gte(invoices.createdAt, thirtyDaysAgo),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      );

    // Last 3 invoices to this customer for this product (price range)
    const last3Prices = await db
      .select({ unitPrice: invoiceItems.unitPrice })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          eq(invoiceItems.productId, productId),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(3);

    let customerPriceRange: PricingSuggestion["customerPriceRange"] = null;
    if (last3Prices.length > 0) {
      const prices = last3Prices.map((p) => parseFloat(p.unitPrice));
      customerPriceRange = {
        min: Math.min(...prices).toFixed(2),
        max: Math.max(...prices).toFixed(2),
        count: last3Prices.length,
      };
    }

    return {
      success: true,
      data: {
        lastSoldPrice: lastToCustomer[0]?.unitPrice || null,
        averagePrice30d: avgPriceResult[0]?.avgPrice || null,
        customerPriceRange,
      },
    };
  } catch (error) {
    console.error("[getPricingSuggestions]", error);
    return { success: false, error: "Failed to get pricing suggestions" };
  }
}

// ==================== FR-4: ANOMALY DETECTION ====================

export async function detectAnomalies(
  customerId: string,
  lineItems: { productId?: string; unitPrice: string; quantity: string }[],
  netAmount: string,
  orgId: string
): Promise<{ success: boolean; data?: AnomalyFlag[]; error?: string }> {
  try {
    const flags: AnomalyFlag[] = [];
    const currentAmount = parseFloat(netAmount);

    // Get customer's invoice history
    const customerHistory = await db
      .select({
        netAmount: invoices.netAmount,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          inArray(invoices.status, [
            "approved",
            "sent",
            "paid",
            "partial",
          ])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(50);

    // Check if new customer (no history)
    if (customerHistory.length === 0) {
      if (currentAmount > 500000) {
        flags.push({
          type: "new_customer",
          severity: "warning",
          message: `New customer with unusually high invoice amount (Rs. ${currentAmount.toLocaleString("en-PK")}). Consider requiring upfront payment.`,
          threshold: "500,000",
          actual: currentAmount.toLocaleString("en-PK"),
        });
      }
      return { success: true, data: flags };
    }

    // Calculate customer average
    const avgAmount =
      customerHistory.reduce(
        (sum, inv) => sum + parseFloat(inv.netAmount),
        0
      ) / customerHistory.length;

    // High amount detection (>3x average)
    if (currentAmount > avgAmount * 3) {
      flags.push({
        type: "high_amount",
        severity: "warning",
        message: `Invoice amount (Rs. ${currentAmount.toLocaleString("en-PK")}) is ${Math.round(currentAmount / avgAmount)}x higher than customer average (Rs. ${avgAmount.toLocaleString("en-PK")}).`,
        threshold: (avgAmount * 3).toFixed(2),
        actual: currentAmount.toFixed(2),
      });
    } else if (currentAmount > avgAmount * 2) {
      flags.push({
        type: "high_amount",
        severity: "info",
        message: `Invoice amount (Rs. ${currentAmount.toLocaleString("en-PK")}) is above customer average (Rs. ${avgAmount.toLocaleString("en-PK")}).`,
        threshold: (avgAmount * 2).toFixed(2),
        actual: currentAmount.toFixed(2),
      });
    }

    // Bulk order detection (>10x average quantity per product)
    for (const item of lineItems) {
      if (!item.productId) continue;
      const qty = parseFloat(item.quantity);

      const avgQtyResult = await db
        .select({
          avgQty: sql<string>`AVG(CAST(${invoiceItems.quantity} AS DECIMAL(10,2)))`,
        })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
        .where(
          and(
            eq(invoices.orgId, orgId),
            eq(invoices.customerId, customerId),
            eq(invoiceItems.productId, item.productId),
            inArray(invoices.status, [
              "approved",
              "sent",
              "paid",
              "partial",
            ])
          )
        );

      const avgQty = parseFloat(avgQtyResult[0]?.avgQty || "0");
      if (avgQty > 0 && qty > avgQty * 10) {
        const product = await db
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        flags.push({
          type: "bulk_order",
          severity: "info",
          message: `Bulk quantity for "${product[0]?.name || "Unknown"}" (${qty} units) is ${Math.round(qty / avgQty)}x higher than customer average (${avgQty.toFixed(0)} units).`,
          threshold: (avgQty * 10).toFixed(0),
          actual: qty.toString(),
        });
      }
    }

    return { success: true, data: flags };
  } catch (error) {
    console.error("[detectAnomalies]", error);
    return { success: false, error: "Failed to detect anomalies" };
  }
}

// ==================== FR-5: PAYMENT PREDICTION ====================

export async function getPaymentPrediction(
  customerId: string,
  orgId: string
): Promise<{ success: boolean; data?: PaymentPrediction; error?: string }> {
  try {
    // Get paid invoices with dates
    const paidInvoices = await db
      .select({
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.customerId, customerId),
          inArray(invoices.status, ["paid", "partial"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(30);

    if (paidInvoices.length < 3) {
      return {
        success: true,
        data: {
          onTimeRate: 0,
          averageDaysToPay: 0,
          totalInvoices: paidInvoices.length,
          prediction: "insufficient_data",
          confidence: 0,
        },
      };
    }

    // Calculate on-time rate and average days
    let onTimeCount = 0;
    let totalDays = 0;

    for (const inv of paidInvoices) {
      if (!inv.dueDate) continue;

      const dueDate = new Date(inv.dueDate);
      const createdAt = new Date(inv.createdAt);
      const daysToPay =
        (dueDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysToPay <= 0) {
        // Paid on or before due date
        onTimeCount++;
      }

      totalDays += Math.abs(daysToPay);
    }

    const onTimeRate =
      paidInvoices.filter((inv) => inv.dueDate).length > 0
        ? onTimeCount /
          paidInvoices.filter((inv) => inv.dueDate).length
        : 0;
    const averageDaysToPay =
      paidInvoices.filter((inv) => inv.dueDate).length > 0
        ? totalDays / paidInvoices.filter((inv) => inv.dueDate).length
        : 0;

    let prediction: PaymentPrediction["prediction"];
    if (onTimeRate >= 0.8) {
      prediction = "likely_on_time";
    } else if (onTimeRate >= 0.5) {
      prediction = "likely_delayed";
    } else {
      prediction = "likely_delayed";
    }

    const confidence = Math.min(paidInvoices.length / 10, 1); // Max confidence at 10+ invoices

    return {
      success: true,
      data: {
        onTimeRate: Math.round(onTimeRate * 100),
        averageDaysToPay: Math.round(averageDaysToPay),
        totalInvoices: paidInvoices.length,
        prediction,
        confidence,
      },
    };
  } catch (error) {
    console.error("[getPaymentPrediction]", error);
    return { success: false, error: "Failed to get payment prediction" };
  }
}
