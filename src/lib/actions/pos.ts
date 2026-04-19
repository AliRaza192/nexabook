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
import { eq, and, desc, or, ilike, sum, gte, lte, sql, count as countFn } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, generateDocumentNumber } from "./shared";

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
    const invoiceNumber = await generateDocumentNumber('invoice', orgId);
    if (!invoiceNumber) {
      return { success: false, error: "Failed to generate invoice number" };
    }

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

// ==========================================
// POS X-REPORT AND Z-REPORT
// ==========================================

export type PosReportType = 'X' | 'Z';

export interface PosReportData {
  shiftId: string;
  reportType: PosReportType;
  reportNumber: string;
  generatedAt: Date;
  cashierName: string;
  openingTime: Date;
  closingTime?: Date | null;
  // Sales Summary
  totalSales: number;
  totalTransactions: number;
  totalReturns: number;
  totalDiscounts: number;
  totalTaxCollected: number;
  netSales: number;
  // Payment Breakdown
  cashSales: number;
  cashTransactions: number;
  cardSales: number;
  cardTransactions: number;
  // Top Products
  topProducts: {
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];
  // Shift Financials
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
}

export async function generatePOSReport(
  shiftId: string,
  reportType: PosReportType
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get the shift details
    const [shift] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.id, shiftId),
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift')
      ))
      .limit(1);

    if (!shift) {
      return { success: false, error: "Shift not found" };
    }

    // Get cashier name from profile
    const [profile] = await db
      .select({
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(eq(profiles.id, shift.referenceId as any))
      .limit(1);

    const cashierName = profile?.fullName || 'Cashier';

    // Determine the time range for this shift
    const openingTime = shift.createdAt;
    const closingTime = reportType === 'Z' ? new Date() : shift.createdAt;

    // Get opening cash amount from the opening journal entry
    const [openingEntry] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift_opening'),
        eq(journalEntries.referenceId, shiftId as any)
      ))
      .limit(1);

    let openingCash = 0;
    if (openingEntry) {
      const [openingLine] = await db
        .select({
          debitAmount: journalEntryLines.debitAmount,
        })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, openingEntry.id))
        .limit(1);

      openingCash = openingLine ? parseFloat(openingLine.debitAmount || '0') : 0;
    }

    // Get all POS invoices for this shift
    const shiftInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        grossAmount: invoices.grossAmount,
        discountAmount: invoices.discountAmount,
        taxAmount: invoices.taxAmount,
        netAmount: invoices.netAmount,
        balanceAmount: invoices.balanceAmount,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.createdAt, openingTime),
        lte(invoices.createdAt, closingTime),
        ilike(invoices.invoiceNumber, 'POS-%')
      ));

    // Calculate totals
    let totalSales = 0;
    let totalTransactions = shiftInvoices.length;
    let totalReturns = 0;
    let totalDiscounts = 0;
    let totalTaxCollected = 0;
    let cashSales = 0;
    let cashTransactions = 0;
    let cardSales = 0;
    let cardTransactions = 0;

    // Track product sales for top products
    const productSales: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};

    for (const invoice of shiftInvoices) {
      totalSales += parseFloat(invoice.netAmount || '0');
      totalDiscounts += parseFloat(invoice.discountAmount || '0');
      totalTaxCollected += parseFloat(invoice.taxAmount || '0');

      // Determine payment method based on balance
      const balance = parseFloat(invoice.balanceAmount || '0');
      if (balance <= 0) {
        // Fully paid - assume cash by default for POS
        cashSales += parseFloat(invoice.netAmount || '0');
        cashTransactions++;
      }

      // Get invoice items for top products
      const items = await db
        .select({
          productId: invoiceItems.productId,
          productName: invoiceItems.description,
          quantity: invoiceItems.quantity,
          lineTotal: invoiceItems.lineTotal,
          productSku: products.sku,
          productNameFull: products.name,
        })
        .from(invoiceItems)
        .leftJoin(products, eq(invoiceItems.productId, products.id))
        .where(eq(invoiceItems.invoiceId, invoice.id));

      for (const item of items) {
        if (!item.productId) continue;
        const qty = parseFloat(item.quantity || '0');
        const rev = parseFloat(item.lineTotal || '0');
        const name = item.productNameFull || item.productName || 'Unknown';
        const sku = item.productSku || 'N/A';

        if (productSales[item.productId]) {
          productSales[item.productId].quantity += qty;
          productSales[item.productId].revenue += rev;
        } else {
          productSales[item.productId] = { name, sku, quantity: qty, revenue: rev };
        }
      }
    }

    // Get top 5 products
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate net sales
    const netSales = totalSales - totalReturns - totalDiscounts + totalTaxCollected;

    // Calculate expected cash (opening + cash sales)
    const expectedCash = openingCash + cashSales;

    // Generate report number
    const reportNumber = `${reportType}-RPT-${Date.now()}`;

    const reportData: PosReportData = {
      shiftId,
      reportType,
      reportNumber,
      generatedAt: new Date(),
      cashierName,
      openingTime,
      closingTime: reportType === 'Z' ? new Date() : undefined,
      totalSales,
      totalTransactions,
      totalReturns,
      totalDiscounts,
      totalTaxCollected,
      netSales,
      cashSales,
      cashTransactions,
      cardSales,
      cardTransactions,
      topProducts,
      openingCash,
      expectedCash,
    };

    // If Z-Report, close the shift
    if (reportType === 'Z') {
      // Update shift to closed
      await db
        .update(journalEntries)
        .set({
          description: 'closed',
        })
        .where(eq(journalEntries.id, shiftId));

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
            entryNumber: `POS-Z-${Date.now()}`,
            entryDate: new Date(),
            referenceType: 'pos_shift_closing',
            referenceId: shiftId,
            description: `POS Z-Report Closing - ${reportNumber}`,
          })
          .returning();
      }

      // Audit log
      await db.insert(auditLogs).values({
        orgId,
        userId,
        action: 'POS_Z_REPORT_GENERATED',
        entityType: 'pos_shift',
        entityId: shiftId,
        changes: JSON.stringify({ reportNumber, totalSales, netSales }),
      });

      revalidatePath('/pos');
    }

    return { success: true, data: reportData, message: `${reportType}-Report generated successfully` };
  } catch (error) {
    console.error("Error generating POS report:", error);
    return { success: false, error: "Failed to generate POS report" };
  }
}

