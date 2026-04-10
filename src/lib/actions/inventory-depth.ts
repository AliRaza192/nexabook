"use server";

import { db } from "@/db";
import {
  stockMovements, stockAdjustments, stockAdjustmentLines, stockValuationLogs,
  products, organizations, profiles,
} from "@/db/schema";
import { eq, and, desc, ilike, or, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId with auto-onboarding
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const userProfile = await db
      .select({ orgId: profiles.orgId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length > 0 && userProfile[0].orgId) {
      return userProfile[0].orgId;
    }

    const user = await currentUser();
    if (!user) return null;

    const timestamp = Date.now();
    const orgSlug = `my-business-${timestamp}`;
    const [newOrg] = await db
      .insert(organizations)
      .values({ name: "My Business", slug: orgSlug, currency: "PKR", fiscalYearStart: "07-01", country: "Pakistan" })
      .returning({ id: organizations.id });

    if (!newOrg) return null;

    const userEmail = user.emailAddresses[0]?.emailAddress || "";
    const userFullName = user.fullName || user.username || "User";

    await db.insert(profiles).values({
      userId, orgId: newOrg.id, role: "admin", fullName: userFullName, email: userEmail,
    });

    return newOrg.id;
  } catch (error) {
    return null;
  }
}

// ==========================================
// STOCK MOVEMENTS
// ==========================================

export async function getStockMovements(productId?: string, movementType?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(stockMovements.orgId, orgId)];
    if (productId) conditions.push(eq(stockMovements.productId, productId));
    if (movementType) conditions.push(eq(stockMovements.movementType, movementType as any));

    const movements = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        productSku: products.sku,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        totalValue: stockMovements.totalValue,
        referenceType: stockMovements.referenceType,
        referenceNumber: stockMovements.referenceNumber,
        runningBalance: stockMovements.runningBalance,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));

    return { success: true, data: movements };
  } catch (error) {
    return { success: false, error: "Failed to fetch stock movements" };
  }
}

export async function getStockMovementsByProduct(productId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const movements = await db
      .select({
        id: stockMovements.id,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        totalValue: stockMovements.totalValue,
        referenceType: stockMovements.referenceType,
        referenceNumber: stockMovements.referenceNumber,
        runningBalance: stockMovements.runningBalance,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.orgId, orgId), eq(stockMovements.productId, productId)))
      .orderBy(asc(stockMovements.createdAt));

    return { success: true, data: movements };
  } catch (error) {
    return { success: false, error: "Failed to fetch stock movements" };
  }
}

export interface StockMovementFormData {
  productId: string;
  movementType: "in" | "out";
  reason: "sale" | "purchase" | "return" | "transfer" | "adjustment" | "grn" | "delivery";
  quantity: string;
  unitCost: string;
  referenceType?: string;
  referenceNumber?: string;
  notes?: string;
}

export async function addStockMovement(data: StockMovementFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.productId || !data.quantity) {
      return { success: false, error: "Product and quantity are required" };
    }

    const quantity = parseFloat(data.quantity);
    const unitCost = parseFloat(data.unitCost || "0");
    const totalValue = quantity * unitCost;

    // Get current stock
    const [product] = await db
      .select({ currentStock: products.currentStock })
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.orgId, orgId)))
      .limit(1);

    if (!product) return { success: false, error: "Product not found" };

    const currentStock = product.currentStock || 0;
    const newStock = data.movementType === "in" ? currentStock + quantity : currentStock - quantity;

    if (newStock < 0) {
      return { success: false, error: "Insufficient stock. Current stock: " + currentStock };
    }

    // Create movement
    const [movement] = await db
      .insert(stockMovements)
      .values({
        orgId,
        productId: data.productId,
        movementType: data.movementType,
        reason: data.reason,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalValue: totalValue.toString(),
        referenceType: data.referenceType,
        referenceNumber: data.referenceNumber,
        runningBalance: newStock.toString(),
        notes: data.notes,
      })
      .returning();

    // Update product stock
    await db
      .update(products)
      .set({ currentStock: newStock })
      .where(eq(products.id, data.productId));

    revalidatePath("/inventory/stock");
    return { success: true, data: movement, message: "Stock movement recorded" };
  } catch (error) {
    return { success: false, error: "Failed to record stock movement" };
  }
}

