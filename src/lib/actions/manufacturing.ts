"use server";

import { db } from "@/db";
import {
  manufacturingBoms,
  bomItems,
  jobOrders,
  jobOrderComponents,
  products,
  organizations,
  profiles,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

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

    const fullName = user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
    const slug = fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const [org] = await db
      .insert(organizations)
      .values({ name: fullName + "'s Organization", slug })
      .returning({ id: organizations.id });

    const [newProfile] = await db
      .insert(profiles)
      .values({ userId, orgId: org.id, role: 'admin', fullName, email: user.emailAddresses[0]?.emailAddress || '' })
      .returning({ orgId: profiles.orgId });

    return newProfile.orgId;
  } catch (error) {
    return null;
  }
}

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
  status: 'draft' | 'active' | 'archived';
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
export async function getBoms(status?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(manufacturingBoms.orgId, orgId), eq(manufacturingBoms.isActive, true)];
    if (status && status !== 'all') {
      conditions.push(eq(manufacturingBoms.status, status as any));
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
    return { success: false, error: "Failed to fetch BOM" };
  }
}

// Create BOM
export async function createBom(data: BomFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name || !data.code || !data.finishedGoodId) {
      return { success: false, error: "Name, code, and finished good are required" };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "At least one component is required" };
    }

    // Calculate total estimated cost
    const componentIds = data.items.map(item => item.componentId);
    const components = await db
      .select({
        id: products.id,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(and(eq(products.id, sql.placeholder('componentIds')), eq(products.orgId, orgId)));

    const costMap = new Map(components.map(c => [c.id, c.costPrice]));
    
    let totalCost = 0;
    for (const item of data.items) {
      const cost = costMap.get(item.componentId);
      if (cost) {
        totalCost += parseFloat(cost) * parseFloat(item.quantityRequired);
      }
    }

    // Create BOM
    const [newBom] = await db
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

    // Create BOM items
    for (const item of data.items) {
      await db.insert(bomItems).values({
        orgId,
        bomId: newBom.id,
        componentId: item.componentId,
        quantityRequired: item.quantityRequired,
        unit: item.unit || 'Pcs',
      });
    }

    revalidatePath('/manufacturing/bom');
    return { success: true, data: newBom, message: "BOM created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create BOM" };
  }
}

// Update BOM status
export async function updateBomStatus(bomId: string, status: 'draft' | 'active' | 'archived') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(manufacturingBoms)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)));

    revalidatePath('/manufacturing/bom');
    return { success: true, message: "BOM status updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update BOM status" };
  }
}

// Delete BOM (soft delete)
export async function deleteBom(bomId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(manufacturingBoms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(manufacturingBoms.id, bomId), eq(manufacturingBoms.orgId, orgId)));

    revalidatePath('/manufacturing/bom');
    return { success: true, message: "BOM deleted successfully" };
  } catch (error) {
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
export async function getNextJobOrderNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [lastOrder] = await db
      .select({ orderNumber: jobOrders.orderNumber })
      .from(jobOrders)
      .where(eq(jobOrders.orgId, orgId))
      .orderBy(desc(jobOrders.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (lastOrder?.orderNumber) {
      const lastNum = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    return { success: true, data: `JO-${String(nextNumber).padStart(4, '0')}` };
  } catch (error) {
    return { success: false, error: "Failed to generate order number" };
  }
}

// Get all job orders
export async function getJobOrders(status?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(jobOrders.orgId, orgId)];
    if (status && status !== 'all') {
      conditions.push(eq(jobOrders.status, status as any));
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
    return { success: false, error: "Failed to fetch job order" };
  }
}

// Create job order
export async function createJobOrder(data: JobOrderFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get BOM details
    const [bom] = await db
      .select()
      .from(manufacturingBoms)
      .where(and(eq(manufacturingBoms.id, data.bomId), eq(manufacturingBoms.orgId, orgId)))
      .limit(1);

    if (!bom) return { success: false, error: "BOM not found" };

    // Generate order number
    const orderNumberResult = await getNextJobOrderNumber();
    if (!orderNumberResult.success || !orderNumberResult.data) {
      return { success: false, error: "Failed to generate order number" };
    }
    const orderNumber = orderNumberResult.data;

    // Create job order
    const [newOrder] = await db
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

    // Get BOM items and create job order components
    const bomItemsList = await db
      .select()
      .from(bomItems)
      .where(eq(bomItems.bomId, data.bomId));

    for (const item of bomItemsList) {
      const multiplier = data.quantityToProduce / bom.quantity;
      const requiredQty = parseFloat(item.quantityRequired) * multiplier;

      await db.insert(jobOrderComponents).values({
        orgId,
        jobOrderId: newOrder.id,
        componentId: item.componentId,
        requiredQty: requiredQty.toFixed(2),
        consumedQty: '0',
      });
    }

    revalidatePath('/manufacturing/job-orders');
    return { success: true, data: newOrder, message: "Job order created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create job order" };
  }
}

