"use server";

import { db } from "@/db";
import {
  manufacturingBoms,
  bomItems,
  jobOrders,
  jobOrderComponents,
  products,
  chartOfAccounts,
} from "@/db/schema";
import { createAuditLog } from "./audit";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId, requireRole, generateJournalEntryNumber } from "./shared";
import { postTransaction, resolveAccount } from "../accounting/posting-engine";
import { checkPeriodLocked } from "./fiscal-periods";
import { captureException } from "@/lib/error-handler";

export type BomStatus = 'draft' | 'active' | 'archived';
export type JobOrderStatus = 'draft' | 'in-progress' | 'completed' | 'cancelled';

// ============= BOM Server Actions =============

export interface BomItemInput {
  componentId: string;
  quantityRequired: string;
  unit?: string;
}

export interface BomFormData {
  name: string;
  code: string;
  finishedGoodId: string;
  quantity: number;
  instructions?: string;
  items: BomItemInput[];
}

export interface BomWithDetails {
  id: string;
  orgId: string;
  finishedGoodId: string;
  name: string;
  code: string;
  quantity: number;
  totalEstimatedCost: string;
  instructions: string | null;
  status: BomStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  finishedGood: {
    id: string;
    name: string;
    sku: string;
    costPrice: string | null;
  };
  bomItems: Array<{
    id: string;
    componentId: string;
    quantityRequired: string;
    unit: string | null;
    component: {
      id: string;
      name: string;
      sku: string;
      costPrice: string | null;
      currentStock: number | null;
    };
  }>;
}

// Get all BOMs for current organization
export async function getBoms(status?: BomStatus | 'all') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(manufacturingBoms.orgId, orgId), eq(manufacturingBoms.isActive, true)];
    if (status && status !== 'all') {
      conditions.push(eq(manufacturingBoms.status, status));
    }

    const boms = await db
      .select({
        id: manufacturingBoms.id,
        orgId: manufacturingBoms.orgId,
        finishedGoodId: manufacturingBoms.finishedGoodId,
        name: manufacturingBoms.name,
        code: manufacturingBoms.code,
        quantity: manufacturingBoms.quantity,
        totalEstimatedCost: manufacturingBoms.totalEstimatedCost,
        instructions: manufacturingBoms.instructions,
        status: manufacturingBoms.status,
        isActive: manufacturingBoms.isActive,
        createdAt: manufacturingBoms.createdAt,
        updatedAt: manufacturingBoms.updatedAt,
        finishedGood: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          costPrice: products.costPrice,
        },
      })
      .from(manufacturingBoms)
      .leftJoin(products, eq(manufacturingBoms.finishedGoodId, products.id))
      .where(and(...conditions))
      .orderBy(desc(manufacturingBoms.createdAt));

    return { success: true, data: boms };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getBoms" });
    return { success: false, error: "Failed to fetch BOMs" };
  }
}

// Get BOM by ID with items
export async function getBomById(bomId: string): Promise<{ success: boolean; data?: BomWithDetails; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [bom] = await db
      .select({
        id: manufacturingBoms.id,
        orgId: manufacturingBoms.orgId,
        finishedGoodId: manufacturingBoms.finishedGoodId,
        name: manufacturingBoms.name,
        code: manufacturingBoms.code,
        quantity: manufacturingBoms.quantity,
        totalEstimatedCost: manufacturingBoms.totalEstimatedCost,
        instructions: manufacturingBoms.instructions,
        status: manufacturingBoms.status,
        isActive: manufacturingBoms.isActive,
        createdAt: manufacturingBoms.createdAt,
        updatedAt: manufacturingBoms.updatedAt,
        finishedGood: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          costPrice: products.costPrice,
        },
      })
      .from(manufacturingBoms)
      .leftJoin(products, eq(manufacturingBoms.finishedGoodId, products.id))
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)))
      .limit(1);

    if (!bom) return { success: false, error: "BOM not found" };

    const items = await db
      .select({
        id: bomItems.id,
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
        unit: bomItems.unit,
        component: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          costPrice: products.costPrice,
          currentStock: products.currentStock,
        },
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .where(eq(bomItems.bomId, bomId));

    return { success: true, data: { ...bom, bomItems: items } as BomWithDetails };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getBomById" });
    return { success: false, error: "Failed to fetch BOM" };
  }
}

