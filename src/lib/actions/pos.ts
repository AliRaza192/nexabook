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
  productCategories,
  taxRates,
  posShifts,
} from "@/db/schema";
import { eq, and, desc, or, ilike, gte, lte, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, generateDocumentNumber } from "./shared";
import { postTransaction, resolveAccount } from "../accounting/posting-engine";
import { checkPeriodLocked } from "./fiscal-periods";
import { captureException } from "@/lib/error-handler";

export interface PosSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
}

export interface PosSaleData {
  customerId?: string;
  items: PosSaleItem[];
  paymentMethod: 'cash' | 'card' | 'mixed' | 'jazzcash' | 'easypaisa';
  cashReceived?: number;
  cardReceived?: number;
  discountPercentage?: number;
  taxPercentage?: number;
  notes?: string;
}

async function getCurrentProfileId(orgId: string): Promise<{ profileId: string; userId: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
    .limit(1);

  if (!profile) return null;
  return { profileId: profile.id, userId };
}

// Get current POS shift
export async function getCurrentPosShift() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [shift] = await db
      .select()
      .from(posShifts)
      .where(and(
        eq(posShifts.orgId, orgId),
        eq(posShifts.profileId, ctx.profileId),
        eq(posShifts.status, 'open'),
      ))
      .orderBy(desc(posShifts.openingTime))
      .limit(1);

    return { success: true, data: shift || null };
  } catch (error) {
    captureException(error, { module: "pos", function: "getCurrentPosShift" });
    return { success: false, error: "Failed to fetch shift" };
  }
}

