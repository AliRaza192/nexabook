"use server";

import { db } from "@/db";
import { products, productCategories, organizations, profiles } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId with auto-onboarding
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    // Get user's profile from database
    const userProfile = await db
      .select({
        orgId: profiles.orgId,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    // If profile exists, return orgId
    if (userProfile.length > 0 && userProfile[0].orgId) {
      return userProfile[0].orgId;
    }

    // Auto-onboarding: User doesn't have a profile yet, create one automatically
    const user = await currentUser();
    if (!user) {
      return null;
    }

    // Create default organization
    const fullName = user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
    const slug = fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const [org] = await db
      .insert(organizations)
      .values({
        name: fullName + "'s Organization",
        slug,
      })
      .returning({ id: organizations.id });

    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId,
        orgId: org.id,
        role: 'admin',
        fullName,
        email: user.emailAddresses[0]?.emailAddress || '',
      })
      .returning({ orgId: profiles.orgId });

    return newProfile.orgId;
  } catch (error) {
    return null;
  }
}

// Product interfaces
export interface ProductFormData {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  type: 'product' | 'service';
  unit?: string;
  description?: string;
  salePrice: string;
  costPrice: string;
  openingStock: number;
  minStockLevel: number;
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
  description: string | null;
  salePrice: string | null;
  costPrice: string | null;
  currentStock: number | null;
  minStockLevel: number | null;
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
        description: data.description,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        currentStock: data.openingStock,
        minStockLevel: data.minStockLevel,
      })
      .returning();

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

    revalidatePath('/inventory');
    
    return { success: true, data: updatedProduct, message: "Product updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update product" };
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

// Product stats interface
export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
}