// Get POS shift history
export async function getPosShiftHistory() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    const shifts = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift'),
        eq(journalEntries.referenceId, userProfile[0].id)
      ))
      .orderBy(desc(journalEntries.createdAt))
      .limit(20);

    return { success: true, data: shifts };
  } catch (error) {
    return { success: false, error: "Failed to fetch shift history" };
  }
}

// Get current open shift details with summary
export async function getCurrentShiftDetails() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get profile ID
    const userProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return { success: false, error: "Profile not found" };
    }

    // Get open shift
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
      return { success: true, data: null };
    }

    // Get opening cash
    const [openingEntry] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_shift_opening'),
        eq(journalEntries.referenceId, openShift.id as any)
      ))
      .limit(1);

    let openingCash = 0;
    if (openingEntry) {
      const [openingLine] = await db
        .select({ debitAmount: journalEntryLines.debitAmount })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, openingEntry.id))
        .limit(1);
      openingCash = openingLine ? parseFloat(openingLine.debitAmount || '0') : 0;
    }

    // Get today's sales for this shift
    const todayInvoices = await db
      .select({
        netAmount: invoices.netAmount,
      })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        gte(invoices.createdAt, openShift.createdAt),
        ilike(invoices.invoiceNumber, 'POS-%')
      ));

    let totalSalesToday = 0;
    let transactionCount = todayInvoices.length;
    for (const inv of todayInvoices) {
      totalSalesToday += parseFloat(inv.netAmount || '0');
    }

    return {
      success: true,
      data: {
        shift: openShift,
        openingCash,
        totalSalesToday,
        transactionCount,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch shift details" };
  }
}
