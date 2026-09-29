"use server";

import { db } from "@/db";
import { serialNumbers, products } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

export async function getBarcodePrintData(
  productIds: string[],
  includeSerials?: boolean,
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        salePrice: products.salePrice,
        isSerialTracked: products.isSerialTracked,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), inArray(products.id, productIds)));

    const result: Array<{
      id: string;
      productName: string;
      sku: string;
      barcodeValue: string;
      serialNumber?: string;
      price?: string;
      quantity: number;
      isSerialTracked: boolean;
    }> = [];

    const serialProductIds = productRows.filter((p) => p.isSerialTracked).map((p) => p.id);
    const allSerials = includeSerials && serialProductIds.length
      ? await db
          .select({
            id: serialNumbers.id,
            productId: serialNumbers.productId,
            serialNumber: serialNumbers.serialNumber,
          })
          .from(serialNumbers)
          .where(and(
            eq(serialNumbers.orgId, orgId),
            inArray(serialNumbers.productId, serialProductIds),
            eq(serialNumbers.status, "in_stock"),
          ))
      : [];
    const serialsByProduct = new Map<string, typeof allSerials>();
    for (const s of allSerials) {
      const list = serialsByProduct.get(s.productId) || [];
      list.push(s);
      serialsByProduct.set(s.productId, list);
    }

    for (const p of productRows) {
      const barcodeValue = p.barcode || p.sku;

      if (includeSerials && p.isSerialTracked) {
        const serials = serialsByProduct.get(p.id) || [];

        if (serials.length > 0) {
          for (const s of serials) {
            result.push({
              id: s.id,
              productName: p.name,
              sku: p.sku,
              barcodeValue: `${p.sku}-${s.serialNumber}`,
              serialNumber: s.serialNumber,
              price: p.salePrice || undefined,
              quantity: 1,
              isSerialTracked: true,
            });
          }
          continue;
        }
      }

      result.push({
        id: p.id,
        productName: p.name,
        sku: p.sku,
        barcodeValue,
        price: p.salePrice || undefined,
        quantity: 1,
        isSerialTracked: p.isSerialTracked,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error in barcodes.ts:", error);
    return { success: false, error: "Failed to get print data" };
  }
}