// Start POS shift
export async function startShift(openingAmount: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot start shift in a locked fiscal period" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [existingShift] = await db
      .select({ id: posShifts.id })
      .from(posShifts)
      .where(and(
        eq(posShifts.orgId, orgId),
        eq(posShifts.profileId, ctx.profileId),
        eq(posShifts.status, 'open'),
      ))
      .limit(1);

    if (existingShift) {
      return { success: false, error: "Shift already open" };
    }

    const shift = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(posShifts)
        .values({
          orgId,
          profileId: ctx.profileId,
          openingAmount: openingAmount.toFixed(2),
          status: 'open',
        })
        .returning();

      // Opening cash JE: Dr Cash / Cr POS Cash (float transfer) — via shared posting engine
      const mainCashAcc = await resolveAccount(tx, orgId, "cash");
      const posCashAcc = await resolveAccount(tx, orgId, "pos_cash");

      const { journalEntryId } = await postTransaction(tx, {
        orgId,
        description: `POS Shift Opening - Rs. ${openingAmount.toFixed(2)}`,
        date: new Date(),
        referenceType: "pos_shift_opening",
        referenceId: created.id,
        sourceType: "pos_shift",
        createdBy: ctx.userId,
        lines: [
          {
            accountId: mainCashAcc.id,
            description: "Dr Cash (Float Transfer)",
            debit: openingAmount.toFixed(2),
            credit: "0",
          },
          {
            accountId: posCashAcc.id,
            description: "Cr POS Cash (Opening Float)",
            debit: "0",
            credit: openingAmount.toFixed(2),
          },
        ],
      });

      await tx
        .update(posShifts)
        .set({ openingJournalEntryId: journalEntryId })
        .where(eq(posShifts.id, created.id));

      await tx.insert(auditLogs).values({
        orgId,
        userId: ctx.userId,
        action: 'POS_SHIFT_STARTED',
        entityType: 'pos_shift',
        entityId: created.id,
        changes: JSON.stringify({ openingAmount }),
      });

      return { ...created, openingJournalEntryId: journalEntryId };
    });

    revalidatePath('/pos');
    return { success: true, data: shift, message: "Shift started successfully" };
  } catch (error) {
    captureException(error, { module: "pos", function: "startShift" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to start shift" };
  }
}

// End POS shift
export async function endShift(actualCash: number, expectedCash: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot end shift in a locked fiscal period" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [openShift] = await db
      .select()
      .from(posShifts)
      .where(and(
        eq(posShifts.orgId, orgId),
        eq(posShifts.profileId, ctx.profileId),
        eq(posShifts.status, 'open'),
      ))
      .orderBy(desc(posShifts.openingTime))
      .limit(1);

    if (!openShift) {
      return { success: false, error: "No open shift found" };
    }

    const variance = actualCash - expectedCash;

    await db.transaction(async (tx) => {
      const mainCashAcc = await resolveAccount(tx, orgId, "cash");
      const posCashAcc = await resolveAccount(tx, orgId, "pos_cash");

      const closingLines: { accountId: string; description: string; debit: string; credit: string }[] = [
        {
          accountId: mainCashAcc.id,
          description: "Dr Cash (Float Return)",
          debit: actualCash.toFixed(2),
          credit: "0",
        },
        {
          accountId: posCashAcc.id,
          description: "Cr POS Cash (Float)",
          debit: "0",
          credit: expectedCash.toFixed(2),
        },
      ];
      if (Math.abs(variance) > 0.01) {
        if (variance > 0) {
          closingLines.push({
            accountId: posCashAcc.id,
            description: "Cash Overage",
            debit: "0",
            credit: Math.abs(variance).toFixed(2),
          });
        } else {
          closingLines.push({
            accountId: posCashAcc.id,
            description: "Cash Shortage",
            debit: Math.abs(variance).toFixed(2),
            credit: "0",
          });
        }
      }

      const { journalEntryId } = await postTransaction(tx, {
        orgId,
        description: `POS Shift Closing - Expected: ${expectedCash.toFixed(2)}, Actual: ${actualCash.toFixed(2)}, Variance: ${variance.toFixed(2)}`,
        date: new Date(),
        referenceType: "pos_shift_closing",
        referenceId: openShift.id,
        sourceType: "pos_shift",
        createdBy: ctx.userId,
        lines: closingLines,
      });

      await tx
        .update(posShifts)
        .set({
          status: 'closed',
          closingAmount: actualCash.toFixed(2),
          closingTime: new Date(),
          expectedCash: expectedCash.toFixed(2),
          actualCash: actualCash.toFixed(2),
          variance: variance.toFixed(2),
          closingJournalEntryId: journalEntryId,
          updatedAt: new Date(),
        })
        .where(eq(posShifts.id, openShift.id));

      await tx.insert(auditLogs).values({
        orgId,
        userId: ctx.userId,
        action: 'POS_SHIFT_ENDED',
        entityType: 'pos_shift',
        entityId: openShift.id,
        changes: JSON.stringify({ expectedCash, actualCash, variance }),
      });
    });

    revalidatePath('/pos');
    return {
      success: true,
      message: "Shift closed successfully",
      data: { expectedCash, actualCash, variance }
    };
  } catch (error) {
    captureException(error, { module: "pos", function: "endShift" });
    return { success: false, error: "Failed to end shift" };
  }
}

