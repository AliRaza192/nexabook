"use server";

import { db } from "@/db";
import type { Transaction } from "@/db";
import { products, productCategories, uoms, uomConversions, warehouses, warehouseStock, stockTransfers, stockTransferItems, stockMovements, productBatches } from "@/db/schema";
import { eq, and, or, ilike, desc, sql, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "./shared";
import { createAuditLog } from "./audit";
import { postTransaction, resolveAccount } from "@/lib/accounting/posting-engine";
import { captureException } from "@/lib/error-handler";

// Postgres unique_violation error code
const UNIQUE_VIOLATION = "23505";
function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && (error as { code: string }).code === UNIQUE_VIOLATION;
}

// Product interfaces
export interface ProductFormData {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  type: 'product' | 'service';
  unit?: string; // Still here for backward compatibility
  baseUomId?: string;
  saleUomId?: string;
  description?: string;
  isBatchTracked: boolean;
  isSerialTracked?: boolean;
  salePrice: string;
  costPrice: string;
  openingStock: string;
  minStockLevel: string;
  warehouseId?: string; // NEW: which warehouse the opening stock belongs to
  conversions?: {
    fromUomId: string;
    toUomId: string;
    conversionFactor: string;
  }[];
}

export interface UomFormData {
  name: string;
  description?: string;
}

export interface WarehouseFormData {
  name: string;
  location?: string;
  isDefault?: boolean;
}

export interface StockTransferFormData {
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: Date;
  referenceNo?: string;
  notes?: string;
  items: StockTransferItemData[];
}

export interface StockTransferItemData {
  productId: string;
  quantity: string;
  uomId?: string;
}

export interface ProductWithCategory {
  id: string;
  orgId: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  type: 'product' | 'service';
  unit: string | null;
  baseUomId: string | null;
  saleUomId: string | null;
  description: string | null;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  salePrice: string | null;
  costPrice: string | null;
  currentStock: string | null;
  minStockLevel: string | null;
  taxRate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Category interfaces
export interface CategoryFormData {
  name: string;
  description?: string;
}

// Get all products for current organization
export async function getProducts(searchQuery?: string, categoryId?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Build where conditions
    const conditions = [eq(products.orgId, orgId)];

    if (searchQuery) {
      conditions.push(
        or(
          ilike(products.name, `%${searchQuery}%`),
          ilike(products.sku, `%${searchQuery}%`),
          ilike(products.barcode, `%${searchQuery}%`),
        )!
      );
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    const result = await db
      .select({
        id: products.id,
        orgId: products.orgId,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryId: products.categoryId,
        type: products.type,
        unit: products.unit,
        baseUomId: products.baseUomId,
        saleUomId: products.saleUomId,
        description: products.description,
        isBatchTracked: products.isBatchTracked,
        isSerialTracked: products.isSerialTracked,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
        minStockLevel: products.minStockLevel,
        taxRate: products.taxRate,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: productCategories.id,
          name: productCategories.name,
        },
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(products.createdAt));

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getProducts" });
    return { success: false, error: "Failed to fetch products" };
  }
}

// Add a new product
// FIX (2026 review): opening stock previously only wrote to products.currentStock
// with no matching warehouseStock row — meaning per-warehouse views (getWarehouseStock,
// getProductStockByWarehouse) would show 0 while the product's global stock showed
// the opening quantity. Now, if a warehouseId is provided, the warehouseStock row is
// created atomically with the product in the same transaction.
export async function addProduct(data: ProductFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Validate required fields
    if (!data.name || !data.sku) {
      return { success: false, error: "Product name and SKU are required" };
    }

    let newProduct: typeof products.$inferSelect;
    try {
      newProduct = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(products)
          .values({
            orgId,
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            categoryId: data.categoryId || null,
            type: data.type,
            unit: data.unit || 'Pcs',
            baseUomId: data.baseUomId || null,
            saleUomId: data.saleUomId || null,
            description: data.description,
            isBatchTracked: data.isBatchTracked || false,
            isSerialTracked: data.isSerialTracked || false,
            salePrice: data.salePrice,
            costPrice: data.costPrice,
            currentStock: data.openingStock,
            minStockLevel: data.minStockLevel,
          })
          .returning();

        if (data.conversions && data.conversions.length > 0) {
          await tx.insert(uomConversions).values(
            data.conversions.map((conv) => ({
              orgId,
              productId: created.id,
              fromUomId: conv.fromUomId,
              toUomId: conv.toUomId,
              conversionFactor: conv.conversionFactor,
            })),
          );
        }

        // Keep per-warehouse stock in sync with the global opening stock.
        const openingQty = parseFloat(data.openingStock || "0");
        if (data.warehouseId && openingQty > 0) {
          await tx.insert(warehouseStock).values({
            orgId,
            warehouseId: data.warehouseId,
            productId: created.id,
            quantity: openingQty.toFixed(2),
          });

          await tx.insert(stockMovements).values({
            orgId,
            productId: created.id,
            movementType: "in",
            reason: "adjustment",
            quantity: openingQty.toFixed(2),
            unitCost: data.costPrice || "0",
            totalValue: (openingQty * parseFloat(data.costPrice || "0")).toFixed(2),
            referenceType: "product_opening_stock",
            referenceId: created.id,
            referenceNumber: data.sku,
            runningBalance: openingQty.toFixed(2),
          });
        }

        const unitCost = parseFloat(data.costPrice || "0");
        const openingValue = openingQty * unitCost;

        if (openingValue > 0) {
          const inventoryAcc = await resolveAccount(tx, orgId, "inventory");
          const equityAcc = await resolveAccount(tx, orgId, "opening_balance_equity");

          await postTransaction(tx, {
            orgId,
            description: `Opening stock for ${data.name} (${data.sku})`,
            date: new Date(),
            referenceType: "product_opening_stock",
            referenceId: created.id,
            sourceType: "product",
            lines: [
              { accountId: inventoryAcc.id, description: "Inventory asset", debit: openingValue.toFixed(2), credit: "0" },
              { accountId: equityAcc.id, description: "Opening balance equity", debit: "0", credit: openingValue.toFixed(2) },
            ],
          });
        }

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { success: false, error: "Product with this SKU already exists" };
      }
      throw error;
    }