// Create BOM
// FIX (2026 review): totalEstimatedCost was always 0 — the component cost
// lookup used sql.placeholder() outside a prepared-statement context with
// eq() against an array, which never matched anything. Now uses inArray()
// with a proper orgId scope.
export async function createBom(data: BomFormData) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name || !data.code || !data.finishedGoodId) {
      return { success: false, error: "Name, code, and finished good are required" };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "At least one component is required" };
    }

    const componentIds = data.items.map(item => item.componentId);
    const components = await db
      .select({
        id: products.id,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(inArray(products.id, componentIds), eq(products.orgId, orgId)));

    const costMap = new Map(components.map(c => [c.id, c.costPrice]));

    let totalCost = 0;
    for (const item of data.items) {
      const cost = costMap.get(item.componentId);
      if (cost) {
        totalCost += parseFloat(cost) * parseFloat(item.quantityRequired);
      }
    }

    const newBom = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(manufacturingBoms)
        .values({
          orgId,
          name: data.name,
          code: data.code,
          finishedGoodId: data.finishedGoodId,
          quantity: data.quantity,
          totalEstimatedCost: totalCost.toFixed(2),
          instructions: data.instructions,
        })
        .returning();

      await tx.insert(bomItems).values(
        data.items.map((item) => ({
          orgId,
          bomId: created.id,
          componentId: item.componentId,
          quantityRequired: item.quantityRequired,
          unit: item.unit || 'Pcs',
        })),
      );

      return created;
    });

    revalidatePath('/manufacturing/bom');
    await createAuditLog({ action: "BOM_CREATED", entityType: "bom", entityId: newBom.id });
    return { success: true, data: newBom, message: "BOM created successfully" };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      return { success: false, error: "A BOM with this code already exists" };
    }
    captureException(error, { module: "manufacturing", function: "createBom" });
    return { success: false, error: "Failed to create BOM" };
  }
}

// Update BOM status
export async function updateBomStatus(bomId: string, status: BomStatus) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(manufacturingBoms)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)));

    revalidatePath('/manufacturing/bom');
    await createAuditLog({ action: "BOM_STATUS_UPDATED", entityType: "bom", entityId: bomId });
    return { success: true, message: "BOM status updated successfully" };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "updateBomStatus" });
    return { success: false, error: "Failed to update BOM status" };
  }
}

// Delete BOM (soft delete)
export async function deleteBom(bomId: string) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(manufacturingBoms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)));

    revalidatePath('/manufacturing/bom');
    await createAuditLog({ action: "BOM_DELETED", entityType: "bom", entityId: bomId });
    return { success: true, message: "BOM deleted successfully" };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "deleteBom" });
    return { success: false, error: "Failed to delete BOM" };
  }
}

// ============= Job Order Server Actions =============

export interface JobOrderFormData {
  bomId: string;
  quantityToProduce: number;
  completionDate?: Date;
  instructions?: string;
}

// Get next job order number
// FIX (2026 review): added retry + jitter, matching the pattern used
// everywhere else document numbers are generated, now that job_orders has
// a real unique constraint (migration 0008) to actually catch collisions.
async function generateJobOrderNumber(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [lastOrder] = await db
        .select({ orderNumber: jobOrders.orderNumber })
        .from(jobOrders)
        .where(eq(jobOrders.orgId, orgId))
        .orderBy(desc(jobOrders.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastOrder?.orderNumber) {
        const match = lastOrder.orderNumber.match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const jitter = attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      return `JO-${String(nextNumber + jitter).padStart(4, '0')}`;
    } catch {
      if (attempt < 4) await new Promise(r => setTimeout(r, Math.random() * 100 * (attempt + 1)));
    }
  }
  return `JO-${String(Date.now() % 10000).padStart(4, '0')}`;
}

export async function getNextJobOrderNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    return { success: true, data: await generateJobOrderNumber(orgId) };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getNextJobOrderNumber" });
    return { success: false, error: "Failed to generate order number" };
  }
}