// Process POS sale
// FIX (2026 review): payment method previously had zero effect on GL
// posting — every sale, regardless of cash/card/mixed, debited the Cash
// account for the full amount. Now splits correctly, using a
// "card_clearing" asset account for card/jazzcash/easypaisa. JE
// construction now goes through postTransaction()/resolveAccount()
// instead of hand-rolled inserts, so entry numbering stays consistent
// with the rest of the app.
export async function processPosSale(saleData: PosSaleData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date());
    if (locked) return { success: false, error: "Cannot process sale in a locked fiscal period" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [openShift] = await db
      .select({ id: posShifts.id })
      .from(posShifts)
      .where(and(
        eq(posShifts.orgId, orgId),
        eq(posShifts.profileId, ctx.profileId),
        eq(posShifts.status, 'open'),
      ))
      .limit(1);

    if (!openShift) {
      return { success: false, error: "No open shift. Please start a shift first." };
    }

    // Validate tax rate against tax_rates table if provided
    const validatedTaxPercentage = saleData.taxPercentage || 0;
    if (validatedTaxPercentage > 0) {
      const [validRate] = await db
        .select({ rate: taxRates.rate })
        .from(taxRates)
        .where(and(
          eq(taxRates.orgId, orgId),
          eq(taxRates.isActive, true),
          sql`${taxRates.rate} = ${validatedTaxPercentage}`
        ))
        .limit(1);
      if (!validRate) {
        return { success: false, error: `Tax rate ${validatedTaxPercentage}% is not configured in tax rates. Please use a valid tax rate.` };
      }
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

    // Determine cash/card split based on payment method
    let cashPortion = 0;
    let cardPortion = 0;
    if (saleData.paymentMethod === 'cash') {
      cashPortion = netAmount;
    } else if (saleData.paymentMethod === 'mixed') {
      cashPortion = saleData.cashReceived ?? 0;
      cardPortion = saleData.cardReceived ?? 0;
      if (Math.abs(cashPortion + cardPortion - netAmount) > 0.01) {
        return { success: false, error: `Cash (${cashPortion.toFixed(2)}) + Card (${cardPortion.toFixed(2)}) must equal the total (${netAmount.toFixed(2)})` };
      }
    } else {
      // card, jazzcash, easypaisa
      cardPortion = netAmount;
    }

    const invoiceNumber = await generateDocumentNumber('invoice', orgId);
    if (!invoiceNumber) {
      return { success: false, error: "Failed to generate invoice number" };
    }

    const walkInCustomerId = saleData.customerId || await getDefaultWalkInCustomer(orgId);

    const result = await db.transaction(async (tx) => {
      // Create invoice
      const [invoice] = await tx
        .insert(invoices)
        .values({
          orgId,
          invoiceNumber,
          customerId: walkInCustomerId,
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

        await tx.insert(invoiceItems).values({
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

        const [product] = await tx
          .select({ currentStock: products.currentStock })
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)))
          .limit(1);

        if (product) {
          const newStock = Math.max(0, (parseFloat(product.currentStock || "0")) - item.quantity);
          await tx
            .update(products)
            .set({ currentStock: String(newStock) })
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)));
        }
      }

      // Batch-fetch product costs for COGS calculation
      const productIds = saleData.items.map((i) => i.productId);
      const costProducts = await tx
        .select({ id: products.id, costPrice: products.costPrice })
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.orgId, orgId)));
      const costMap = new Map(costProducts.map((p) => [p.id, parseFloat(p.costPrice || "0")]));

      let totalCOGS = 0;
      for (const item of saleData.items) {
        totalCOGS += item.quantity * (costMap.get(item.productId) || 0);
      }

      // Build JE lines
      const lines: { accountId: string; description: string; debit: string; credit: string }[] = [];

      if (cashPortion > 0) {
        const cashAcc = await resolveAccount(tx, orgId, "cash");
        lines.push({
          accountId: cashAcc.id,
          description: `Debit - POS Cash (Sale ${invoiceNumber})`,
          debit: cashPortion.toFixed(2),
          credit: "0",
        });
      }

      if (cardPortion > 0) {
        const cardAcc = await resolveAccount(tx, orgId, "card_clearing");
        lines.push({
          accountId: cardAcc.id,
          description: `Debit - Card Clearing (Sale ${invoiceNumber}, ${saleData.paymentMethod})`,
          debit: cardPortion.toFixed(2),
          credit: "0",
        });
      }

      const revAcc = await resolveAccount(tx, orgId, "sales_revenue");
      lines.push({
        accountId: revAcc.id,
        description: `Credit - Sales Revenue (Sale ${invoiceNumber})`,
        debit: "0",
        credit: (grossAmount - globalDiscount - totalDiscount).toFixed(2),
      });

      if (totalTax > 0) {
        const taxAcc = await resolveAccount(tx, orgId, "tax_payable");
        lines.push({
          accountId: taxAcc.id,
          description: `Credit - Sales Tax Payable (Sale ${invoiceNumber})`,
          debit: "0",
          credit: totalTax.toFixed(2),
        });
      }

      if (totalCOGS > 0) {
        const cogsAcc = await resolveAccount(tx, orgId, "cogs");
        const invAcc = await resolveAccount(tx, orgId, "inventory");
        lines.push(
          {
            accountId: cogsAcc.id,
            description: `Debit - COGS (POS Sale ${invoiceNumber})`,
            debit: totalCOGS.toFixed(2),
            credit: "0",
          },
          {
            accountId: invAcc.id,
            description: `Credit - Inventory (POS Sale ${invoiceNumber})`,
            debit: "0",
            credit: totalCOGS.toFixed(2),
          },
        );
      }

      const { journalEntryId } = await postTransaction(tx, {
        orgId,
        description: `POS Sale ${invoiceNumber}`,
        date: new Date(invoice.issueDate),
        referenceType: "pos_sale",
        referenceId: invoice.id,
        sourceType: "pos_sale",
        customerId: saleData.customerId ? walkInCustomerId : undefined,
        createdBy: ctx.userId,
        lines,
      });

      await tx
        .update(invoices)
        .set({ journalEntryId })
        .where(eq(invoices.id, invoice.id));

      // Earn loyalty points (1 point per 100 PKR spent) — only for named customers
      if (saleData.customerId && netAmount > 0) {
        const pointsToEarn = Math.floor(netAmount / 100);
        await tx
          .update(customers)
          .set({
            loyaltyPoints: sql`COALESCE(${customers.loyaltyPoints}, 0) + ${pointsToEarn}`,
            updatedAt: new Date(),
          })
          .where(and(eq(customers.id, saleData.customerId), eq(customers.orgId, orgId)));
      }

      await tx.insert(auditLogs).values({
        orgId,
        userId: ctx.userId,
        action: 'POS_SALE_COMPLETED',
        entityType: 'invoice',
        entityId: invoice.id,
        changes: JSON.stringify({ invoiceNumber, netAmount, paymentMethod: saleData.paymentMethod, cashPortion, cardPortion }),
      });

      return { invoice, invoiceNumber, netAmount };
    });

    revalidatePath('/pos');
    revalidatePath('/inventory');

    return {
      success: true,
      data: result.invoice,
      message: "Sale completed successfully",
      invoiceNumber,
      netAmount: result.netAmount,
    };
  } catch (error) {
    captureException(error, { module: "pos", function: "processPosSale" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to process sale" };
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

// Get POS customers
export async function getPosCustomers(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(customers.orgId, orgId), eq(customers.isActive, true)];

    if (searchQuery) {
      conditions.push(
        or(
          ilike(customers.name, `%${searchQuery}%`),
          ilike(customers.phone, `%${searchQuery}%`)
        )!
      );
    }

    const result = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        balance: customers.balance,
        defaultDiscount: customers.defaultDiscount,
        loyaltyPoints: customers.loyaltyPoints,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name)
      .limit(50);

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "pos", function: "getPosCustomers" });
    return { success: false, error: "Failed to fetch customers" };
  }
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
    captureException(error, { module: "pos", function: "getPosProducts" });
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
    captureException(error, { module: "pos", function: "getPosCategories" });
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
  totalSales: number;
  totalTransactions: number;
  totalReturns: number;
  totalDiscounts: number;
  totalTaxCollected: number;
  netSales: number;
  cashSales: number;
  cashTransactions: number;
  cardSales: number;
  cardTransactions: number;
  topProducts: {
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
}