    revalidatePath('/inventory');

    await createAuditLog({ action: "PRODUCT_CREATED", entityType: "product", entityId: newProduct.id });
    return { success: true, data: newProduct, message: "Product added successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "addProduct" });
    return { success: false, error: "Failed to add product" };
  }
}

// Get all categories for current organization
export async function getCategories() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const cats = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.orgId, orgId), eq(productCategories.isActive, true)))
      .orderBy(productCategories.name);

    return { success: true, data: cats };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getCategories" });
    return { success: false, error: "Failed to fetch categories" };
  }
}

// Add a new category
export async function addCategory(data: CategoryFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.name) {
      return { success: false, error: "Category name is required" };
    }

    let newCategory: typeof productCategories.$inferSelect;
    try {
      [newCategory] = await db
        .insert(productCategories)
        .values({
          orgId,
          name: data.name,
          description: data.description,
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { success: false, error: "Category already exists" };
      }
      throw error;
    }

    revalidatePath('/inventory');

    await createAuditLog({ action: "CATEGORY_CREATED", entityType: "category", entityId: newCategory.id });
    return { success: true, data: newCategory, message: "Category added successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "addCategory" });
    return { success: false, error: "Failed to add category" };
  }
}

// Get product by ID
export async function getProductById(productId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.orgId, orgId)))
      .limit(1);

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    return { success: true, data: product };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getProductById" });
    return { success: false, error: "Failed to fetch product" };
  }
}

// Update product
export async function updateProduct(productId: string, data: Partial<ProductFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.baseUomId !== undefined) updateData.baseUomId = data.baseUomId;
    if (data.saleUomId !== undefined) updateData.saleUomId = data.saleUomId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isBatchTracked !== undefined) updateData.isBatchTracked = data.isBatchTracked;
    if (data.isSerialTracked !== undefined) updateData.isSerialTracked = data.isSerialTracked;
    if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.minStockLevel !== undefined) updateData.minStockLevel = data.minStockLevel;

    let updatedProduct: typeof products.$inferSelect | undefined;
    try {
      [updatedProduct] = await db
        .update(products)
        .set(updateData)
        .where(and(eq(products.id, productId), eq(products.orgId, orgId)))
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { success: false, error: "Product with this SKU already exists" };
      }
      throw error;
    }

    if (!updatedProduct) {
      return { success: false, error: "Product not found" };
    }

    // Handle conversions update (delete and re-insert for simplicity in this prototype)
    if (data.conversions !== undefined) {
      await db.delete(uomConversions).where(eq(uomConversions.productId, productId));

      if (data.conversions.length > 0) {
        const conversionsToInsert = data.conversions.map((conv) => ({
          orgId,
          productId: productId,
          fromUomId: conv.fromUomId,
          toUomId: conv.toUomId,
          conversionFactor: conv.conversionFactor,
        }));

        await db.insert(uomConversions).values(conversionsToInsert);
      }
    }

    revalidatePath('/inventory');

    await createAuditLog({ action: "PRODUCT_UPDATED", entityType: "product", entityId: productId });
    return { success: true, data: updatedProduct, message: "Product updated successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "updateProduct" });
    return { success: false, error: "Failed to update product" };
  }
}

