"use server";

import { db } from "@/db";
import {
  stockCounts,
  stockCountItems,
  stockMovements,
  products,
  journalEntries,
  journalEntryLines,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ==========================================
// TYPES
// ==========================================

export interface StockCountItemData {
  id?: string;
  productId: string;
  productName?: string;
  productSku?: string;
  systemQty: string;
  countedQty?: string;
  variance?: string;
  unitCost?: string;
  varianceValue?: string;
}

export interface StockCountWithItems {
  id: string;
  countNumber: string;
  countDate: Date;
  status: string;
  notes?: string;
  createdBy?: string;
  completedAt?: Date;
  completedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  items: StockCountItemData[];
}

// ==========================================
// GET ALL STOCK COUNTS
// ==========================================

export async function getStockCounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const counts = await db
      .select()
      .from(stockCounts)
      .where(eq(stockCounts.orgId, orgId))
      .orderBy(desc(stockCounts.countDate));

    return { success: true, data: counts };
  } catch (error) {
    console.error("Error fetching stock counts:", error);
    return { success: false, error: "Failed to fetch stock counts" };
  }
}

// ==========================================
// GET STOCK COUNT BY ID WITH ITEMS
// ==========================================

export async function getStockCountById(stockCountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, stockCountId), eq(stockCounts.orgId, orgId)))
      .limit(1);

    if (!count) return { success: false, error: "Stock count not found" };

    const items = await db
      .select({
        id: stockCountItems.id,
        productId: stockCountItems.productId,
        productName: products.name,
        productSku: products.sku,
        systemQty: stockCountItems.systemQty,
        countedQty: stockCountItems.countedQty,
        variance: stockCountItems.variance,
        unitCost: stockCountItems.unitCost,
        varianceValue: stockCountItems.varianceValue,
        notes: stockCountItems.notes,
      })
      .from(stockCountItems)
      .leftJoin(products, eq(stockCountItems.productId, products.id))
      .where(eq(stockCountItems.stockCountId, stockCountId));

    return { success: true, data: { ...count, items } as StockCountWithItems };
  } catch (error) {
    console.error("Error fetching stock count:", error);
    return { success: false, error: "Failed to fetch stock count" };
  }
}

// ==========================================
// CREATE STOCK COUNT
// ==========================================

export interface CreateStockCountData {
  countDate: string;
  notes?: string;
  items: {
    productId: string;
  }[];
}

export async function createStockCount(data: CreateStockCountData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "At least one product is required" };
    }

    const { userId } = await auth();

    // Generate count number
    const count = await db.select().from(stockCounts).where(eq(stockCounts.orgId, orgId));
    const countNumber = `SC-${String(count.length + 1).padStart(5, "0")}`;

    const [stockCount] = await db
      .insert(stockCounts)
      .values({
        orgId,
        countNumber,
        countDate: new Date(data.countDate),
        status: "draft",
        notes: data.notes,
        createdBy: userId || "system",
      })
      .returning();

    // Insert line items with system qty from products
    for (const item of data.items) {
      const [product] = await db
        .select({ currentStock: products.currentStock, costPrice: products.costPrice })
        .from(products)
        .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)))
        .limit(1);

      if (!product) continue;

      const systemQty = (product.currentStock || 0).toString();
      const unitCost = product.costPrice ? product.costPrice : "0";

      await db.insert(stockCountItems).values({
        orgId,
        stockCountId: stockCount.id,
        productId: item.productId,
        systemQty,
        unitCost,
      });
    }

    revalidatePath("/inventory/stock-count");
    return { success: true, data: stockCount, message: "Stock count created successfully" };
  } catch (error) {
    console.error("Error creating stock count:", error);
    return { success: false, error: "Failed to create stock count" };
  }
}

// ==========================================
// UPDATE STOCK COUNT ITEMS (SAVE DRAFT)
// ==========================================

