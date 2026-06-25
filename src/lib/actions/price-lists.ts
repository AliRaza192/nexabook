"use server";

import { db } from "@/db";
import { priceLists, priceListItems, products, customers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

export async function getPriceLists() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const lists = await db
      .select({
        id: priceLists.id,
        name: priceLists.name,
        type: priceLists.type,
        isActive: priceLists.isActive,
        itemCount: sql<number>`(SELECT COUNT(*) FROM ${priceListItems} WHERE ${priceListItems.priceListId} = ${priceLists.id})`,
      })
      .from(priceLists)
      .where(eq(priceLists.orgId, orgId))
      .orderBy(priceLists.name);

    return { success: true, data: lists };
  } catch (error) {
    console.error("Error in price-lists.ts:", error);
    return { success: false, error: "Failed to load price lists" };
  }
}

export async function createPriceList(data: { name: string; type: string }) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db.insert(priceLists).values({ orgId, ...data });
    revalidatePath("/inventory/price-lists");
    return { success: true };
  } catch (error) {
    console.error("Error in price-lists.ts:", error);
    return { success: false, error: "Failed to create price list" };
  }
}

export async function getPriceListItems(priceListId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const items = await db
      .select({
        id: priceListItems.id,
        productId: priceListItems.productId,
        productName: products.name,
        productSku: products.sku,
        unitPrice: priceListItems.unitPrice,
        minQuantity: priceListItems.minQuantity,
      })
      .from(priceListItems)
      .innerJoin(products, eq(priceListItems.productId, products.id))
      .where(
        and(
          eq(priceListItems.priceListId, priceListId),
          eq(priceListItems.orgId, orgId)
        )
      )
      .orderBy(products.name);

    return { success: true, data: items };
  } catch (error) {
    console.error("Error in price-lists.ts:", error);
    return { success: false, error: "Failed to load price list items" };
  }
}

export async function setPriceListItem(data: {
  priceListId: string;
  productId: string;
  unitPrice: string;
  minQuantity?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select({ id: priceListItems.id })
      .from(priceListItems)
      .where(
        and(
          eq(priceListItems.priceListId, data.priceListId),
          eq(priceListItems.productId, data.productId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(priceListItems)
        .set({ unitPrice: data.unitPrice, minQuantity: data.minQuantity, updatedAt: new Date() })
        .where(eq(priceListItems.id, existing.id));
    } else {
      await db.insert(priceListItems).values({
        orgId, priceListId: data.priceListId,
        productId: data.productId, unitPrice: data.unitPrice,
        minQuantity: data.minQuantity,
      });
    }

    revalidatePath("/inventory/price-lists");
    return { success: true };
  } catch (error) {
    console.error("Error in price-lists.ts:", error);
    return { success: false, error: "Failed to set price" };
  }
}

export async function assignPriceList(customerId: string, priceListId: string | null) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(customers)
      .set({ priceListId, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));

    revalidatePath("/sales/customers");
    return { success: true };
  } catch (error) {
    console.error("Error in price-lists.ts:", error);
    return { success: false, error: "Failed to assign price list" };
  }
}
