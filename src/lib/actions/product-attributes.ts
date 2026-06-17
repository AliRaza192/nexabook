"use server";

import { db } from "@/db";
import { productAttributes, products } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

export interface ProductAttributeData {
  name: string;
  value: string;
}

export async function getProductAttributes(productId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    const attrs = await db
      .select()
      .from(productAttributes)
      .where(and(
        eq(productAttributes.orgId, orgId),
        eq(productAttributes.productId, productId)
      ))
      .orderBy(productAttributes.name);

    return { success: true, data: attrs };
  } catch (error) {
    return { success: false, error: "Failed to fetch attributes" };
  }
}

export async function saveProductAttributes(
  productId: string,
  attributes: ProductAttributeData[]
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    // Delete existing attributes for this product
    await db
      .delete(productAttributes)
      .where(and(
        eq(productAttributes.orgId, orgId),
        eq(productAttributes.productId, productId)
      ));

    // Insert new attributes
    if (attributes.length > 0) {
      await db.insert(productAttributes).values(
        attributes.map((attr) => ({
          orgId,
          productId,
          name: attr.name,
          value: attr.value,
        }))
      );
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save attributes" };
  }
}

export async function getAllAttributeNames() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    const attrs = await db
      .select({ name: productAttributes.name })
      .from(productAttributes)
      .where(eq(productAttributes.orgId, orgId))
      .groupBy(productAttributes.name)
      .orderBy(productAttributes.name);

    const names = attrs.map((a) => a.name);
    return { success: true, data: ["Size", "Color", "Weight", "Material", "Brand", ...names.filter(n => !["Size", "Color", "Weight", "Material", "Brand"].includes(n))] };
  } catch (error) {
    return { success: false, error: "Failed to fetch attribute names" };
  }
}

export async function getAttributeValues(name: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    const attrs = await db
      .select({ value: productAttributes.value })
      .from(productAttributes)
      .where(and(
        eq(productAttributes.orgId, orgId),
        eq(productAttributes.name, name)
      ))
      .groupBy(productAttributes.value)
      .orderBy(productAttributes.value);

    return { success: true, data: attrs.map((a) => a.value) };
  } catch (error) {
    return { success: false, error: "Failed to fetch attribute values" };
  }
}

export async function searchByAttribute(name: string, value: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    const results = await db
      .select({ productId: productAttributes.productId })
      .from(productAttributes)
      .where(and(
        eq(productAttributes.orgId, orgId),
        eq(productAttributes.name, name),
        ilike(productAttributes.value, `%${value}%`)
      ));

    return { success: true, data: results.map((r) => r.productId) };
  } catch (error) {
    return { success: false, error: "Failed to search by attribute" };
  }
}