// Complete job order - handles inventory and accounting
export async function completeJobOrder(jobOrderId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get job order
    const [jobOrder] = await db
      .select()
      .from(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)))
      .limit(1);

    if (!jobOrder) return { success: false, error: "Job order not found" };
    if (jobOrder.status === 'completed') return { success: false, error: "Job order already completed" };

    // Get BOM and finished good
    const [bom] = await db
      .select({
        finishedGoodId: manufacturingBoms.finishedGoodId,
      })
      .from(manufacturingBoms)
      .where(eq(manufacturingBoms.id, jobOrder.bomId))
      .limit(1);

    if (!bom) return { success: false, error: "BOM not found" };

    const [finishedGood] = await db
      .select({
        id: products.id,
        name: products.name,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
      })
      .from(products)
      .where(eq(products.id, bom.finishedGoodId))
      .limit(1);

    if (!finishedGood) return { success: false, error: "Finished good not found" };

    // Get job order components — include costPrice for monetary valuation
    const components = await db
      .select({
        componentId: jobOrderComponents.componentId,
        requiredQty: jobOrderComponents.requiredQty,
        component: {
          id: products.id,
          name: products.name,
          currentStock: products.currentStock,
          costPrice: products.costPrice,
        },
      })
      .from(jobOrderComponents)
      .leftJoin(products, eq(jobOrderComponents.componentId, products.id))
      .where(eq(jobOrderComponents.jobOrderId, jobOrderId));

    // Check if all components have sufficient stock
    for (const comp of components) {
      const availableStock = comp.component?.currentStock || 0;
      const required = parseFloat(comp.requiredQty);
      
      if (availableStock < required) {
        return { 
          success: false, 
          error: `Insufficient stock for ${comp.component?.name || 'component'}. Required: ${required}, Available: ${availableStock}` 
        };
      }
    }

    // Start transaction-like operation (Drizzle supports transactions)
    // 1. Deduct raw materials from stock
    for (const comp of components) {
      const required = parseFloat(comp.requiredQty);
      
      await db
        .update(products)
        .set({ 
          currentStock: sql`${products.currentStock} - ${required}`,
          updatedAt: new Date() 
        })
        .where(eq(products.id, comp.componentId));
    }

    // 2. Add finished goods to stock
    const qtyToProduce = jobOrder.quantityToProduce;
    await db
      .update(products)
      .set({ 
        currentStock: sql`${products.currentStock} + ${qtyToProduce}`,
        updatedAt: new Date() 
      })
      .where(eq(products.id, bom.finishedGoodId));

    // 3. Create journal entry for the manufacturing
    const costPrice = finishedGood.costPrice ? parseFloat(finishedGood.costPrice) : 0;
    const totalValue = costPrice * qtyToProduce;

    if (totalValue > 0) {
      // Generate journal entry number
      const [lastEntry] = await db
        .select({ entryNumber: journalEntries.entryNumber })
        .from(journalEntries)
        .where(eq(journalEntries.orgId, orgId))
        .orderBy(desc(journalEntries.createdAt))
        .limit(1);

      let entryNumber = 'JE-0001';
      if (lastEntry?.entryNumber) {
        const lastNum = parseInt(lastEntry.entryNumber.split('-').pop() || '0');
        entryNumber = `JE-${String(lastNum + 1).padStart(4, '0')}`;
      }

      // Create journal entry
      const [journalEntry] = await db
        .insert(journalEntries)
        .values({
          orgId,
          entryDate: new Date(),
          entryNumber,
          referenceType: 'job_order',
          referenceId: jobOrderId,
          description: `Manufacturing: ${finishedGood.name} x ${qtyToProduce} units`,
        })
        .returning();

      // Debit: Inventory Asset (Finished Goods)
      // Find Inventory Asset account (assuming it exists in COA)
      const inventoryAccount = await db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          sql`LOWER(${chartOfAccounts.name}) LIKE '%inventory%'`,
          eq(chartOfAccounts.type, 'asset')
        ))
        .limit(1);

      if (inventoryAccount.length > 0) {
        // Debit entry for finished goods
        await db.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: inventoryAccount[0].id,
          description: `Debit: Finished Goods - ${finishedGood.name}`,
          debitAmount: totalValue.toFixed(2),
          creditAmount: '0',
        });

        // Calculate total raw material cost (monetary value, NOT quantity)
        let totalRawMaterialCost = 0;
        for (const comp of components) {
          const qty = parseFloat(comp.requiredQty);
          const costPrice = parseFloat(comp.component?.costPrice || '0');
          const lineValue = qty * costPrice;
          totalRawMaterialCost += lineValue;

          // Credit: Raw Material with monetary value
          await db.insert(journalEntryLines).values({
            orgId,
            journalEntryId: journalEntry.id,
            accountId: inventoryAccount[0].id,
            description: `Credit: Raw Material - ${comp.component?.name || 'Component'}`,
            debitAmount: '0',
            creditAmount: lineValue.toFixed(2),
          });
        }

        // Balance the journal entry: if finished goods value differs from
        // raw material cost, post the difference to the same inventory account
        const variance = totalValue - totalRawMaterialCost;
        if (Math.abs(variance) > 0.01) {
          if (variance > 0) {
            // Finished goods worth more than raw materials — additional debit
            await db.insert(journalEntryLines).values({
              orgId,
              journalEntryId: journalEntry.id,
              accountId: inventoryAccount[0].id,
              description: `Debit: Manufacturing Value Adjustment`,
              debitAmount: variance.toFixed(2),
              creditAmount: '0',
            });
          } else {
            // Finished goods worth less — additional credit
            await db.insert(journalEntryLines).values({
              orgId,
              journalEntryId: journalEntry.id,
              accountId: inventoryAccount[0].id,
              description: `Credit: Manufacturing Value Adjustment`,
              debitAmount: '0',
              creditAmount: Math.abs(variance).toFixed(2),
            });
          }
        }
      }
    }

    // 4. Update job order status to completed
    await db
      .update(jobOrders)
      .set({ 
        status: 'completed',
        completionDate: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(jobOrders.id, jobOrderId));

    revalidatePath('/manufacturing/job-orders');
    return { success: true, message: "Job order completed successfully. Inventory and accounts updated." };
  } catch (error) {
    return { success: false, error: "Failed to complete job order" };
  }
}