// ==========================================
// STOCK ADJUSTMENTS
// ==========================================

export interface StockAdjustmentFormData {
  adjustmentDate: string;
  reason: "damage" | "gift" | "correction" | "expired" | "lost" | "found" | "sample";
  notes?: string;
  lines: {
    productId: string;
    adjustedQuantity: string;
    notes?: string;
  }[];
}

export async function getStockAdjustments(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(stockAdjustments.orgId, orgId)];
    if (searchQuery) {
      conditions.push(ilike(stockAdjustments.adjustmentNumber, `%${searchQuery}%`));
    }

    const adjustments = await db
      .select()
      .from(stockAdjustments)
      .where(and(...conditions))
      .orderBy(desc(stockAdjustments.adjustmentDate));

    return { success: true, data: adjustments };
  } catch (error) {
    return { success: false, error: "Failed to fetch stock adjustments" };
  }
}

export async function getStockAdjustmentById(adjustmentId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [adjustment] = await db
      .select()
      .from(stockAdjustments)
      .where(and(eq(stockAdjustments.id, adjustmentId), eq(stockAdjustments.orgId, orgId)))
      .limit(1);

    if (!adjustment) return { success: false, error: "Adjustment not found" };

    const lines = await db
      .select({
        id: stockAdjustmentLines.id,
        productId: stockAdjustmentLines.productId,
        productName: products.name,
        productSku: products.sku,
        currentStock: stockAdjustmentLines.currentStock,
        adjustedQuantity: stockAdjustmentLines.adjustedQuantity,
        difference: stockAdjustmentLines.difference,
        unitCost: stockAdjustmentLines.unitCost,
        totalValue: stockAdjustmentLines.totalValue,
        notes: stockAdjustmentLines.notes,
      })
      .from(stockAdjustmentLines)
      .leftJoin(products, eq(stockAdjustmentLines.productId, products.id))
      .where(eq(stockAdjustmentLines.stockAdjustmentId, adjustmentId));

    return { success: true, data: { ...adjustment, lines } };
  } catch (error) {
    return { success: false, error: "Failed to fetch adjustment" };
  }
}

export async function addStockAdjustment(data: StockAdjustmentFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one line item is required" };
    }

    // Generate adjustment number
    const count = await db.select().from(stockAdjustments).where(eq(stockAdjustments.orgId, orgId));
    const adjustmentNumber = `SA-${String(count.length + 1).padStart(5, "0")}`;

    const [adjustment] = await db
      .insert(stockAdjustments)
      .values({
        orgId,
        adjustmentNumber,
        adjustmentDate: new Date(data.adjustmentDate),
        reason: data.reason,
        notes: data.notes,
        approvalStatus: "pending_approval",
      })
      .returning();

    // Insert line items and update stock
    for (const line of data.lines) {
      const [product] = await db
        .select({ currentStock: products.currentStock, costPrice: products.costPrice })
        .from(products)
        .where(and(eq(products.id, line.productId), eq(products.orgId, orgId)))
        .limit(1);

      if (!product) continue;

      const currentStock = product.currentStock || 0;
      const newStock = parseFloat(line.adjustedQuantity);
      const difference = newStock - currentStock;
      const unitCost = product.costPrice ? parseFloat(product.costPrice) : 0;
      const totalValue = Math.abs(difference) * unitCost;

      await db.insert(stockAdjustmentLines).values({
        orgId,
        stockAdjustmentId: adjustment.id,
        productId: line.productId,
        currentStock: currentStock.toString(),
        adjustedQuantity: line.adjustedQuantity,
        difference: difference.toString(),
        unitCost: unitCost.toString(),
        totalValue: totalValue.toString(),
        notes: line.notes,
      });

      // Update product stock
      await db
        .update(products)
        .set({ currentStock: newStock })
        .where(eq(products.id, line.productId));

      // Record stock movement
      if (difference !== 0) {
        await db.insert(stockMovements).values({
          orgId,
          productId: line.productId,
          movementType: difference > 0 ? "in" : "out",
          reason: "adjustment",
          quantity: Math.abs(difference).toString(),
          unitCost: unitCost.toString(),
          totalValue: totalValue.toString(),
          referenceType: "stock_adjustment",
          referenceNumber: adjustmentNumber,
          runningBalance: newStock.toString(),
          notes: line.notes || `Stock adjustment: ${data.reason}`,
        });
      }
    }

    revalidatePath("/inventory/stock");
    return { success: true, data: adjustment, message: "Stock adjustment created" };
  } catch (error) {
    return { success: false, error: "Failed to create stock adjustment" };
  }
}