// Get all job orders
export async function getJobOrders(status?: JobOrderStatus | 'all') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(jobOrders.orgId, orgId)];
    if (status && status !== 'all') {
      conditions.push(eq(jobOrders.status, status));
    }

    const orders = await db
      .select({
        id: jobOrders.id,
        orgId: jobOrders.orgId,
        bomId: jobOrders.bomId,
        orderNumber: jobOrders.orderNumber,
        quantityToProduce: jobOrders.quantityToProduce,
        status: jobOrders.status,
        completionDate: jobOrders.completionDate,
        instructions: jobOrders.instructions,
        createdAt: jobOrders.createdAt,
        updatedAt: jobOrders.updatedAt,
        bom: {
          id: manufacturingBoms.id,
          name: manufacturingBoms.name,
          code: manufacturingBoms.code,
        },
        finishedGood: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
      .from(jobOrders)
      .leftJoin(manufacturingBoms, eq(jobOrders.bomId, manufacturingBoms.id))
      .leftJoin(products, eq(manufacturingBoms.finishedGoodId, products.id))
      .where(and(...conditions))
      .orderBy(desc(jobOrders.createdAt));

    return { success: true, data: orders };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getJobOrders" });
    return { success: false, error: "Failed to fetch job orders" };
  }
}

// Get job order by ID with components
export async function getJobOrderById(jobOrderId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [order] = await db
      .select()
      .from(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)))
      .limit(1);

    if (!order) return { success: false, error: "Job order not found" };

    const components = await db
      .select({
        id: jobOrderComponents.id,
        componentId: jobOrderComponents.componentId,
        requiredQty: jobOrderComponents.requiredQty,
        consumedQty: jobOrderComponents.consumedQty,
        component: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          currentStock: products.currentStock,
          unit: products.unit,
        },
      })
      .from(jobOrderComponents)
      .leftJoin(products, eq(jobOrderComponents.componentId, products.id))
      .where(eq(jobOrderComponents.jobOrderId, jobOrderId));

    return { success: true, data: { ...order, components } };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getJobOrderById" });
    return { success: false, error: "Failed to fetch job order" };
  }
}

// Create job order
export async function createJobOrder(data: JobOrderFormData) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [bom] = await db
      .select()
      .from(manufacturingBoms)
      .where(and(eq(manufacturingBoms.id, data.bomId), eq(manufacturingBoms.orgId, orgId)))
      .limit(1);

    if (!bom) return { success: false, error: "BOM not found" };

    const orderNumber = await generateJobOrderNumber(orgId);

    const bomItemsList = await db
      .select()
      .from(bomItems)
      .where(eq(bomItems.bomId, data.bomId));

    const newOrder = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(jobOrders)
        .values({
          orgId,
          bomId: data.bomId,
          orderNumber,
          quantityToProduce: data.quantityToProduce,
          completionDate: data.completionDate || null,
          instructions: data.instructions,
        })
        .returning();

      const multiplier = data.quantityToProduce / bom.quantity;
      await tx.insert(jobOrderComponents).values(
        bomItemsList.map((item) => ({
          orgId,
          jobOrderId: created.id,
          componentId: item.componentId,
          requiredQty: (parseFloat(item.quantityRequired) * multiplier).toFixed(2),
          consumedQty: '0',
        })),
      );

      return created;
    });

    revalidatePath('/manufacturing/job-orders');
    await createAuditLog({ action: "JOB_ORDER_CREATED", entityType: "jobOrder", entityId: newOrder.id });
    return { success: true, data: newOrder, message: "Job order created successfully" };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      return { success: false, error: "A job order with this number already exists — please retry" };
    }
    captureException(error, { module: "manufacturing", function: "createJobOrder" });
    return { success: false, error: "Failed to create job order" };
  }
}

