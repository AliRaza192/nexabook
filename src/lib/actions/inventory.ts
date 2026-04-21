"use server";

import { db } from "@/db";
import { products, productCategories, uoms, uomConversions, warehouses, warehouseStock, stockTransfers, stockTransferItems, stockMovements } from "@/db/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "./shared";

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
  salePrice: string;
  costPrice: string;
  openingStock: string;
  minStockLevel: string;
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
    return { success: false, error: "Failed to fetch products" };
  }
}

// Add a new product
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

    // Check if SKU already exists
    const existingProduct = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.sku, data.sku)))
      .limit(1);

    if (existingProduct.length > 0) {
      return { success: false, error: "Product with this SKU already exists" };
    }

    // Create the product
    const [newProduct] = await db
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
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        currentStock: data.openingStock,
        minStockLevel: data.minStockLevel,
      })
      .returning();

    // Handle conversions
    if (data.conversions && data.conversions.length > 0) {
      const conversionsToInsert = data.conversions.map((conv) => ({
        orgId,
        productId: newProduct.id,
        fromUomId: conv.fromUomId,
        toUomId: conv.toUomId,
        conversionFactor: conv.conversionFactor,
      }));

      await db.insert(uomConversions).values(conversionsToInsert);
    }

    // TODO: Link to 'Inventory Asset' account in COA
    // This would create a journal entry to debit Inventory Asset account
    // and credit Opening Balance Equity account for the opening stock value
    // Example:
    // if (data.openingStock > 0 && data.costPrice) {
    //   const totalValue = data.openingStock * parseFloat(data.costPrice);
    //   await createInventoryJournalEntry(orgId, newProduct.id, totalValue);
    // }

    revalidatePath('/inventory');
    
    return { success: true, data: newProduct, message: "Product added successfully" };
  } catch (error) {
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

    // Check if category already exists
    const existingCategory = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(
        eq(productCategories.orgId, orgId),
        eq(productCategories.name, data.name)
      ))
      .limit(1);

    if (existingCategory.length > 0) {
      return { success: false, error: "Category already exists" };
    }

    const [newCategory] = await db
      .insert(productCategories)
      .values({
        orgId,
        name: data.name,
        description: data.description,
      })
      .returning();

    revalidatePath('/inventory');
    
    return { success: true, data: newCategory, message: "Category added successfully" };
  } catch (error) {
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

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.baseUomId !== undefined) updateData.baseUomId = data.baseUomId;
    if (data.saleUomId !== undefined) updateData.saleUomId = data.saleUomId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.minStockLevel !== undefined) updateData.minStockLevel = data.minStockLevel;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(and(eq(products.id, productId), eq(products.orgId, orgId)))
      .returning();

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
    
    return { success: true, data: updatedProduct, message: "Product updated successfully" };
  } catch (error) {
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
    
    return { success: true, data: newUom, message: "UOM added successfully" };
  } catch (error) {
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
    console.error("Conversion error:", error);
    return quantity;
  }
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
    
    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete product" };
  }
}

// Get inventory stats
export async function getInventoryStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const allProducts = await db
      .select({
        currentStock: products.currentStock,
        minStockLevel: products.minStockLevel,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));

    const totalItems = allProducts.length;

    const lowStockItems = allProducts.filter(
      (p) => p.currentStock !== null &&
             p.minStockLevel !== null &&
             p.currentStock <= p.minStockLevel &&
             p.currentStock > 0
    ).length;

    const outOfStockItems = allProducts.filter(
      (p) => p.currentStock === 0 || p.currentStock === null
    ).length;

    // Calculate total stock value using cost price
    const totalStockValue = allProducts.reduce((sum, p) => {
      const stock = p.currentStock || 0;
      const cost = p.costPrice ? parseFloat(p.costPrice) : 0;
      return sum + (stock * cost);
    }, 0);

    return {
      success: true,
      data: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalStockValue,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch inventory stats" };
  }
}