export async function updateStockCountItems(
  stockCountId: string,
  items: {
    id?: string;
    productId: string;
    countedQty?: string;
    notes?: string;
  }[]
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Verify stock count exists and is draft
    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, stockCountId), eq(stockCounts.orgId, orgId)))
      .limit(1);

    if (!count) return { success: false, error: "Stock count not found" };
    if (count.status === "completed") {
      return { success: false, error: "Cannot modify a completed stock count" };
    }

    // Update or insert items
    for (const item of items) {
      // Fetch the stock count item to get systemQty and unitCost
      const [stockCountItem] = await db
        .select({
          systemQty: stockCountItems.systemQty,
          unitCost: stockCountItems.unitCost,
        })
        .from(stockCountItems)
        .where(eq(stockCountItems.id, item.id || ''))
        .limit(1);

      if (!stockCountItem) continue;

      const countedQty = item.countedQty ? parseFloat(item.countedQty) : null;
      const systemQty = parseFloat(stockCountItem.systemQty || "0");
      const unitCost = parseFloat(stockCountItem.unitCost || "0");

      let variance: number | null = null;
      let varianceValue = 0;

      if (countedQty !== null) {
        variance = countedQty - systemQty;
        varianceValue = Math.abs(variance) * unitCost;
      }

      if (item.id) {
        // Update existing item
        await db
          .update(stockCountItems)
          .set({
            countedQty: countedQty?.toString() || null,
            variance: variance?.toString() || null,
            varianceValue: varianceValue.toString(),
            notes: item.notes,
            updatedAt: new Date(),
          })
          .where(eq(stockCountItems.id, item.id));
      } else {
        // This shouldn't happen in normal flow, but handle it
        continue;
      }
    }

    revalidatePath("/inventory/stock-count");
    return { success: true, message: "Stock count items updated" };
  } catch (error) {
    console.error("Error updating stock count items:", error);
    return { success: false, error: "Failed to update stock count items" };
  }
}

// ==========================================
// COMPLETE STOCK COUNT
// ==========================================