// Complete job order - handles inventory and accounting
// FIX (2026 review):
//  - Stock check moved inside the transaction with a row lock (was checked
//    outside the tx, then blindly updated inside — a TOCTOU race where two
//    concurrent completions could each pass the check and drive stock
//    negative).
//  - JE construction routed through postTransaction()/resolveAccount()
//    (was hand-rolled with an ad-hoc, non-retrying entry-number generator).
//  - If the inventory account can't be resolved, this now throws (aborting
//    the whole transaction) instead of silently moving stock with no
//    corresponding GL entry while still marking the order "completed".
//  - orgId scoping added to the BOM/finishedGood lookups (previously relied
//    only on the job order's own org-scoped bomId for safety).
export async function completeJobOrder(jobOrderId: string) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot complete job order in a locked fiscal period" };

    const [jobOrder] = await db
      .select()
      .from(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)))
      .limit(1);

    if (!jobOrder) return { success: false, error: "Job order not found" };
    if (jobOrder.status === 'completed') return { success: false, error: "Job order already completed" };

    const [bom] = await db
      .select({ finishedGoodId: manufacturingBoms.finishedGoodId })
      .from(manufacturingBoms)
      .where(and(eq(manufacturingBoms.id, jobOrder.bomId), eq(manufacturingBoms.orgId, orgId)))
      .limit(1);

    if (!bom) return { success: false, error: "BOM not found" };

    const [finishedGood] = await db
      .select({
        id: products.id,
        name: products.name,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.id, bom.finishedGoodId), eq(products.orgId, orgId)))
      .limit(1);

    if (!finishedGood) return { success: false, error: "Finished good not found" };

    const componentIdRows = await db
      .select({
        componentId: jobOrderComponents.componentId,
        requiredQty: jobOrderComponents.requiredQty,
      })
      .from(jobOrderComponents)
      .where(eq(jobOrderComponents.jobOrderId, jobOrderId));

    const costPrice = finishedGood.costPrice ? parseFloat(finishedGood.costPrice) : 0;
    const qtyToProduce = jobOrder.quantityToProduce;
    const totalValue = costPrice * qtyToProduce;

    const result = await db.transaction(async (tx) => {
      // Re-check stock inside the transaction, with row locks, to close the
      // TOCTOU window a pre-transaction check leaves open.
      const componentIds = componentIdRows.map((c) => c.componentId);
      const lockedComponents = componentIds.length > 0
        ? await tx
            .select({ id: products.id, name: products.name, currentStock: products.currentStock, costPrice: products.costPrice })
            .from(products)
            .where(and(inArray(products.id, componentIds), eq(products.orgId, orgId)))
            .for("update")
        : [];
      const componentMap = new Map(lockedComponents.map((c) => [c.id, c]));

      for (const row of componentIdRows) {
        const comp = componentMap.get(row.componentId);
        const available = parseFloat(comp?.currentStock || "0");
        const required = parseFloat(row.requiredQty);
        if (available < required) {
          throw new Error(`Insufficient stock for ${comp?.name || 'component'}. Required: ${required}, Available: ${available}`);
        }
      }

      // 1. Deduct raw materials from stock
      for (const row of componentIdRows) {
        const required = parseFloat(row.requiredQty);
        await tx
          .update(products)
          .set({
            currentStock: sql`${products.currentStock} - ${required}`,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, row.componentId), eq(products.orgId, orgId)));
      }

      // 2. Add finished goods to stock
      await tx
        .update(products)
        .set({
          currentStock: sql`${products.currentStock} + ${qtyToProduce}`,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, bom.finishedGoodId), eq(products.orgId, orgId)));

      // 3. Create journal entry for the manufacturing (if there's value to post)
      let journalEntryId: string | undefined;
      if (totalValue > 0) {
        const fgAcc = await resolveAccount(tx, orgId, "finished_goods");
        const rmAcc = await resolveAccount(tx, orgId, "raw_materials_inventory");
        const cogsAcc = await resolveAccount(tx, orgId, "cogs");

        let totalRawMaterialCost = 0;
        const lines: { accountId: string; description: string; debit: string; credit: string }[] = [
          {
            accountId: fgAcc.id,
            description: `Debit: Finished Goods - ${finishedGood.name}`,
            debit: totalValue.toFixed(2),
            credit: "0",
          },
        ];

        for (const row of componentIdRows) {
          const comp = componentMap.get(row.componentId);
          const qty = parseFloat(row.requiredQty);
          const compCost = parseFloat(comp?.costPrice || '0');
          const lineValue = qty * compCost;
          totalRawMaterialCost += lineValue;
          lines.push({
            accountId: rmAcc.id,
            description: `Credit: Raw Material - ${comp?.name || 'Component'}`,
            debit: "0",
            credit: lineValue.toFixed(2),
          });
        }

        const variance = totalValue - totalRawMaterialCost;
        if (Math.abs(variance) > 0.01) {
          if (variance > 0) {
            lines.push({ accountId: cogsAcc.id, description: "Manufacturing Variance", debit: "0", credit: variance.toFixed(2) });
          } else {
            lines.push({ accountId: cogsAcc.id, description: "Manufacturing Variance", debit: Math.abs(variance).toFixed(2), credit: "0" });
          }
        }

        const posted = await postTransaction(tx, {
          orgId,
          description: `Manufacturing: ${finishedGood.name} x ${qtyToProduce} units`,
          date: new Date(),
          referenceType: "job_order",
          referenceId: jobOrderId,
          sourceType: "job_order",
          lines,
        });
        journalEntryId = posted.journalEntryId;
      }

      // 4. Update job order status to completed
      await tx
        .update(jobOrders)
        .set({
          status: 'completed',
          completionDate: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)));

      return { journalEntryId };
    });

    revalidatePath('/manufacturing/job-orders');
    await createAuditLog({ action: "JOB_ORDER_COMPLETED", entityType: "jobOrder", entityId: jobOrderId });
    return { success: true, message: "Job order completed successfully. Inventory and accounts updated.", journalEntryId: result.journalEntryId };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "completeJobOrder" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete job order" };
  }
}