// FIX (2026 review): previously filtered invoices with
// `ilike(invoiceNumber, 'POS-%')`, but POS invoices use the same
// invoicePrefix as every other sales invoice (default 'INV') — this filter
// never matched anything, so every report always showed zero sales. Now
// joins through journalEntries where referenceType = 'pos_sale', which is
// set correctly and reliably by processPosSale().
export async function generatePOSReport(
  shiftId: string,
  reportType: PosReportType
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [shift] = await db
      .select()
      .from(posShifts)
      .where(and(eq(posShifts.id, shiftId), eq(posShifts.orgId, orgId)))
      .limit(1);

    if (!shift) {
      return { success: false, error: "Shift not found" };
    }

    const [profile] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, shift.profileId))
      .limit(1);

    const cashierName = profile?.fullName || 'Cashier';
    const openingTime = shift.openingTime;
    const closingTime = reportType === 'Z' ? new Date() : new Date();
    const openingCash = parseFloat(shift.openingAmount || '0');

    // Find POS sale journal entries within the shift window
    const saleEntries = await db
      .select({ invoiceId: journalEntries.referenceId })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_sale'),
        gte(journalEntries.createdAt, openingTime),
        lte(journalEntries.createdAt, closingTime),
      ));

    const invoiceIds = saleEntries.map((e) => e.invoiceId).filter((id): id is string => !!id);

    const shiftInvoices = invoiceIds.length > 0
      ? await db
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
          .where(and(eq(invoices.orgId, orgId), inArray(invoices.id, invoiceIds)))
      : [];

    let totalSales = 0;
    const totalTransactions = shiftInvoices.length;
    const totalReturns = 0;
    let totalDiscounts = 0;
    let totalTaxCollected = 0;
    let cashSales = 0;
    let cashTransactions = 0;
    const cardSales = 0;
    const cardTransactions = 0;

    const productSales: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};

    const allItems = invoiceIds.length > 0
      ? await db
          .select({
            invoiceId: invoiceItems.invoiceId,
            productId: invoiceItems.productId,
            productName: invoiceItems.description,
            quantity: invoiceItems.quantity,
            lineTotal: invoiceItems.lineTotal,
            productSku: products.sku,
            productNameFull: products.name,
          })
          .from(invoiceItems)
          .leftJoin(products, eq(invoiceItems.productId, products.id))
          .where(inArray(invoiceItems.invoiceId, invoiceIds))
      : [];

    const itemsByInvoice = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByInvoice.get(item.invoiceId) || [];
      list.push(item);
      itemsByInvoice.set(item.invoiceId, list);
    }

    for (const invoice of shiftInvoices) {
      totalSales += parseFloat(invoice.netAmount || '0');
      totalDiscounts += parseFloat(invoice.discountAmount || '0');
      totalTaxCollected += parseFloat(invoice.taxAmount || '0');

      const balance = parseFloat(invoice.balanceAmount || '0');
      if (balance <= 0) {
        cashSales += parseFloat(invoice.netAmount || '0');
        cashTransactions++;
      }

      const items = itemsByInvoice.get(invoice.id) || [];
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

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const netSales = totalSales - totalReturns - totalDiscounts + totalTaxCollected;
    const expectedCash = openingCash + cashSales;
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

    if (reportType === 'Z') {
      const locked = await checkPeriodLocked(new Date());
      if (locked) return { success: false, error: "Cannot generate Z-report in a locked fiscal period" };

      await db.transaction(async (tx) => {
        const mainCashAcc = await resolveAccount(tx, orgId, "cash");
        const posCashAcc = await resolveAccount(tx, orgId, "pos_cash");
        const zActualCash = parseFloat(shift.actualCash || shift.closingAmount || String(expectedCash));
        const zVariance = zActualCash - expectedCash;
        const zLines: { accountId: string; description: string; debit: string; credit: string }[] = [
          {
            accountId: mainCashAcc.id,
            description: "Dr Cash (Z-Report Float Return)",
            debit: zActualCash.toFixed(2),
            credit: "0",
          },
          {
            accountId: posCashAcc.id,
            description: "Cr POS Cash (Z-Report Float)",
            debit: "0",
            credit: expectedCash.toFixed(2),
          },
        ];
        if (Math.abs(zVariance) > 0.01) {
          if (zVariance > 0) {
            zLines.push({
              accountId: posCashAcc.id,
              description: "Cash Overage",
              debit: "0",
              credit: Math.abs(zVariance).toFixed(2),
            });
          } else {
            zLines.push({
              accountId: posCashAcc.id,
              description: "Cash Shortage",
              debit: Math.abs(zVariance).toFixed(2),
              credit: "0",
            });
          }
        }
        const { journalEntryId } = await postTransaction(tx, {
          orgId,
          description: `POS Z-Report Closing - ${reportNumber}`,
          date: new Date(),
          referenceType: "pos_shift_closing",
          referenceId: shiftId,
          sourceType: "pos_shift",
          createdBy: ctx.userId,
          lines: zLines,
        });

        await tx
          .update(posShifts)
          .set({
            status: 'closed',
            closingTime: new Date(),
            expectedCash: expectedCash.toFixed(2),
            closingJournalEntryId: journalEntryId,
            updatedAt: new Date(),
          })
          .where(eq(posShifts.id, shiftId));

        await tx.insert(auditLogs).values({
          orgId,
          userId: ctx.userId,
          action: 'POS_Z_REPORT_GENERATED',
          entityType: 'pos_shift',
          entityId: shiftId,
          changes: JSON.stringify({ reportNumber, totalSales, netSales }),
        });
      });

      revalidatePath('/pos');
    }

    return { success: true, data: reportData, message: `${reportType}-Report generated successfully` };
  } catch (error) {
    captureException(error, { module: "pos", function: "generatePOSReport" });
    return { success: false, error: "Failed to generate POS report" };
  }
}