// Get all UOMs for current organization
export async function getUoms() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const result = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.orgId, orgId), eq(uoms.isActive, true)))
      .orderBy(uoms.name);

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getUoms" });
    return { success: false, error: "Failed to fetch UOMs" };
  }
}

// Add a new UOM
export async function addUom(data: UomFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.name) {
      return { success: false, error: "UOM name is required" };
    }

    const [newUom] = await db
      .insert(uoms)
      .values({
        orgId,
        name: data.name,
        description: data.description,
      })
      .returning();

    revalidatePath('/inventory');

    await createAuditLog({ action: "UOM_CREATED", entityType: "uom", entityId: newUom.id });
    return { success: true, data: newUom, message: "UOM added successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "addUom" });
    return { success: false, error: "Failed to add UOM" };
  }
}

// Convert to base unit logic
export async function convertToBaseUnit(productId: string, quantity: number, currentUomId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return quantity;

    const [product] = await db
      .select({ baseUomId: products.baseUomId })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.orgId, orgId)))
      .limit(1);

    if (!product || !product.baseUomId || product.baseUomId === currentUomId) {
      return quantity;
    }

    const [conversion] = await db
      .select({ conversionFactor: uomConversions.conversionFactor })
      .from(uomConversions)
      .where(
        and(
          eq(uomConversions.productId, productId),
          eq(uomConversions.fromUomId, currentUomId),
          eq(uomConversions.toUomId, product.baseUomId)
        )
      )
      .limit(1);

    if (conversion) {
      return quantity * parseFloat(conversion.conversionFactor);
    }

    return quantity;
  } catch (error) {
    captureException(error, { module: "inventory", function: "convertToBaseUnit" });
    return quantity;
  }
}

/**
 * Same conversion logic as convertToBaseUnit(), but runs inside an existing
 * transaction. Needed because transferStock() previously had a comment saying
 * "we don't have it in tx scope easily" and silently skipped conversion,
 * moving the wrong quantity whenever a transfer used a non-base UOM.
 */
async function convertToBaseUnitInTx(
  tx: Transaction,
  orgId: string,
  productId: string,
  quantity: number,
  currentUomId: string,
): Promise<number> {
  const [product] = await tx
    .select({ baseUomId: products.baseUomId })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.orgId, orgId)))
    .limit(1);

  if (!product || !product.baseUomId || product.baseUomId === currentUomId) {
    return quantity;
  }

  const [conversion] = await tx
    .select({ conversionFactor: uomConversions.conversionFactor })
    .from(uomConversions)
    .where(
      and(
        eq(uomConversions.productId, productId),
        eq(uomConversions.fromUomId, currentUomId),
        eq(uomConversions.toUomId, product.baseUomId),
      ),
    )
    .limit(1);

  if (conversion) {
    return quantity * parseFloat(conversion.conversionFactor);
  }

  return quantity;
}

// Delete product (soft delete by setting isActive to false)
export async function deleteProduct(productId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    await db
      .update(products)
      .set({ isActive: false })
      .where(and(eq(products.id, productId), eq(products.orgId, orgId)));

    revalidatePath('/inventory');

    await createAuditLog({ action: "PRODUCT_DELETED", entityType: "product", entityId: productId });
    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "deleteProduct" });
    return { success: false, error: "Failed to delete product" };
  }
}