// Delete job order
// FIX (2026 review): was an unconditional hard delete — a completed job
// order (stock already moved, JE already posted) could be deleted with no
// reversal, leaving the inventory movement and journal entry orphaned.
// Only draft/in-progress/cancelled orders (nothing posted yet) can be
// hard-deleted now; completed orders require a reversal flow, which this
// codebase doesn't have yet for manufacturing (flagged separately).
export async function deleteJobOrder(jobOrderId: string) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [order] = await db
      .select({ status: jobOrders.status })
      .from(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)))
      .limit(1);

    if (!order) return { success: false, error: "Job order not found" };
    if (order.status === 'completed') {
      return { success: false, error: "Cannot delete a completed job order — its stock and accounting effects would be orphaned. A reversal flow is needed for this (not yet implemented)." };
    }

    await db
      .delete(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)));

    revalidatePath('/manufacturing/job-orders');
    await createAuditLog({ action: "JOB_ORDER_DELETED", entityType: "jobOrder", entityId: jobOrderId });
    return { success: true, message: "Job order deleted successfully" };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "deleteJobOrder" });
    return { success: false, error: "Failed to delete job order" };
  }
}

// ============= Disassemble Server Actions =============

export interface DisassembleFormData {
  finishedGoodId: string;
  quantity: number;
  instructions?: string;
}

