"use server";

import { db } from "@/db";
import { serialNumbers, products } from "@/db/schema";
import { eq, and, desc, ilike, inArray } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

export async function getSerialNumbers(productId?: string, status?: string, search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(serialNumbers.orgId, orgId)];
    if (productId) conditions.push(eq(serialNumbers.productId, productId));
    if (status) conditions.push(eq(serialNumbers.status, status));
    if (search) conditions.push(ilike(serialNumbers.serialNumber, `%${search}%`));

    const result = await db
      .select()
      .from(serialNumbers)
      .where(and(...conditions))
      .orderBy(desc(serialNumbers.createdAt));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to fetch serial numbers" };
  }
}

export async function getSerialNumberById(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [sn] = await db
      .select()
      .from(serialNumbers)
      .where(and(eq(serialNumbers.id, id), eq(serialNumbers.orgId, orgId)))
      .limit(1);

    if (!sn) return { success: false, error: "Serial number not found" };
    return { success: true, data: sn };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to fetch serial number" };
  }
}

export async function registerSerialNumbers(data: {
  productId: string;
  warehouseId: string;
  serialNumbers: string[];
  batchId?: string;
  costPrice?: string;
  purchaseInvoiceId?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const existing = await db
      .select({ serialNumber: serialNumbers.serialNumber })
      .from(serialNumbers)
      .where(and(
        eq(serialNumbers.orgId, orgId),
        inArray(serialNumbers.serialNumber, data.serialNumbers),
      ));

    if (existing.length > 0) {
      return {
        success: false,
        error: `Serial numbers already in use: ${existing.map(e => e.serialNumber).join(", ")}`,
      };
    }

    const values = data.serialNumbers.map(sn => ({
      orgId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      batchId: data.batchId || null,
      serialNumber: sn,
      status: "in_stock" as const,
      costPrice: data.costPrice || null,
      purchaseInvoiceId: data.purchaseInvoiceId || null,
    }));

    const inserted = await db.insert(serialNumbers).values(values).returning();

    revalidatePath("/inventory/serial-numbers");
    return { success: true, data: inserted, message: `${inserted.length} serial numbers registered` };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to register serial numbers" };
  }
}

export async function markSerialSold(
  serialNumberId: string,
  customerId: string,
  saleInvoiceId: string,
  salePrice?: string,
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [sn] = await db
      .select()
      .from(serialNumbers)
      .where(and(eq(serialNumbers.id, serialNumberId), eq(serialNumbers.orgId, orgId)))
      .limit(1);

    if (!sn) return { success: false, error: "Serial number not found" };
    if (sn.status !== "in_stock") return { success: false, error: `Serial number is ${sn.status}, not available for sale` };

    await db
      .update(serialNumbers)
      .set({
        status: "sold",
        soldAt: new Date(),
        soldToCustomerId: customerId,
        saleInvoiceId,
        salePrice: salePrice || null,
        updatedAt: new Date(),
      })
      .where(eq(serialNumbers.id, serialNumberId));

    revalidatePath("/inventory/serial-numbers");
    return { success: true, message: "Serial number marked as sold" };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to mark serial as sold" };
  }
}

export async function markSerialReturned(serialNumberId: string, notes?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(serialNumbers)
      .set({ status: "returned", notes: notes || null, updatedAt: new Date() })
      .where(and(eq(serialNumbers.id, serialNumberId), eq(serialNumbers.orgId, orgId)));

    revalidatePath("/inventory/serial-numbers");
    return { success: true, message: "Serial number marked as returned" };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to mark serial as returned" };
  }
}

export async function deleteSerialNumber(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(serialNumbers)
      .where(and(eq(serialNumbers.id, id), eq(serialNumbers.orgId, orgId)));

    revalidatePath("/inventory/serial-numbers");
    return { success: true, message: "Serial number deleted" };
  } catch (error) {
    console.error("Error in serial-numbers.ts:", error);
    return { success: false, error: "Failed to delete serial number" };
  }
}