export async function approveStockAdjustment(adjustmentId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    await db
      .update(stockAdjustments)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(and(eq(stockAdjustments.id, adjustmentId), eq(stockAdjustments.orgId, orgId)));

    revalidatePath("/inventory/stock");
    return { success: true, message: "Stock adjustment approved" };
  } catch (error) {
    return { success: false, error: "Failed to approve stock adjustment" };
  }
}

// ==========================================
// SCHEDULED STOCK VALUATION
// ==========================================

export async function runStockValuation(method: "fifo" | "weighted_average", valuationDate?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const date = valuationDate ? new Date(valuationDate) : new Date();

    // Get all active products
    const allProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    let totalValue = 0;
    const valuationDetails: any[] = [];

    for (const product of allProducts) {
      const stock = product.currentStock || 0;
      const costPrice = product.costPrice ? parseFloat(product.costPrice) : 0;

      // For simplicity, we use cost price as weighted average
      // In a real FIFO implementation, you'd track individual purchase batches
      const productValue = stock * costPrice;
      totalValue += productValue;

      valuationDetails.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        stock,
        unitCost: costPrice,
        totalValue: productValue,
      });
    }

    const { userId } = await auth();

    const [log] = await db
      .insert(stockValuationLogs)
      .values({
        orgId,
        valuationDate: date,
        method,
        totalItems: allProducts.length,
        totalValue: totalValue.toString(),
        valuationDetails: JSON.stringify(valuationDetails),
        runBy: userId || "system",
        notes: `${method === "fifo" ? "FIFO" : "Weighted Average"} valuation run`,
      })
      .returning();

    revalidatePath("/inventory/valuation");
    return { success: true, data: log, message: "Stock valuation completed" };
  } catch (error) {
    return { success: false, error: "Failed to run stock valuation" };
  }
}

export async function getStockValuations() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const valuations = await db
      .select()
      .from(stockValuationLogs)
      .where(eq(stockValuationLogs.orgId, orgId))
      .orderBy(desc(stockValuationLogs.valuationDate));

    return { success: true, data: valuations };
  } catch (error) {
    return { success: false, error: "Failed to fetch stock valuations" };
  }
}

export async function getCurrentInventoryValue() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    let totalValue = 0;
    let totalItems = 0;
    const productDetails: any[] = [];

    for (const product of allProducts) {
      const stock = product.currentStock || 0;
      const costPrice = product.costPrice ? parseFloat(product.costPrice) : 0;
      const value = stock * costPrice;

      totalValue += value;
      totalItems += stock > 0 ? 1 : 0;

      productDetails.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: stock,
        costPrice,
        totalValue: value,
      });
    }

    return {
      success: true,
      data: {
        totalValue,
        totalItems,
        totalProducts: allProducts.length,
        products: productDetails,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to calculate inventory value" };
  }
}

// ==========================================
// GET PRODUCTS FOR DROPDOWNS
// ==========================================

export async function getProductsForStockAdjustment() {
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
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    return { success: true, data: prods };
  } catch (error) {
    return { success: false, error: "Failed to fetch products" };
  }
}