// Delete job order
export async function deleteJobOrder(jobOrderId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(jobOrders)
      .where(and(eq(jobOrders.id, jobOrderId), eq(jobOrders.orgId, orgId)));

    revalidatePath('/manufacturing/job-orders');
    return { success: true, message: "Job order deleted successfully" };
  } catch (error) {
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
export async function disassembleFinishedGood(data: DisassembleFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Find active BOM for this finished good
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

    // Check finished good stock
    const [finishedGood] = await db
      .select({
        id: products.id,
        name: products.name,
        currentStock: products.currentStock,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(eq(products.id, data.finishedGoodId))
      .limit(1);

    if (!finishedGood) return { success: false, error: "Finished good not found" };

    const currentStock = finishedGood.currentStock || 0;
    if (currentStock < data.quantity) {
      return { success: false, error: `Insufficient stock. Available: ${currentStock}, Required: ${data.quantity}` };
    }

    // Get BOM components
    const components = await db
      .select({
        componentId: bomItems.componentId,
        quantityRequired: bomItems.quantityRequired,
        component: {
          id: products.id,
          name: products.name,
          currentStock: products.currentStock,
        },
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.componentId, products.id))
      .where(eq(bomItems.bomId, bom.id));

    // Calculate multiplier based on disassembly quantity
    const multiplier = data.quantity / bom.quantity;

    // 1. Reduce finished good stock
    await db
      .update(products)
      .set({ 
        currentStock: sql`${products.currentStock} - ${data.quantity}`,
        updatedAt: new Date() 
      })
      .where(eq(products.id, data.finishedGoodId));

    // 2. Add raw materials back to stock
    for (const comp of components) {
      const qtyToAdd = parseFloat(comp.quantityRequired) * multiplier;
      
      await db
        .update(products)
        .set({ 
          currentStock: sql`${products.currentStock} + ${qtyToAdd}`,
          updatedAt: new Date() 
        })
        .where(eq(products.id, comp.componentId));
    }

    // 3. Create journal entry for disassembly
    const costPrice = finishedGood.costPrice ? parseFloat(finishedGood.costPrice) : 0;
    const totalValue = costPrice * data.quantity;

    if (totalValue > 0) {
      const [lastEntry] = await db
        .select({ entryNumber: journalEntries.entryNumber })
        .from(journalEntries)
        .where(eq(journalEntries.orgId, orgId))
        .orderBy(desc(journalEntries.createdAt))
        .limit(1);

      let entryNumber = 'JE-0001';
      if (lastEntry?.entryNumber) {
        const lastNum = parseInt(lastEntry.entryNumber.split('-').pop() || '0');
        entryNumber = `JE-${String(lastNum + 1).padStart(4, '0')}`;
      }

      const [journalEntry] = await db
        .insert(journalEntries)
        .values({
          orgId,
          entryDate: new Date(),
          entryNumber,
          referenceType: 'disassembly',
          description: `Disassembly: ${finishedGood.name} x ${data.quantity} units`,
        })
        .returning();

      const inventoryAccount = await db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          sql`LOWER(${chartOfAccounts.name}) LIKE '%inventory%'`,
          eq(chartOfAccounts.type, 'asset')
        ))
        .limit(1);

      if (inventoryAccount.length > 0) {
        // Credit: Inventory Asset (Finished Goods)
        await db.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: inventoryAccount[0].id,
          description: `Credit: Finished Goods - ${finishedGood.name}`,
          debitAmount: '0',
          creditAmount: totalValue.toFixed(2),
        });

        // Debit entries for raw materials
        for (const comp of components) {
          const qtyToAdd = parseFloat(comp.quantityRequired) * multiplier;
          await db.insert(journalEntryLines).values({
            orgId,
            journalEntryId: journalEntry.id,
            accountId: inventoryAccount[0].id,
            description: `Debit: Raw Material - ${comp.component?.name || 'Component'}`,
            debitAmount: qtyToAdd.toFixed(2),
            creditAmount: '0',
          });
        }
      }
    }

    revalidatePath('/manufacturing/disassemble');
    return { success: true, message: "Disassembly completed successfully. Inventory updated." };
  } catch (error) {
    return { success: false, error: "Failed to disassemble finished good" };
  }
}

// Get products for manufacturing (only products, not services)
export async function getProducts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    return { success: true, data: allProducts };
  } catch (error) {
    return { success: false, error: "Failed to fetch products" };
  }
}