// Disassemble finished goods back to raw materials
// FIX (2026 review): same JE-routing and orgId-scoping fixes as
// completeJobOrder above.
export async function disassembleFinishedGood(data: DisassembleFormData) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot disassemble in a locked fiscal period" };

    const [bom] = await db
      .select()
      .from(manufacturingBoms)
      .where(and(
        eq(manufacturingBoms.finishedGoodId, data.finishedGoodId),
        eq(manufacturingBoms.orgId, orgId),
        eq(manufacturingBoms.isActive, true),
        eq(manufacturingBoms.status, 'active')
      ))
      .limit(1);

    if (!bom) return { success: false, error: "No active BOM found for this product" };

    const [finishedGood] = await db
      .select({
        id: products.id,
        name: products.name,
        currentStock: products.currentStock,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.id, data.finishedGoodId), eq(products.orgId, orgId)))
      .limit(1);

    if (!finishedGood) return { success: false, error: "Finished good not found" };

    const components = await db
      .select({
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
        component: { id: products.id, name: products.name, costPrice: products.costPrice },
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .where(eq(bomItems.bomId, bom.id));

    const multiplier = data.quantity / bom.quantity;
    const costPrice = finishedGood.costPrice ? parseFloat(finishedGood.costPrice) : 0;
    const totalValue = costPrice * data.quantity;

    const result = await db.transaction(async (tx) => {
      // Row-lock and re-check finished-good stock inside the tx
      const [lockedFg] = await tx
        .select({ currentStock: products.currentStock })
        .from(products)
        .where(and(eq(products.id, data.finishedGoodId), eq(products.orgId, orgId)))
        .for("update");

      if (parseFloat(lockedFg?.currentStock || "0") < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${lockedFg?.currentStock || 0}, Required: ${data.quantity}`);
      }

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} - ${data.quantity}`, updatedAt: new Date() })
        .where(and(eq(products.id, data.finishedGoodId), eq(products.orgId, orgId)));

      for (const comp of components) {
        const qtyToAdd = parseFloat(comp.quantityRequired) * multiplier;
        await tx
          .update(products)
          .set({ currentStock: sql`${products.currentStock} + ${qtyToAdd}`, updatedAt: new Date() })
          .where(and(eq(products.id, comp.componentId), eq(products.orgId, orgId)));
      }

      let journalEntryId: string | undefined;
      if (totalValue > 0) {
        const fgAcc = await resolveAccount(tx, orgId, "finished_goods");
        const rmAcc = await resolveAccount(tx, orgId, "raw_materials_inventory");

        const lines: { accountId: string; description: string; debit: string; credit: string }[] = [
          {
            accountId: fgAcc.id,
            description: `Credit: Finished Goods - ${finishedGood.name}`,
            debit: "0",
            credit: totalValue.toFixed(2),
          },
        ];

        let totalRawMaterialValue = 0;
        for (const comp of components) {
          const qtyToAdd = parseFloat(comp.quantityRequired) * multiplier;
          const componentCost = parseFloat(comp.component?.costPrice || "0");
          const lineValue = qtyToAdd * componentCost;
          totalRawMaterialValue += lineValue;
          lines.push({
            accountId: rmAcc.id,
            description: `Debit: Raw Material - ${comp.component?.name || 'Component'}`,
            debit: lineValue.toFixed(2),
            credit: "0",
          });
        }

        const cogsAcc = await resolveAccount(tx, orgId, "cogs");
        const variance = totalRawMaterialValue - totalValue;
        if (Math.abs(variance) > 0.01) {
          if (variance > 0) {
            lines.push({ accountId: cogsAcc.id, description: "Disassembly Variance", debit: "0", credit: variance.toFixed(2) });
          } else {
            lines.push({ accountId: cogsAcc.id, description: "Disassembly Variance", debit: Math.abs(variance).toFixed(2), credit: "0" });
          }
        }

        const posted = await postTransaction(tx, {
          orgId,
          description: `Disassembly: ${finishedGood.name} x ${data.quantity} units`,
          date: new Date(),
          referenceType: "disassembly",
          referenceId: data.finishedGoodId,
          sourceType: "disassembly",
          lines,
        });
        journalEntryId = posted.journalEntryId;
      }

      return { journalEntryId };
    });

    revalidatePath('/manufacturing/disassemble');
    await createAuditLog({ action: "FINISHED_GOOD_DISASSEMBLED", entityType: "jobOrder", entityId: data.finishedGoodId });
    return { success: true, message: "Disassembly completed successfully. Inventory updated.", journalEntryId: result.journalEntryId };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "disassembleFinishedGood" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to disassemble finished good" };
  }
}

// Explode BOM recursively to get a flat list of base raw materials
// FIX (2026 review): added a visited-set cycle guard — a circular
// sub-assembly reference (A contains B, B contains A) previously caused
// unbounded recursion / a stack overflow with no way to recover.
export async function explodeBOM(
  bomId: string,
  multiplier: number = 1,
  visited: Set<string> = new Set(),
): Promise<Array<{ productId: string, name: string, sku: string, quantity: number, unit: string }>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return [];

    if (visited.has(bomId)) {
      captureException(new Error(`Circular BOM reference detected at ${bomId}`), { module: "manufacturing", function: "explodeBOM" });
      return [];
    }
    const nextVisited = new Set(visited).add(bomId);

    const items = await db
      .select({
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
        unit: bomItems.unit,
        component: { id: products.id, name: products.name, sku: products.sku },
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .where(eq(bomItems.bomId, bomId));

    let flatList: Array<{ productId: string, name: string, sku: string, quantity: number, unit: string }> = [];

    for (const item of items) {
      if (!item.component) continue;

      const totalQty = parseFloat(item.quantityRequired) * multiplier;

      const [subBom] = await db
        .select({ id: manufacturingBoms.id, quantity: manufacturingBoms.quantity })
        .from(manufacturingBoms)
        .where(and(
          eq(manufacturingBoms.finishedGoodId, item.componentId),
          eq(manufacturingBoms.orgId, orgId),
          eq(manufacturingBoms.isActive, true),
          eq(manufacturingBoms.status, 'active')
        ))
        .limit(1);

      if (subBom) {
        const subMultiplier = totalQty / subBom.quantity;
        const subExploded = await explodeBOM(subBom.id, subMultiplier, nextVisited);
        flatList = [...flatList, ...subExploded];
      } else {
        flatList.push({
          productId: item.componentId,
          name: item.component.name,
          sku: item.component.sku,
          quantity: totalQty,
          unit: item.unit || 'Pcs',
        });
      }
    }

    const mergedList = flatList.reduce((acc, current) => {
      const existing = acc.find(item => item.productId === current.productId);
      if (existing) {
        existing.quantity += current.quantity;
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as Array<{ productId: string, name: string, sku: string, quantity: number, unit: string }>);

    return mergedList;
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "explodeBOM" });
    return [];
  }
}

