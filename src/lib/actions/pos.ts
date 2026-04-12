"use server";

import { db } from "@/db";
import {
  products,
  profiles,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  auditLogs,
  customers,
  invoices,
  invoiceItems,
  productCategories
} from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// POS Shift interfaces
export interface PosShift {
  id: string;
  orgId: string;
  userId: string;
  openingAmount: string;
  closingAmount: string | null;
  openingTime: Date;
  closingTime: Date | null;
  expectedCash: string | null;
  actualCash: string | null;
  variance: string | null;
  status: 'open' | 'closed';
  createdAt: Date;
}

export interface PosSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
}

export interface PosSaleData {
  customerId?: string;
  items: PosSaleItem[];
  paymentMethod: 'cash' | 'card' | 'mixed';
  cashReceived?: number;
  cardReceived?: number;
  discountPercentage?: number;
  taxPercentage?: number;
  notes?: string;
}

// Get current POS shift
export async function getCurrentPosShift() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID (UUID) instead of using Clerk user ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    const shift = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift'),
        eq(journalEntries.referenceId, userProfile[0].id),
        eq(journalEntries.description as any, 'open')
      ))
      .orderBy(desc(journalEntries.createdAt))
      .limit(1);

    if (shift.length === 0) {
      return { success: true, data: null };
    }

    return { success: true, data: shift[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch shift" };
  }
}

// Start POS shift
export async function startShift(openingAmount: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID (UUID) instead of using Clerk user ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    // Check if shift already open
    const existingShift = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift'),
        eq(journalEntries.referenceId, userProfile[0].id),
        eq(journalEntries.description as any, 'open')
      ))
      .limit(1);

    if (existingShift.length > 0) {
      return { success: false, error: "Shift already open" };
    }

    // Create shift entry
    const [shift] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber: `SHIFT-${Date.now()}`,
        entryDate: new Date(),
        referenceType: 'pos_shift',
        referenceId: userId as any,
        description: 'open',
      })
      .returning();

    // Create journal entry for opening cash
    const [posCashAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Cash')
      ))
      .limit(1);

    if (posCashAccount) {
      const [journalEntry] = await db
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber: `POS-OPEN-${Date.now()}`,
          entryDate: new Date(),
          referenceType: 'pos_shift_opening',
          referenceId: shift.id,
          description: `POS Shift Opening - Rs. ${openingAmount.toFixed(2)}`,
        })
        .returning();

      // Debit: POS Cash
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: posCashAccount.id,
        description: 'Debit - POS Cash (Opening)',
        debitAmount: openingAmount.toFixed(2),
        creditAmount: '0',
      });

      // Credit: Owner's Equity (or a specific opening balance account)
      const [equityAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, "Owner's Equity")
        ))
        .limit(1);

      if (equityAccount) {
        await db.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: equityAccount.id,
          description: 'Credit - Owner\'s Equity (Opening)',
          debitAmount: '0',
          creditAmount: openingAmount.toFixed(2),
        });
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'POS_SHIFT_STARTED',
      entityType: 'pos_shift',
      entityId: shift.id,
      changes: JSON.stringify({ openingAmount }),
    });

    revalidatePath('/pos');
    return { success: true, data: shift, message: "Shift started successfully" };
  } catch (error) {
    return { success: false, error: "Failed to start shift" };
  }
}

// End POS shift
export async function endShift(actualCash: number, expectedCash: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID (UUID) instead of using Clerk user ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    // Find open shift
    const [openShift] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift'),
        eq(journalEntries.referenceId, userProfile[0].id),
        eq(journalEntries.description as any, 'open')
      ))
      .orderBy(desc(journalEntries.createdAt))
      .limit(1);

    if (!openShift) {
      return { success: false, error: "No open shift found" };
    }

    const variance = actualCash - expectedCash;

    // Update shift
    await db
      .update(journalEntries)
      .set({
        description: 'closed',
      })
      .where(eq(journalEntries.id, openShift.id));

    // Create closing journal entry
    const [posCashAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Cash')
      ))
      .limit(1);

    if (posCashAccount) {
      const [journalEntry] = await db
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber: `POS-CLOSE-${Date.now()}`,
          entryDate: new Date(),
          referenceType: 'pos_shift_closing',
          referenceId: openShift.id,
          description: `POS Shift Closing - Expected: ${expectedCash.toFixed(2)}, Actual: ${actualCash.toFixed(2)}, Variance: ${variance.toFixed(2)}`,
        })
        .returning();
    }

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'POS_SHIFT_ENDED',
      entityType: 'pos_shift',
      entityId: openShift.id,
      changes: JSON.stringify({ expectedCash, actualCash, variance }),
    });

    revalidatePath('/pos');
    return { 
      success: true, 
      message: "Shift closed successfully",
      data: { expectedCash, actualCash, variance }
    };
  } catch (error) {
    return { success: false, error: "Failed to end shift" };
  }
}