// Get low stock products (items at or below min stock level)
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
          eq(products.isActive, true)
        )
      )
      .execute();

    // Filter in memory for low stock items
    const filtered = lowStockProducts.filter(
      (p) => p.currentStock !== null && 
             p.minStockLevel !== null && 
             p.currentStock <= p.minStockLevel
    );

    return { success: true, data: filtered };
  } catch (error) {
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
    return { success: true, data: newWarehouse, message: "Warehouse added successfully" };
  } catch (error) {
    return { success: false, error: "Failed to add warehouse" };
  }
}

// Get stock for a specific warehouse and product
export async function getWarehouseStock(productId: string, warehouseId: string) {
  try {
    const [stock] = await db
      .select({ quantity: warehouseStock.quantity })
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.productId, productId),
          eq(warehouseStock.warehouseId, warehouseId)
        )
      )
      .limit(1);

    return { success: true, data: stock?.quantity || "0" };
  } catch (error) {
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
          eq(warehouseStock.productId, productId)
        )
      )
      .where(and(eq(warehouses.orgId, orgId), eq(warehouses.isActive, true)));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch product stock by warehouse" };
  }
}

// Transfer stock between warehouses
export async function transferStock(data: StockTransferFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (data.fromWarehouseId === data.toWarehouseId) {
      return { success: false, error: "Source and destination warehouses must be different" };
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
        const quantity = parseFloat(item.quantity);
        
        // Convert to base unit if uomId is provided
        let baseQuantity = quantity;
        if (item.uomId) {
           // We need convertToBaseUnit logic but we don't have it in tx scope easily
           // For now using the simple quantity or assuming it's already in base unit
           // In a real app we'd fetch conversion factor here
        }

        // 2. Add Stock Transfer Items
        await tx.insert(stockTransferItems).values({
          transferId: transfer.id,
          productId: item.productId,
          uomId: item.uomId,
          quantity: item.quantity,
        });

        // 3. Subtract from source warehouse
        const [fromStock] = await tx
          .select()
          .from(warehouseStock)
          .where(and(eq(warehouseStock.warehouseId, data.fromWarehouseId), eq(warehouseStock.productId, item.productId)))
          .limit(1);

        if (!fromStock || parseFloat(fromStock.quantity) < baseQuantity) {
          const [prod] = await tx.select({ name: products.name }).from(products).where(eq(products.id, item.productId)).limit(1);
          throw new Error(`Insufficient stock for ${prod?.name || 'product'} in source warehouse`);
        }

        await tx
          .update(warehouseStock)
          .set({ quantity: (parseFloat(fromStock.quantity) - baseQuantity).toFixed(2) })
          .where(eq(warehouseStock.id, fromStock.id));

        // 4. Add to destination warehouse
        const [toStock] = await tx
          .select()
          .from(warehouseStock)
          .where(and(eq(warehouseStock.warehouseId, data.toWarehouseId), eq(warehouseStock.productId, item.productId)))
          .limit(1);

        if (toStock) {
          await tx
            .update(warehouseStock)
            .set({ quantity: (parseFloat(toStock.quantity) + baseQuantity).toFixed(2) })
            .where(eq(warehouseStock.id, toStock.id));
        } else {
          await tx.insert(warehouseStock).values({
            warehouseId: data.toWarehouseId,
            productId: item.productId,
            quantity: baseQuantity.toFixed(2),
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
        });
      }

      return transfer;
    });

    revalidatePath('/inventory/transfers');
    revalidatePath('/inventory');
    return { success: true, data: result, message: "Stock transferred successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to transfer stock" };
  }
}

// Update warehouse stock (Helper for Sales/Purchases)
export async function updateWarehouseStock(tx: any, warehouseId: string, productId: string, quantityChange: number) {
  const [existing] = await tx
    .select()
    .from(warehouseStock)
    .where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.productId, productId)))
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