// Get available batches for a product and warehouse
export async function getAvailableBatches(productId: string, warehouseId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.orgId, orgId),
          eq(productBatches.productId, productId),
          eq(productBatches.warehouseId, warehouseId),
          sql`${productBatches.currentQty} > 0`
        )
      )
      .orderBy(asc(productBatches.expiryDate));

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getAvailableBatches" });
    return { success: false, error: "Failed to fetch available batches" };
  }
}

// Auto-select batch based on FIFO or FEFO
export async function autoSelectBatch(productId: string, warehouseId: string, method: 'FIFO' | 'FEFO' = 'FEFO') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return null;

    const orderBy = method === 'FEFO'
      ? [asc(productBatches.expiryDate)]
      : [asc(productBatches.createdAt)];

    const [batch] = await db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.orgId, orgId),
          eq(productBatches.productId, productId),
          eq(productBatches.warehouseId, warehouseId),
          sql`${productBatches.currentQty} > 0`
        )
      )
      .orderBy(...orderBy)
      .limit(1);

    return batch || null;
  } catch (error) {
    captureException(error, { module: "inventory", function: "autoSelectBatch" });
    return null;
  }
}

// Update batch stock (Helper for Sales/Purchases)
// FIX (2026 review): tx typed as `any` before — now uses the real Transaction
// type from db/index.ts so misuse is caught at compile time.
export async function updateBatchStock(tx: Transaction, batchId: string, quantityChange: number) {
  const [existing] = await tx
    .select()
    .from(productBatches)
    .where(eq(productBatches.id, batchId))
    .limit(1);

  if (!existing) {
    throw new Error("Batch not found");
  }

  const newQty = parseFloat(existing.currentQty) + quantityChange;
  if (newQty < 0) {
    throw new Error(`Insufficient stock in batch ${existing.batchNo}. Available: ${existing.currentQty}`);
  }

  await tx
    .update(productBatches)
    .set({ currentQty: newQty.toFixed(2), updatedAt: new Date() })
    .where(eq(productBatches.id, batchId));
}

// Get expiry report data
export async function getExpiryReport() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({
        id: productBatches.id,
        batchNo: productBatches.batchNo,
        expiryDate: productBatches.expiryDate,
        currentQty: productBatches.currentQty,
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        warehouseName: warehouses.name,
      })
      .from(productBatches)
      .innerJoin(products, eq(productBatches.productId, products.id))
      .innerJoin(warehouses, eq(productBatches.warehouseId, warehouses.id))
      .where(
        and(
          eq(productBatches.orgId, orgId),
          sql`${productBatches.currentQty} > 0`
        )
      )
      .orderBy(asc(productBatches.expiryDate));

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getExpiryReport" });
    return { success: false, error: "Failed to fetch expiry report" };
  }
}

// Get inventory stats
// FIX (2026 review): was fetching every product and filtering in memory.
// Now aggregates at the SQL level, which scales past a few thousand SKUs.
export async function getInventoryStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [row] = await db
      .select({
        totalItems: sql<number>`count(*)::int`,
        lowStockItems: sql<number>`count(*) filter (
          where ${products.currentStock}::numeric > 0
          and ${products.currentStock}::numeric <= ${products.minStockLevel}::numeric
        )::int`,
        outOfStockItems: sql<number>`count(*) filter (
          where coalesce(${products.currentStock}::numeric, 0) = 0
        )::int`,
        totalStockValue: sql<number>`coalesce(sum(
          coalesce(${products.currentStock}::numeric, 0) * coalesce(${products.costPrice}::numeric, 0)
        ), 0)::numeric`,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    return {
      success: true,
      data: {
        totalItems: row?.totalItems || 0,
        lowStockItems: row?.lowStockItems || 0,
        outOfStockItems: row?.outOfStockItems || 0,
        totalStockValue: Number(row?.totalStockValue || 0),
      },
    };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getInventoryStats" });
    return { success: false, error: "Failed to fetch inventory stats" };
  }
}

// Get low stock products (items at or below min stock level)
// FIX (2026 review): filtering moved to SQL (was fetch-all + in-memory filter).
export async function getLowStockProducts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const lowStockProducts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        minStockLevel: products.minStockLevel,
      })
      .from(products)
      .where(
        and(
          eq(products.orgId, orgId),
          eq(products.isActive, true),
          sql`${products.currentStock}::numeric <= ${products.minStockLevel}::numeric`,
        )
      );

    return { success: true, data: lowStockProducts };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getLowStockProducts" });
    return { success: false, error: "Failed to fetch low stock products" };
  }
}