// Get POS shift history
export async function getPosShiftHistory() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const shifts = await db
      .select()
      .from(posShifts)
      .where(and(eq(posShifts.orgId, orgId), eq(posShifts.profileId, ctx.profileId)))
      .orderBy(desc(posShifts.openingTime))
      .limit(20);

    return { success: true, data: shifts };
  } catch (error) {
    captureException(error, { module: "pos", function: "getPosShiftHistory" });
    return { success: false, error: "Failed to fetch shift history" };
  }
}

// Get current open shift details with summary
export async function getCurrentShiftDetails() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const ctx = await getCurrentProfileId(orgId);
    if (!ctx) return { success: false, error: "Profile not found" };

    const [openShift] = await db
      .select()
      .from(posShifts)
      .where(and(
        eq(posShifts.orgId, orgId),
        eq(posShifts.profileId, ctx.profileId),
        eq(posShifts.status, 'open'),
      ))
      .orderBy(desc(posShifts.openingTime))
      .limit(1);

    if (!openShift) {
      return { success: true, data: null };
    }

    const saleEntries = await db
      .select({ invoiceId: journalEntries.referenceId })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.referenceType, 'pos_sale'),
        gte(journalEntries.createdAt, openShift.openingTime),
      ));

    const invoiceIds = saleEntries.map((e) => e.invoiceId).filter((id): id is string => !!id);

    const todayInvoices = invoiceIds.length > 0
      ? await db
          .select({ netAmount: invoices.netAmount })
          .from(invoices)
          .where(and(eq(invoices.orgId, orgId), inArray(invoices.id, invoiceIds)))
      : [];

    let totalSalesToday = 0;
    const transactionCount = todayInvoices.length;
    for (const inv of todayInvoices) {
      totalSalesToday += parseFloat(inv.netAmount || '0');
    }

    return {
      success: true,
      data: {
        shift: openShift,
        openingCash: parseFloat(openShift.openingAmount || '0'),
        totalSalesToday,
        transactionCount,
      },
    };
  } catch (error) {
    captureException(error, { module: "pos", function: "getCurrentShiftDetails" });
    return { success: false, error: "Failed to fetch shift details" };
  }
}