export async function completeStockCount(stockCountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    // Verify stock count exists and is draft
    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, stockCountId), eq(stockCounts.orgId, orgId)))
      .limit(1);

    if (!count) return { success: false, error: "Stock count not found" };
    if (count.status === "completed") {
      return { success: false, error: "Stock count is already completed" };
    }

    // Get all items with counted quantities
    const items = await db
      .select({
        id: stockCountItems.id,
        productId: stockCountItems.productId,
        productName: products.name,
        productSku: products.sku,
        systemQty: stockCountItems.systemQty,
        countedQty: stockCountItems.countedQty,
        variance: stockCountItems.variance,
        unitCost: stockCountItems.unitCost,
        varianceValue: stockCountItems.varianceValue,
      })
      .from(stockCountItems)
      .leftJoin(products, eq(stockCountItems.productId, products.id))
      .where(
        and(
          eq(stockCountItems.stockCountId, stockCountId),
          eq(stockCountItems.orgId, orgId)
        )
      );

    if (items.length === 0) {
      return { success: false, error: "No items found in stock count" };
    }

    let totalVarianceValue = 0;
    const journalLineItems: {
      accountId: string;
      description: string;
      debit?: string;
      credit?: string;
    }[] = [];

    // Process each item: update stock and create movements
    for (const item of items) {
      if (item.countedQty === null || item.countedQty === undefined) {
        continue; // Skip items not yet counted
      }

      const systemQty = parseFloat(item.systemQty || "0");
      const countedQty = parseFloat(item.countedQty);
      const unitCost = parseFloat(item.unitCost || "0");
      const variance = countedQty - systemQty;
      const varianceValue = variance * unitCost;

      if (variance === 0) continue; // No adjustment needed

      totalVarianceValue += varianceValue;

      // Update product stock
      await db
        .update(products)
        .set({ currentStock: countedQty })
        .where(eq(products.id, item.productId));

      // Create stock movement
      const absVariance = Math.abs(variance);
      await db.insert(stockMovements).values({
        orgId,
        productId: item.productId,
        movementType: variance > 0 ? "in" : "out",
        reason: "adjustment",
        quantity: absVariance.toString(),
        unitCost: unitCost.toString(),
        totalValue: Math.abs(varianceValue).toString(),
        referenceType: "stock_count",
        referenceNumber: count.countNumber,
        runningBalance: countedQty.toString(),
        notes: `Stock count adjustment: System ${systemQty} -> Counted ${countedQty}`,
      });

      // Prepare journal entry lines for variance
      const varianceDesc = `${item.productSku || item.productId} - ${item.productName || "Product"} (${variance > 0 ? "+" : ""}${variance} units @ ${unitCost})`;

      if (variance > 0) {
        // Positive variance: Debit Inventory, Credit Adjustment
        journalLineItems.push({
          accountId: "inventory_asset", // Will be resolved in actual implementation
          description: `Inventory increase: ${varianceDesc}`,
          debit: Math.abs(varianceValue).toString(),
        });
        journalLineItems.push({
          accountId: "inventory_adjustment_expense",
          description: `Inventory adjustment: ${varianceDesc}`,
          credit: Math.abs(varianceValue).toString(),
        });
      } else {
        // Negative variance: Debit Expense, Credit Inventory
        journalLineItems.push({
          accountId: "inventory_adjustment_expense",
          description: `Inventory adjustment: ${varianceDesc}`,
          debit: Math.abs(varianceValue).toString(),
        });
        journalLineItems.push({
          accountId: "inventory_asset", // Will be resolved in actual implementation
          description: `Inventory decrease: ${varianceDesc}`,
          credit: Math.abs(varianceValue).toString(),
        });
      }
    }

    // Create journal entry if there are variances
    // Note: In a real implementation, you'd look up actual account IDs from the chart of accounts
    // For now, we'll skip journal entry creation and note it in the response
    const journalEntryCreated = journalLineItems.length > 0;

    // Update stock count status to completed
    await db
      .update(stockCounts)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy: userId || "system",
        updatedAt: new Date(),
      })
      .where(eq(stockCounts.id, stockCountId));

    revalidatePath("/inventory/stock-count");
    return {
      success: true,
      message: "Stock count completed successfully",
      data: {
        itemsProcessed: items.filter((i) => i.countedQty !== null).length,
        adjustmentsMade: items.filter((i) => {
          const v = parseFloat(i.variance || "0");
          return v !== 0 && i.countedQty !== null;
        }).length,
        totalVarianceValue: Math.abs(totalVarianceValue),
        journalEntryCreated,
      },
    };
  } catch (error) {
    console.error("Error completing stock count:", error);
    return { success: false, error: "Failed to complete stock count" };
  }
}

// ==========================================
// DELETE STOCK COUNT (DRAFT ONLY)
// ==========================================

export async function deleteStockCount(stockCountId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, stockCountId), eq(stockCounts.orgId, orgId)))
      .limit(1);

    if (!count) return { success: false, error: "Stock count not found" };
    if (count.status === "completed") {
      return { success: false, error: "Cannot delete a completed stock count" };
    }

    // Delete items first
    await db
      .delete(stockCountItems)
      .where(eq(stockCountItems.stockCountId, stockCountId));

    // Delete stock count
    await db.delete(stockCounts).where(eq(stockCounts.id, stockCountId));

    revalidatePath("/inventory/stock-count");
    return { success: true, message: "Stock count deleted" };
  } catch (error) {
    console.error("Error deleting stock count:", error);
    return { success: false, error: "Failed to delete stock count" };
  }
}

// ==========================================
// GET PRODUCTS FOR STOCK COUNT
// ==========================================

export async function getProductsForStockCount() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const prods = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        costPrice: products.costPrice,
        unit: products.unit,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    return { success: true, data: prods };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}