// Get all warehouses for current organization
export async function getWarehouses() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.orgId, orgId), eq(warehouses.isActive, true)))
      .orderBy(desc(warehouses.isDefault), warehouses.name);

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getWarehouses" });
    return { success: false, error: "Failed to fetch warehouses" };
  }
}

// Add a new warehouse
export async function addWarehouse(data: WarehouseFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name) return { success: false, error: "Warehouse name is required" };

    // If setting as default, unset others
    if (data.isDefault) {
      await db
        .update(warehouses)
        .set({ isDefault: false })
        .where(eq(warehouses.orgId, orgId));
    }

    const [newWarehouse] = await db
      .insert(warehouses)
      .values({
        orgId,
        name: data.name,
        location: data.location,
        isDefault: data.isDefault || false,
      })
      .returning();

    revalidatePath('/inventory/warehouses');
    await createAuditLog({ action: "WAREHOUSE_CREATED", entityType: "warehouse", entityId: newWarehouse.id });
    return { success: true, data: newWarehouse, message: "Warehouse added successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "addWarehouse" });
    return { success: false, error: "Failed to add warehouse" };
  }
}

// Get stock for a specific warehouse and product
// FIX (2026 review): had NO orgId scoping at all — any authenticated user who
// knew or guessed a warehouseId/productId pair could read another org's stock
// level. Now scoped via warehouseStock.orgId directly.
export async function getWarehouseStock(productId: string, warehouseId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [stock] = await db
      .select({ quantity: warehouseStock.quantity })
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.orgId, orgId),
          eq(warehouseStock.productId, productId),
          eq(warehouseStock.warehouseId, warehouseId)
        )
      )
      .limit(1);

    return { success: true, data: stock?.quantity || "0" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getWarehouseStock" });
    return { success: false, error: "Failed to fetch warehouse stock" };
  }
}

// Get all warehouse stocks for a product
export async function getProductStockByWarehouse(productId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        quantity: warehouseStock.quantity,
      })
      .from(warehouses)
      .leftJoin(
        warehouseStock,
        and(
          eq(warehouses.id, warehouseStock.warehouseId),
          eq(warehouseStock.productId, productId),
          eq(warehouseStock.orgId, orgId),
        )
      )
      .where(and(eq(warehouses.orgId, orgId), eq(warehouses.isActive, true)));

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "inventory", function: "getProductStockByWarehouse" });
    return { success: false, error: "Failed to fetch product stock by warehouse" };
  }
}