interface BomHierarchyNode {
  id: string;
  name: string;
  finishedGoodName: string | undefined;
  quantity: number;
  children: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unit: string | null;
    isSubAssembly: boolean;
    children?: BomHierarchyNode['children'];
  }>;
}

// Get BOM visual hierarchy (Tree view data)
// FIX (2026 review): added the same cycle guard as explodeBOM(), plus a
// null-check on the recursive call's result (a failed sub-hierarchy lookup
// previously threw when accessing `.children` on null).
export async function getBOMHierarchy(bomId: string, visited: Set<string> = new Set()): Promise<BomHierarchyNode | null> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return null;

    if (visited.has(bomId)) {
      captureException(new Error(`Circular BOM reference detected at ${bomId}`), { module: "manufacturing", function: "getBOMHierarchy" });
      return null;
    }
    const nextVisited = new Set(visited).add(bomId);

    const [bom] = await db
      .select({
        id: manufacturingBoms.id,
        name: manufacturingBoms.name,
        quantity: manufacturingBoms.quantity,
        finishedGood: { name: products.name, sku: products.sku },
      })
      .from(manufacturingBoms)
      .leftJoin(products, eq(manufacturingBoms.finishedGoodId, products.id))
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)))
      .limit(1);

    if (!bom) return null;

    const items = await db
      .select({
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
        unit: bomItems.unit,
        component: { id: products.id, name: products.name, sku: products.sku },
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .where(eq(bomItems.bomId, bomId));

    const children: BomHierarchyNode['children'] = [];
    for (const item of items) {
      if (!item.component) continue;

      const [subBom] = await db
        .select({ id: manufacturingBoms.id })
        .from(manufacturingBoms)
        .where(and(
          eq(manufacturingBoms.finishedGoodId, item.componentId),
          eq(manufacturingBoms.orgId, orgId),
          eq(manufacturingBoms.isActive, true),
          eq(manufacturingBoms.status, 'active')
        ))
        .limit(1);

      if (subBom) {
        const subHierarchy = await getBOMHierarchy(subBom.id, nextVisited);
        children.push({
          productId: item.componentId,
          name: item.component.name,
          sku: item.component.sku,
          quantity: parseFloat(item.quantityRequired),
          unit: item.unit,
          isSubAssembly: true,
          children: subHierarchy?.children ?? [],
        });
      } else {
        children.push({
          productId: item.componentId,
          name: item.component.name,
          sku: item.component.sku,
          quantity: parseFloat(item.quantityRequired),
          unit: item.unit,
          isSubAssembly: false,
        });
      }
    }

    return {
      id: bom.id,
      name: bom.name,
      finishedGoodName: bom.finishedGood?.name,
      quantity: bom.quantity,
      children,
    };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getBOMHierarchy" });
    return null;
  }
}

// Get products for manufacturing (only products, not services)
export async function getManufacturingProducts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    const boms = await db
      .select({ finishedGoodId: manufacturingBoms.finishedGoodId })
      .from(manufacturingBoms)
      .where(and(
        eq(manufacturingBoms.orgId, orgId),
        eq(manufacturingBoms.isActive, true),
        eq(manufacturingBoms.status, 'active')
      ));

    const bomSet = new Set(boms.map(b => b.finishedGoodId));

    const productsWithBomFlag = allProducts.map(p => ({
      ...p,
      hasBom: bomSet.has(p.id)
    }));

    return { success: true, data: productsWithBomFlag };
  } catch (error) {
    captureException(error, { module: "manufacturing", function: "getManufacturingProducts" });
    return { success: false, error: "Failed to fetch products" };
  }
}