// Process POS sale
export async function processPosSale(saleData: PosSaleData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Check if shift is open
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID (UUID) instead of using Clerk user ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    const [openShift] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift'),
        eq(journalEntries.referenceId, userProfile[0].id),
        eq(journalEntries.description as any, 'open')
      ))
      .limit(1);

    if (!openShift) {
      return { success: false, error: "No open shift. Please start a shift first." };
    }

    // Calculate totals
    let grossAmount = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const item of saleData.items) {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountPercentage ? lineTotal * (item.discountPercentage / 100) : 0;
      const afterDiscount = lineTotal - discount;
      const tax = saleData.taxPercentage ? afterDiscount * (saleData.taxPercentage / 100) : 0;
      
      grossAmount += lineTotal;
      totalDiscount += discount;
      totalTax += tax;
    }

    const globalDiscount = saleData.discountPercentage ? grossAmount * (saleData.discountPercentage / 100) : 0;
    const netAmount = grossAmount - globalDiscount - totalDiscount + totalTax;

    // Generate invoice number for POS
    const invoiceNumber = `POS-${Date.now()}`;

    // Create invoice
    const [invoice] = await db
      .insert(invoices)
      .values({
        orgId,
        invoiceNumber,
        customerId: saleData.customerId || (await getDefaultWalkInCustomer(orgId)),
        issueDate: new Date(),
        status: 'paid',
        grossAmount: grossAmount.toFixed(2),
        discountPercentage: (saleData.discountPercentage || 0).toFixed(2),
        discountAmount: (globalDiscount + totalDiscount).toFixed(2),
        taxAmount: totalTax.toFixed(2),
        shippingCharges: '0',
        roundOff: '0',
        netAmount: netAmount.toFixed(2),
        receivedAmount: netAmount.toFixed(2),
        balanceAmount: '0',
        notes: saleData.notes || 'POS Sale',
      })
      .returning();

    // Create invoice items and deduct stock
    for (const item of saleData.items) {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountPercentage ? lineTotal * (item.discountPercentage / 100) : 0;
      const afterDiscount = lineTotal - discount;

      await db.insert(invoiceItems).values({
        orgId,
        invoiceId: invoice.id,
        productId: item.productId,
        description: `POS Item`,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        discountPercentage: (item.discountPercentage || 0).toFixed(2),
        taxRate: (saleData.taxPercentage || 0).toFixed(2),
        lineTotal: afterDiscount.toFixed(2),
      });

      // Deduct stock
      const [product] = await db
        .select({ currentStock: products.currentStock })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product) {
        const newStock = Math.max(0, (product.currentStock || 0) - item.quantity);
        await db
          .update(products)
          .set({ currentStock: newStock })
          .where(eq(products.id, item.productId));
      }
    }

    // Create journal entry
    const entryNumber = await generateJournalEntryNumber(orgId);
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'pos_sale',
        referenceId: invoice.id,
        description: `POS Sale ${invoiceNumber}`,
      })
      .returning();

    // Find accounts
    const [posCashAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Cash')))
      .limit(1);

    const [salesRevenue] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Sales Revenue')))
      .limit(1);

    const [salesTaxPayable] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Sales Tax Payable')))
      .limit(1);

    if (posCashAccount && salesRevenue) {
      // Debit: POS Cash
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: posCashAccount.id,
        description: `Debit - POS Cash (Sale ${invoiceNumber})`,
        debitAmount: netAmount.toFixed(2),
        creditAmount: '0',
      });

      // Credit: Sales Revenue
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: salesRevenue.id,
        description: `Credit - Sales Revenue (Sale ${invoiceNumber})`,
        debitAmount: '0',
        creditAmount: (grossAmount - globalDiscount - totalDiscount).toFixed(2),
      });

      // Credit: Sales Tax Payable
      if (totalTax > 0 && salesTaxPayable) {
        await db.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: salesTaxPayable.id,
          description: `Credit - Sales Tax Payable (Sale ${invoiceNumber})`,
          debitAmount: '0',
          creditAmount: totalTax.toFixed(2),
        });
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'POS_SALE_COMPLETED',
      entityType: 'invoice',
      entityId: invoice.id,
      changes: JSON.stringify({ invoiceNumber, netAmount, paymentMethod: saleData.paymentMethod }),
    });

    revalidatePath('/pos');
    revalidatePath('/inventory');

    return { 
      success: true, 
      data: invoice, 
      message: "Sale completed successfully",
      invoiceNumber,
      netAmount
    };
  } catch (error) {
    return { success: false, error: "Failed to process sale" };
  }
}

// Helper: Get default walk-in customer
async function getDefaultWalkInCustomer(orgId: string): Promise<string> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.name, 'Walk-in Customer')))
    .limit(1);

  if (customer) return customer.id;

  const [newCustomer] = await db
    .insert(customers)
    .values({
      orgId,
      name: 'Walk-in Customer',
      balance: '0',
    })
    .returning();

  return newCustomer.id;
}

// Helper: Generate journal entry number
async function generateJournalEntryNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ entryNumber: journalEntries.entryNumber })
    .from(journalEntries)
    .where(eq(journalEntries.orgId, orgId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].entryNumber) {
    const match = result[0].entryNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }

  return `JE-${String(nextNumber).padStart(5, '0')}`;
}

// Get POS products
export async function getPosProducts(searchQuery?: string, categoryId?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(products.orgId, orgId), eq(products.isActive, true)];

    if (searchQuery) {
      conditions.push(
        or(
          ilike(products.name, `%${searchQuery}%`),
          ilike(products.sku, `%${searchQuery}%`)
        )!
      );
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    const result = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        salePrice: products.salePrice,
        currentStock: products.currentStock,
        taxRate: products.taxRate,
        unit: products.unit,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(products.name)
      .limit(100);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch products" };
  }
}

// Get POS categories
export async function getPosCategories() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const categories = await db
      .select()
      .from(productCategories)
      .where(and(
        eq(productCategories.orgId, orgId),
        eq(productCategories.isActive, true)
      ))
      .orderBy(productCategories.name);

    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: "Failed to fetch categories" };
  }
}