// Transfer stock between warehouses
// FIX (2026 review):
//  - fromWarehouseId/toWarehouseId are now verified to belong to the caller's
//    org before anything is written (previously trusted blindly — IDOR risk).
//  - UOM conversion is now actually performed inside the transaction (was a
//    silent no-op before, moving the raw entered quantity regardless of unit).
//  - orgId now written on warehouseStock and stockTransferItems rows.
export async function transferStock(data: StockTransferFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (data.fromWarehouseId === data.toWarehouseId) {
      return { success: false, error: "Source and destination warehouses must be different" };
    }

    const orgWarehouses = await db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.orgId, orgId),
          or(eq(warehouses.id, data.fromWarehouseId), eq(warehouses.id, data.toWarehouseId)),
        ),
      );
    if (orgWarehouses.length !== 2) {
      return { success: false, error: "One or both warehouses do not belong to your organization" };
    }

    const result = await db.transaction(async (tx) => {
      // 1. Create Stock Transfer record
      const [transfer] = await tx
        .insert(stockTransfers)
        .values({
          orgId,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          transferDate: data.transferDate,
          referenceNo: data.referenceNo,
          notes: data.notes,
          status: 'Completed',
        })
        .returning();

      for (const item of data.items) {
        const enteredQuantity = parseFloat(item.quantity);

        // Actually perform the UOM -> base-unit conversion now (was a no-op before).
        let baseQuantity = enteredQuantity;
        if (item.uomId) {
          baseQuantity = await convertToBaseUnitInTx(tx, orgId, item.productId, enteredQuantity, item.uomId);
        }

        // 2. Add Stock Transfer Items
        await tx.insert(stockTransferItems).values({
          orgId,
          transferId: transfer.id,
          productId: item.productId,
          uomId: item.uomId,
          quantity: item.quantity,
        });

        // 3. Subtract from source warehouse
        const [fromStock] = await tx
          .select()
          .from(warehouseStock)
          .where(and(
            eq(warehouseStock.orgId, orgId),
            eq(warehouseStock.warehouseId, data.fromWarehouseId),
            eq(warehouseStock.productId, item.productId),
          ))
          .limit(1);

        if (!fromStock || parseFloat(fromStock.quantity) < baseQuantity) {
          const [prod] = await tx.select({ name: products.name }).from(products).where(eq(products.id, item.productId)).limit(1);
          throw new Error(`Insufficient stock for ${prod?.name || 'product'} in source warehouse`);
        }

        const sourceNewQty = (parseFloat(fromStock.quantity) - baseQuantity).toFixed(2);
        await tx
          .update(warehouseStock)
          .set({ quantity: sourceNewQty })
          .where(eq(warehouseStock.id, fromStock.id));

        // 4. Add to destination warehouse
        const [toStock] = await tx
          .select()
          .from(warehouseStock)
          .where(and(
            eq(warehouseStock.orgId, orgId),
            eq(warehouseStock.warehouseId, data.toWarehouseId),
            eq(warehouseStock.productId, item.productId),
          ))
          .limit(1);

        const destNewQty = toStock
          ? (parseFloat(toStock.quantity) + baseQuantity).toFixed(2)
          : baseQuantity.toFixed(2);
        if (toStock) {
          await tx
            .update(warehouseStock)
            .set({ quantity: destNewQty })
            .where(eq(warehouseStock.id, toStock.id));
        } else {
          await tx.insert(warehouseStock).values({
            orgId,
            warehouseId: data.toWarehouseId,
            productId: item.productId,
            quantity: destNewQty,
          });
        }

        // 5. Log stock movements
        // Out from source
        await tx.insert(stockMovements).values({
          orgId,
          productId: item.productId,
          movementType: 'out',
          reason: 'transfer',
          quantity: String(baseQuantity),
          referenceType: 'stock_transfer',
          referenceId: transfer.id,
          referenceNumber: data.referenceNo || transfer.id,
          runningBalance: sourceNewQty,
        });

        // In to destination
        await tx.insert(stockMovements).values({
          orgId,
          productId: item.productId,
          movementType: 'in',
          reason: 'transfer',
          quantity: String(baseQuantity),
          referenceType: 'stock_transfer',
          referenceId: transfer.id,
          referenceNumber: data.referenceNo || transfer.id,
          runningBalance: destNewQty,
        });
      }

      return transfer;
    });

    revalidatePath('/inventory/transfers');
    revalidatePath('/inventory');
    await createAuditLog({ action: "STOCK_TRANSFERRED", entityType: "stockTransfer", entityId: result.id });
    return { success: true, data: result, message: "Stock transferred successfully" };
  } catch (error) {
    captureException(error, { module: "inventory", function: "transferStock" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to transfer stock" };
  }
}

// Update warehouse stock (Helper for Sales/Purchases)
// FIX (2026 review): tx was `any`, no orgId scoping/param — now properly
// typed and org-scoped so callers can't accidentally touch another org's row.
export async function updateWarehouseStock(tx: Transaction, orgId: string, warehouseId: string, productId: string, quantityChange: number) {
  const [existing] = await tx
    .select()
    .from(warehouseStock)
    .where(and(
      eq(warehouseStock.orgId, orgId),
      eq(warehouseStock.warehouseId, warehouseId),
      eq(warehouseStock.productId, productId),
    ))
    .limit(1);

  if (existing) {
    const newQty = parseFloat(existing.quantity) + quantityChange;
    if (newQty < 0) {
      const [prod] = await tx.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);
      throw new Error(`Insufficient stock for ${prod?.name || 'product'} in the selected warehouse`);
    }
    await tx
      .update(warehouseStock)
      .set({ quantity: newQty.toFixed(2) })
      .where(eq(warehouseStock.id, existing.id));
  } else {
    if (quantityChange < 0) {
      const [prod] = await tx.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);
      throw new Error(`No stock for ${prod?.name || 'product'} in the selected warehouse`);
    }
    await tx.insert(warehouseStock).values({
      orgId,
      warehouseId,
      productId,
      quantity: quantityChange.toFixed(2),
    });
  }
}

// Product stats interface
export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
}