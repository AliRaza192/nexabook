"use server";

import { db } from "@/db";
import {
  vendors,
  purchaseInvoices,
  purchaseItems,
  expenses,
  organizations,
  profiles,
  chartOfAccounts,
  products,
  auditLogs,
  journalEntries,
  journalEntryLines,
  purchaseOrders,
  purchaseOrderItems,
  goodReceivingNotes,
  grnItems,
  purchaseReturns,
  purchaseReturnItems,
  vendorPayments,
  vendorPaymentAllocations,
  settlements,
  settlementLines,
} from "@/db/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

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

// Generate bill number
async function generateBillNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ billNumber: purchaseInvoices.billNumber })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.orgId, orgId))
    .orderBy(desc(purchaseInvoices.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].billNumber) {
    const match = result[0].billNumber.match(/\d+$/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      nextNumber = lastNumber + 1;
    }
  }

  return `PI-${String(nextNumber).padStart(5, '0')}`;
}

// Generate journal entry number
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
    if (match) {
      const lastNumber = parseInt(match[0]);
      nextNumber = lastNumber + 1;
    }
  }

  return `JE-${String(nextNumber).padStart(5, '0')}`;
}

// ==================== VENDOR ACTIONS ====================

export interface VendorFormData {
  name: string;
  phone?: string;
  email?: string;
  ntn?: string;
  strn?: string;
  address?: string;
  openingBalance?: string;
}

export async function getVendors(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    let whereClause = and(eq(vendors.orgId, orgId), eq(vendors.isActive, true));

    if (searchQuery) {
      whereClause = and(
        eq(vendors.orgId, orgId),
        eq(vendors.isActive, true),
        or(
          ilike(vendors.name, `%${searchQuery}%`),
          ilike(vendors.email, `%${searchQuery}%`),
          ilike(vendors.phone, `%${searchQuery}%`),
        )
      );
    }

    const result = await db
      .select()
      .from(vendors)
      .where(whereClause)
      .orderBy(desc(vendors.createdAt));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch vendors" };
  }
}

export async function createVendor(data: VendorFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.name) return { success: false, error: "Vendor name is required" };

    const [newVendor] = await db
      .insert(vendors)
      .values({
        orgId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        ntn: data.ntn || null,
        strn: data.strn || null,
        address: data.address || null,
        openingBalance: data.openingBalance || '0',
        balance: data.openingBalance || '0',
      })
      .returning();

    revalidatePath('/purchases/vendors');
    return { success: true, data: newVendor, message: "Vendor created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create vendor" };
  }
}

export async function updateVendor(vendorId: string, data: Partial<VendorFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.ntn !== undefined) updateData.ntn = data.ntn;
    if (data.strn !== undefined) updateData.strn = data.strn;
    if (data.address !== undefined) updateData.address = data.address;

    const [updatedVendor] = await db
      .update(vendors)
      .set(updateData)
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId)))
      .returning();

    if (!updatedVendor) return { success: false, error: "Vendor not found" };

    revalidatePath('/purchases/vendors');
    return { success: true, data: updatedVendor, message: "Vendor updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update vendor" };
  }
}

export async function deleteVendor(vendorId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(vendors)
      .set({ isActive: false })
      .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, orgId)));

    revalidatePath('/purchases/vendors');
    return { success: true, message: "Vendor deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete vendor" };
  }
}

// ==================== PURCHASE INVOICE ACTIONS ====================

export interface PurchaseInvoiceLineItem {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage?: string;
  taxRate: string;
  lineTotal: string;
}

export interface PurchaseInvoiceFormData {
  vendorId: string;
  billNumber: string;
  date: Date;
  dueDate?: Date;
  reference?: string;
  subject?: string;
  grossAmount: string;
  discountTotal: string;
  taxTotal: string;
  netAmount: string;
  notes?: string;
  items: PurchaseInvoiceLineItem[];
}

export async function getPurchaseInvoices(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(purchaseInvoices.orgId, orgId)];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(purchaseInvoices.status, statusFilter));
    }

    let result = await db
      .select({
        id: purchaseInvoices.id,
        billNumber: purchaseInvoices.billNumber,
        date: purchaseInvoices.date,
        dueDate: purchaseInvoices.dueDate,
        status: purchaseInvoices.status,
        netAmount: purchaseInvoices.netAmount,
        grossAmount: purchaseInvoices.grossAmount,
        taxTotal: purchaseInvoices.taxTotal,
        createdAt: purchaseInvoices.createdAt,
        vendor: {
          id: vendors.id,
          name: vendors.name,
        },
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(purchaseInvoices.createdAt));

    if (searchQuery) {
      result = result.filter(inv =>
        inv.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch purchase invoices" };
  }
}

export async function getNextBillNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const billNumber = await generateBillNumber(orgId);
    return { success: true, data: billNumber };
  } catch (error) {
    return { success: false, error: "Failed to generate bill number" };
  }
}

export async function createPurchaseInvoice(data: PurchaseInvoiceFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId || !data.items.length) {
      return { success: false, error: "Vendor and at least one item are required" };
    }

    const billNumber = await generateBillNumber(orgId);

    const [newInvoice] = await db
      .insert(purchaseInvoices)
      .values({
        orgId,
        vendorId: data.vendorId,
        billNumber,
        date: data.date,
        dueDate: data.dueDate || null,
        reference: data.reference || null,
        subject: data.subject || null,
        grossAmount: data.grossAmount,
        discountTotal: data.discountTotal,
        taxTotal: data.taxTotal,
        netAmount: data.netAmount,
        status: 'Draft',
        notes: data.notes,
      })
      .returning();

    for (const item of data.items) {
      await db.insert(purchaseItems).values({
        orgId,
        purchaseInvoiceId: newInvoice.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || '0',
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      });
    }

    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'PURCHASE_INVOICE_CREATED',
      entityType: 'purchase_invoice',
      entityId: newInvoice.id,
      changes: JSON.stringify({
        billNumber: newInvoice.billNumber,
        netAmount: newInvoice.netAmount,
        status: newInvoice.status,
      }),
    });

    revalidatePath('/purchases/invoices');
    revalidatePath('/purchases/invoices/new');

    return {
      success: true,
      data: newInvoice,
      message: "Purchase invoice created successfully",
      billNumber
    };
  } catch (error) {
    return { success: false, error: "Failed to create purchase invoice" };
  }
}

export async function approvePurchaseInvoice(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [invoice] = await db
      .select()
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, invoiceId), eq(purchaseInvoices.orgId, orgId)))
      .limit(1);

    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === 'Approved') return { success: false, error: "Invoice is already approved" };

    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseInvoiceId, invoiceId));

    const result = await db.transaction(async (tx) => {
      // 1. Update invoice status
      await tx
        .update(purchaseInvoices)
        .set({ status: 'Approved' })
        .where(eq(purchaseInvoices.id, invoiceId));

      // 2. Update inventory (ADD stock for purchases)
      for (const item of items) {
        if (item.productId) {
          const [product] = await tx
            .select({ currentStock: products.currentStock })
            .from(products)
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)))
            .limit(1);

          if (product) {
            const newStock = (product.currentStock || 0) + parseFloat(item.quantity);
            await tx
              .update(products)
              .set({ currentStock: newStock, costPrice: item.unitPrice })
              .where(eq(products.id, item.productId));
          }
        }
      }

      // 3. Update vendor balance
      await tx
        .update(vendors)
        .set({ balance: (parseFloat(invoice.netAmount)).toFixed(2) })
        .where(eq(vendors.id, invoice.vendorId));

      // 4. Create Journal Entry
      const entryNumber = await generateJournalEntryNumber(orgId);

      const [journalEntry] = await tx
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber,
          entryDate: new Date(),
          referenceType: 'purchase_invoice',
          referenceId: invoiceId,
          description: `Purchase Invoice ${invoice.billNumber} approval`,
        })
        .returning();

      // Find accounts
      const [inventoryAccount] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Inventory')
        ))
        .limit(1);

      const [vendorPayable] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Accounts Payable')
        ))
        .limit(1);

      const [purchaseTax] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Input Tax')
        ))
        .limit(1);

      if (!inventoryAccount || !vendorPayable) {
        throw new Error('Required accounts not found. Please seed Chart of Accounts first.');
      }

      // 5. Create Journal Entry Lines
      const taxAmount = parseFloat(invoice.taxTotal || '0');
      const discountAmount = parseFloat(invoice.discountAmount || '0');

      // Debit: Inventory (Asset) — grossAmount minus any discount
      // Purchase discounts reduce the cost of inventory
      const inventoryDebitAmount = (parseFloat(invoice.grossAmount || '0') - discountAmount).toFixed(2);
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: inventoryAccount.id,
        description: `Debit - Inventory Asset (Purchase ${invoice.billNumber})`,
        debitAmount: inventoryDebitAmount,
        creditAmount: '0',
      });

      // Debit: Input Tax (if tax > 0)
      if (taxAmount > 0) {
        if (!purchaseTax) {
          throw new Error('Input Tax account not found. Please seed Chart of Accounts first.');
        }
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: purchaseTax.id,
          description: `Debit - Input Tax (Purchase ${invoice.billNumber})`,
          debitAmount: invoice.taxTotal,
          creditAmount: '0',
        });
      }

      // Credit: Vendor Payable (Liability) — Net Amount (total payable)
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: vendorPayable.id,
        description: `Credit - Vendor Payable (Purchase ${invoice.billNumber})`,
        debitAmount: '0',
        creditAmount: invoice.netAmount,
      });

      // 6. Create audit log
      await tx.insert(auditLogs).values({
        orgId,
        userId: (await auth()).userId || 'system',
        action: 'PURCHASE_INVOICE_APPROVED',
        entityType: 'purchase_invoice',
        entityId: invoiceId,
        changes: JSON.stringify({
          billNumber: invoice.billNumber,
          status: 'Approved',
          journalEntry: entryNumber,
        }),
      });

      return { success: true, message: 'Purchase invoice approved', entryNumber };
    });

    revalidatePath('/purchases/invoices');
    revalidatePath('/inventory');

    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve invoice" };
  }
}

export async function revisePurchaseInvoice(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [invoice] = await db
      .select()
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, invoiceId), eq(purchaseInvoices.orgId, orgId)))
      .limit(1);

    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status !== 'Approved') return { success: false, error: "Only approved invoices can be revised" };

    const result = await db.transaction(async (tx) => {
      // 1. Update status to Revised
      await tx
        .update(purchaseInvoices)
        .set({ status: 'Revised' })
        .where(eq(purchaseInvoices.id, invoiceId));

      // 2. Get items and reverse inventory
      const items = await tx
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseInvoiceId, invoiceId));

      for (const item of items) {
        if (item.productId) {
          const [product] = await tx
            .select({ currentStock: products.currentStock })
            .from(products)
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)))
            .limit(1);

          if (product) {
            const newStock = Math.max(0, (product.currentStock || 0) - parseFloat(item.quantity));
            await tx
              .update(products)
              .set({ currentStock: newStock })
              .where(eq(products.id, item.productId));
          }
        }
      }

      // 3. Create reversal journal entry
      const entryNumber = await generateJournalEntryNumber(orgId);

      const [journalEntry] = await tx
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber,
          entryDate: new Date(),
          referenceType: 'purchase_invoice_revision',
          referenceId: invoiceId,
          description: `Purchase Invoice ${invoice.billNumber} revision - reversal`,
        })
        .returning();

      const [inventoryAccount] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Inventory')
        ))
        .limit(1);

      const [vendorPayable] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Accounts Payable')
        ))
        .limit(1);

      if (!inventoryAccount || !vendorPayable) {
        throw new Error('Required accounts not found');
      }

      // Reverse: Credit Inventory, Debit Vendor Payable
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: inventoryAccount.id,
        description: `Credit - Inventory Asset (Reversal ${invoice.billNumber})`,
        debitAmount: '0',
        creditAmount: invoice.netAmount,
      });

      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: vendorPayable.id,
        description: `Debit - Vendor Payable (Reversal ${invoice.billNumber})`,
        debitAmount: invoice.netAmount,
        creditAmount: '0',
      });

      // 4. Update vendor balance
      await tx
        .update(vendors)
        .set({ balance: '0' })
        .where(eq(vendors.id, invoice.vendorId));

      // 5. Audit log
      await tx.insert(auditLogs).values({
        orgId,
        userId: (await auth()).userId || 'system',
        action: 'PURCHASE_INVOICE_REVISED',
        entityType: 'purchase_invoice',
        entityId: invoiceId,
        changes: JSON.stringify({
          billNumber: invoice.billNumber,
          status: 'Revised',
          reversalEntry: entryNumber,
        }),
      });

      return { success: true, message: 'Purchase invoice revised', entryNumber };
    });

    revalidatePath('/purchases/invoices');
    revalidatePath('/inventory');

    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to revise invoice" };
  }
}

export async function getPurchaseInvoiceById(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [invoice] = await db
      .select()
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, invoiceId), eq(purchaseInvoices.orgId, orgId)))
      .limit(1);

    if (!invoice) return { success: false, error: "Invoice not found" };

    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseInvoiceId, invoiceId));

    return { success: true, data: { ...invoice, items } };
  } catch (error) {
    return { success: false, error: "Failed to fetch invoice" };
  }
}

// ==================== EXPENSE ACTIONS ====================

export interface ExpenseFormData {
  accountId: string;
  amount: string;
  date: Date;
  reference?: string;
  description?: string;
  paidFromAccountId: string;
}

export async function recordExpense(data: ExpenseFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [newExpense] = await db
      .insert(expenses)
      .values({
        orgId,
        accountId: data.accountId,
        amount: data.amount,
        date: data.date,
        reference: data.reference || null,
        description: data.description || null,
        paidFromAccountId: data.paidFromAccountId,
      })
      .returning();

    // Create journal entry
    const entryNumber = await generateJournalEntryNumber(orgId);

    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: data.date,
        referenceType: 'expense',
        referenceId: newExpense.id,
        description: `Expense: ${data.description || data.reference || 'Recorded'}`,
      })
      .returning();

    // Debit: Expense Account
    await db.insert(journalEntryLines).values({
      orgId,
      journalEntryId: journalEntry.id,
      accountId: data.accountId,
      description: `Debit - Expense Account`,
      debitAmount: data.amount,
      creditAmount: '0',
    });

    // Credit: Cash/Bank Account
    await db.insert(journalEntryLines).values({
      orgId,
      journalEntryId: journalEntry.id,
      accountId: data.paidFromAccountId,
      description: `Credit - Cash/Bank Account`,
      debitAmount: '0',
      creditAmount: data.amount,
    });

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'EXPENSE_RECORDED',
      entityType: 'expense',
      entityId: newExpense.id,
      changes: JSON.stringify({
        amount: data.amount,
        journalEntry: entryNumber,
      }),
    });

    revalidatePath('/accounts/expenses');

    return { success: true, data: newExpense, message: "Expense recorded successfully", entryNumber };
  } catch (error) {
    return { success: false, error: "Failed to record expense" };
  }
}

export async function getExpenses(limit?: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    let query = db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        date: expenses.date,
        reference: expenses.reference,
        description: expenses.description,
        createdAt: expenses.createdAt,
        account: {
          id: chartOfAccounts.id,
          code: chartOfAccounts.code,
          name: chartOfAccounts.name,
        },
        paidFromAccount: {
          id: chartOfAccounts.id,
          code: chartOfAccounts.code,
          name: chartOfAccounts.name,
        },
      })
      .from(expenses)
      .leftJoin(chartOfAccounts, eq(expenses.accountId, chartOfAccounts.id))
      .where(eq(expenses.orgId, orgId))
      .orderBy(desc(expenses.date));

    const result = limit ? await query.limit(limit) : await query;

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch expenses" };
  }
}

export async function getExpenseAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        type: chartOfAccounts.type,
      })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.type, 'expense'),
        eq(chartOfAccounts.isActive, true)
      ))
      .orderBy(chartOfAccounts.code);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch expense accounts" };
  }
}

export async function getCashBankAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
      })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.type, 'asset'),
        eq(chartOfAccounts.isActive, true),
        or(
          ilike(chartOfAccounts.name, '%Cash%'),
          ilike(chartOfAccounts.name, '%Bank%')
        )
      ))
      .orderBy(chartOfAccounts.code);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch cash/bank accounts" };
  }
}

// ==================== PURCHASE ORDER ACTIONS ====================

export interface PurchaseOrderFormData {
  vendorId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  reference?: string;
  subject?: string;
  items: Array<{ productId?: string; description: string; quantity: string; unitPrice: string; discountPercentage?: string; taxRate?: string }>;
  discountPercentage?: string;
  taxAmount?: string;
  shippingCharges?: string;
  notes?: string;
  terms?: string;
}

async function generatePurchaseOrderNumber(orgId: string): Promise<string> {
  const result = await db.select({ orderNumber: purchaseOrders.orderNumber }).from(purchaseOrders).where(eq(purchaseOrders.orgId, orgId)).orderBy(desc(purchaseOrders.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].orderNumber) {
    const match = result[0].orderNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }
  return `PO-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextPurchaseOrderNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const number = await generatePurchaseOrderNumber(orgId);
    return { success: true, data: number };
  } catch (error) {
    return { success: false, error: "Failed to generate purchase order number" };
  }
}

export async function getPurchaseOrders(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(purchaseOrders.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(purchaseOrders.status, statusFilter as any));

    let result = await db.select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      orderDate: purchaseOrders.orderDate,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      status: purchaseOrders.status,
      netAmount: purchaseOrders.netAmount,
      grossAmount: purchaseOrders.grossAmount,
      createdAt: purchaseOrders.createdAt,
      vendor: { id: vendors.id, name: vendors.name },
    }).from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(purchaseOrders.createdAt));

    if (searchQuery) {
      result = result.filter(po =>
        po.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch purchase orders" };
  }
}

export async function getPurchaseOrderById(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!po) return { success: false, error: "Purchase order not found" };

    const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    return { success: true, data: { ...po, items } };
  } catch (error) {
    return { success: false, error: "Failed to fetch purchase order" };
  }
}

export async function createPurchaseOrder(data: PurchaseOrderFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId || !data.items.length) return { success: false, error: "Vendor and at least one item are required" };

    const orderNumber = await generatePurchaseOrderNumber(orgId);

    const grossAmount = data.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || '0');
      const price = parseFloat(item.unitPrice || '0');
      const discPct = parseFloat(item.discountPercentage || '0');
      const lineTotal = qty * price;
      return sum + (lineTotal - (lineTotal * discPct / 100));
    }, 0);

    const globalDiscPct = parseFloat(data.discountPercentage || '0');
    const discountAmount = grossAmount * globalDiscPct / 100;
    const taxAmount = parseFloat(data.taxAmount || '0');
    const shipping = parseFloat(data.shippingCharges || '0');
    const netAmount = grossAmount - discountAmount + taxAmount + shipping;

    const [newPO] = await db.insert(purchaseOrders).values({
      orgId,
      orderNumber,
      vendorId: data.vendorId,
      orderDate: new Date(data.orderDate),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      reference: data.reference || '',
      subject: data.subject || '',
      grossAmount: grossAmount.toFixed(2),
      discountPercentage: globalDiscPct.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      shippingCharges: shipping.toFixed(2),
      netAmount: netAmount.toFixed(2),
      status: 'draft',
      notes: data.notes || null,
      terms: data.terms || null,
    }).returning();

    for (const item of data.items) {
      const qty = parseFloat(item.quantity || '0');
      const price = parseFloat(item.unitPrice || '0');
      const discPct = parseFloat(item.discountPercentage || '0');
      const taxRate = parseFloat(item.taxRate || '0');
      const lineTotal = (qty * price) - ((qty * price) * discPct / 100);

      await db.insert(purchaseOrderItems).values({
        orgId,
        purchaseOrderId: newPO.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || '0',
        taxRate: item.taxRate || '0',
        lineTotal: lineTotal.toFixed(2),
      });
    }

    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'purchase_order',
      entityId: newPO.id,
      changes: JSON.stringify({ orderNumber, netAmount: newPO.netAmount }),
    });

    revalidatePath('/purchases/orders');
    return { success: true, data: newPO, message: "Purchase order created successfully", orderNumber };
  } catch (error) {
    return { success: false, error: "Failed to create purchase order" };
  }
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrderFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: any = {};
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    if (data.orderDate !== undefined) updateData.orderDate = new Date(data.orderDate);
    if (data.expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
    if (data.shippingCharges !== undefined) updateData.shippingCharges = data.shippingCharges;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;

    if (data.items) {
      const grossAmount = data.items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || '0');
        const price = parseFloat(item.unitPrice || '0');
        const discPct = parseFloat(item.discountPercentage || '0');
        const lineTotal = qty * price;
        return sum + (lineTotal - (lineTotal * discPct / 100));
      }, 0);
      const globalDiscPct = parseFloat(data.discountPercentage || '0');
      const discountAmount = grossAmount * globalDiscPct / 100;
      const taxAmount = parseFloat(data.taxAmount || '0');
      const shipping = parseFloat(data.shippingCharges || '0');
      const netAmount = grossAmount - discountAmount + taxAmount + shipping;
      updateData.grossAmount = grossAmount.toFixed(2);
      updateData.discountAmount = discountAmount.toFixed(2);
      updateData.netAmount = netAmount.toFixed(2);

      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      for (const item of data.items) {
        const qty = parseFloat(item.quantity || '0');
        const price = parseFloat(item.unitPrice || '0');
        const discPct = parseFloat(item.discountPercentage || '0');
        const taxRate = parseFloat(item.taxRate || '0');
        const lineTotal = (qty * price) - ((qty * price) * discPct / 100);
        await db.insert(purchaseOrderItems).values({
          orgId,
          purchaseOrderId: id,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage || '0',
          taxRate: item.taxRate || '0',
          lineTotal: lineTotal.toFixed(2),
        });
      }
    }

    const [updated] = await db.update(purchaseOrders).set(updateData).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).returning();
    if (!updated) return { success: false, error: "Purchase order not found" };

    revalidatePath('/purchases/orders');
    return { success: true, data: updated, message: "Purchase order updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update purchase order" };
  }
}

export async function approvePurchaseOrder(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!po) return { success: false, error: "Purchase order not found" };
    if (po.status === 'approved' || po.status === 'confirmed') return { success: false, error: "Purchase order is already approved" };

    await db.update(purchaseOrders).set({ status: 'approved' }).where(eq(purchaseOrders.id, id));

    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'PURCHASE_ORDER_APPROVED',
      entityType: 'purchase_order',
      entityId: id,
      changes: JSON.stringify({ orderNumber: po.orderNumber, status: 'approved' }),
    });

    revalidatePath('/purchases/orders');
    return { success: true, message: "Purchase order approved successfully" };
  } catch (error) {
    return { success: false, error: "Failed to approve purchase order" };
  }
}

export async function deletePurchaseOrder(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId))).limit(1);
    if (!po) return { success: false, error: "Purchase order not found" };
    if (po.status === 'approved' || po.status === 'confirmed' || po.status === 'delivered') {
      return { success: false, error: "Cannot delete an approved, confirmed, or delivered purchase order" };
    }

    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    await db.delete(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.orgId, orgId)));

    revalidatePath('/purchases/orders');
    return { success: true, message: "Purchase order deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete purchase order" };
  }
}

// ==================== GOOD RECEIVING NOTE ACTIONS ====================

export interface GRNFormData {
  purchaseOrderId?: string;
  purchaseInvoiceId?: string;
  vendorId: string;
  receivingDate: string;
  reference?: string;
  items: Array<{ productId: string; orderedQty: string; receivedQty: string; acceptedQty: string; rejectedQty?: string }>;
  notes?: string;
}

async function generateGRNNumber(orgId: string): Promise<string> {
  const result = await db.select({ grnNumber: goodReceivingNotes.grnNumber }).from(goodReceivingNotes).where(eq(goodReceivingNotes.orgId, orgId)).orderBy(desc(goodReceivingNotes.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].grnNumber) {
    const match = result[0].grnNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }
  return `GRN-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextGRNNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const number = await generateGRNNumber(orgId);
    return { success: true, data: number };
  } catch (error) {
    return { success: false, error: "Failed to generate GRN number" };
  }
}

export async function getGoodReceivingNotes(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    let result = await db.select({
      id: goodReceivingNotes.id,
      grnNumber: goodReceivingNotes.grnNumber,
      receivingDate: goodReceivingNotes.receivingDate,
      reference: goodReceivingNotes.reference,
      status: goodReceivingNotes.status,
      vendor: { id: vendors.id, name: vendors.name },
      purchaseOrder: { id: purchaseOrders.id, orderNumber: purchaseOrders.orderNumber },
      createdAt: goodReceivingNotes.createdAt,
    }).from(goodReceivingNotes)
      .leftJoin(vendors, eq(goodReceivingNotes.vendorId, vendors.id))
      .leftJoin(purchaseOrders, eq(goodReceivingNotes.purchaseOrderId, purchaseOrders.id))
      .where(eq(goodReceivingNotes.orgId, orgId))
      .orderBy(desc(goodReceivingNotes.createdAt));

    if (searchQuery) {
      result = result.filter(grn =>
        grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.purchaseOrder?.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch GRNs" };
  }
}

export async function createGRN(data: GRNFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId || !data.items.length) return { success: false, error: "Vendor and at least one item are required" };

    const grnNumber = await generateGRNNumber(orgId);

    const result = await db.transaction(async (tx) => {
      const [newGRN] = await tx.insert(goodReceivingNotes).values({
        orgId,
        grnNumber,
        purchaseOrderId: data.purchaseOrderId || null,
        purchaseInvoiceId: data.purchaseInvoiceId || null,
        vendorId: data.vendorId,
        receivingDate: new Date(data.receivingDate),
        reference: data.reference || '',
        status: 'accepted',
        notes: data.notes || null,
      }).returning();

      for (const item of data.items) {
        await tx.insert(grnItems).values({
          orgId,
          grnId: newGRN.id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty || '0',
        });

        // Update stock: add accepted quantity to product current stock
        if (item.acceptedQty && parseFloat(item.acceptedQty) > 0) {
          await tx.update(products)
            .set({ currentStock: sql`${products.currentStock} + ${parseFloat(item.acceptedQty)}` })
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)));
        }
      }

      // Update linked PO status to delivered if all items received
      if (data.purchaseOrderId) {
        await tx.update(purchaseOrders)
          .set({ status: 'delivered' })
          .where(eq(purchaseOrders.id, data.purchaseOrderId));
      }

      await tx.insert(auditLogs).values({
        orgId,
        userId: (await auth()).userId || 'system',
        action: 'GRN_CREATED',
        entityType: 'good_receiving_note',
        entityId: newGRN.id,
        changes: JSON.stringify({ grnNumber, itemsCount: data.items.length }),
      });

      return newGRN;
    });

    revalidatePath('/purchases/grn');
    revalidatePath('/inventory');
    return { success: true, data: result, message: "GRN created and stock updated successfully", grnNumber };
  } catch (error) {
    return { success: false, error: "Failed to create GRN" };
  }
}

export async function updateGRN(id: string, data: Partial<GRNFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: any = {};
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    if (data.receivingDate !== undefined) updateData.receivingDate = new Date(data.receivingDate);
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.purchaseOrderId !== undefined) updateData.purchaseOrderId = data.purchaseOrderId;
    if (data.purchaseInvoiceId !== undefined) updateData.purchaseInvoiceId = data.purchaseInvoiceId;

    const [updated] = await db.update(goodReceivingNotes).set(updateData).where(and(eq(goodReceivingNotes.id, id), eq(goodReceivingNotes.orgId, orgId))).returning();
    if (!updated) return { success: false, error: "GRN not found" };

    if (data.items) {
      // Reverse old stock, add new stock
      const oldItems = await db.select().from(grnItems).where(eq(grnItems.grnId, id));
      for (const oldItem of oldItems) {
        if (oldItem.acceptedQty && parseFloat(oldItem.acceptedQty) > 0) {
          await db.update(products)
            .set({ currentStock: sql`${products.currentStock} - ${parseFloat(oldItem.acceptedQty)}` })
            .where(and(eq(products.id, oldItem.productId), eq(products.orgId, orgId)));
        }
      }
      await db.delete(grnItems).where(eq(grnItems.grnId, id));

      for (const item of data.items) {
        await db.insert(grnItems).values({
          orgId,
          grnId: id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty || '0',
        });

        if (item.acceptedQty && parseFloat(item.acceptedQty) > 0) {
          await db.update(products)
            .set({ currentStock: sql`${products.currentStock} + ${parseFloat(item.acceptedQty)}` })
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)));
        }
      }
    }

    revalidatePath('/purchases/grn');
    revalidatePath('/inventory');
    return { success: true, data: updated, message: "GRN updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update GRN" };
  }
}

export async function deleteGRN(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [grn] = await db.select().from(goodReceivingNotes).where(and(eq(goodReceivingNotes.id, id), eq(goodReceivingNotes.orgId, orgId))).limit(1);
    if (!grn) return { success: false, error: "GRN not found" };

    const result = await db.transaction(async (tx) => {
      // Reverse stock: subtract accepted qty
      const items = await tx.select().from(grnItems).where(eq(grnItems.grnId, id));
      for (const item of items) {
        if (item.acceptedQty && parseFloat(item.acceptedQty) > 0) {
          await tx.update(products)
            .set({ currentStock: sql`${products.currentStock} - ${parseFloat(item.acceptedQty)}` })
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)));
        }
      }

      await tx.delete(grnItems).where(eq(grnItems.grnId, id));
      await tx.delete(goodReceivingNotes).where(and(eq(goodReceivingNotes.id, id), eq(goodReceivingNotes.orgId, orgId)));

      return { success: true };
    });

    revalidatePath('/purchases/grn');
    revalidatePath('/inventory');
    return { success: true, message: "GRN deleted and stock reversed successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete GRN" };
  }
}

// ==================== PURCHASE RETURN ACTIONS ====================

export interface PurchaseReturnFormData {
  purchaseInvoiceId?: string;
  vendorId: string;
  returnDate: string;
  reason: 'defective' | 'wrong_item' | 'not_as_described' | 'damaged_in_transit' | 'other';
  reasonDetails?: string;
  items: Array<{ productId?: string; description: string; quantity: string; unitPrice: string }>;
  notes?: string;
}

async function generatePurchaseReturnNumber(orgId: string): Promise<string> {
  const result = await db.select({ returnNumber: purchaseReturns.returnNumber }).from(purchaseReturns).where(eq(purchaseReturns.orgId, orgId)).orderBy(desc(purchaseReturns.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].returnNumber) {
    const match = result[0].returnNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }
  return `PR-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextPurchaseReturnNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const number = await generatePurchaseReturnNumber(orgId);
    return { success: true, data: number };
  } catch (error) {
    return { success: false, error: "Failed to generate purchase return number" };
  }
}

export async function getPurchaseReturns(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(purchaseReturns.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(purchaseReturns.status, statusFilter));

    let result = await db.select({
      id: purchaseReturns.id,
      returnNumber: purchaseReturns.returnNumber,
      returnDate: purchaseReturns.returnDate,
      reason: purchaseReturns.reason,
      netAmount: purchaseReturns.netAmount,
      refundAmount: purchaseReturns.refundAmount,
      status: purchaseReturns.status,
      vendor: { id: vendors.id, name: vendors.name },
      createdAt: purchaseReturns.createdAt,
    }).from(purchaseReturns)
      .leftJoin(vendors, eq(purchaseReturns.vendorId, vendors.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(purchaseReturns.createdAt));

    if (searchQuery) {
      result = result.filter(r =>
        r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch purchase returns" };
  }
}

export async function createPurchaseReturn(data: PurchaseReturnFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId) return { success: false, error: "Vendor is required" };

    const returnNumber = await generatePurchaseReturnNumber(orgId);
    const grossAmount = data.items.reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0);

    const [newReturn] = await db.insert(purchaseReturns).values({
      orgId,
      returnNumber,
      purchaseInvoiceId: data.purchaseInvoiceId || null,
      vendorId: data.vendorId,
      returnDate: new Date(data.returnDate),
      reason: data.reason,
      reasonDetails: data.reasonDetails || null,
      grossAmount: grossAmount.toFixed(2),
      netAmount: grossAmount.toFixed(2),
      refundAmount: grossAmount.toFixed(2),
      status: 'pending',
      notes: data.notes || null,
    }).returning();

    for (const item of data.items) {
      const lineTotal = parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0');
      await db.insert(purchaseReturnItems).values({
        orgId,
        purchaseReturnId: newReturn.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    revalidatePath('/purchases/returns');
    return { success: true, data: newReturn, message: "Purchase return created (pending approval)" };
  } catch (error) {
    return { success: false, error: "Failed to create purchase return" };
  }
}

export async function approvePurchaseReturn(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [purchaseReturn] = await db.select().from(purchaseReturns).where(and(eq(purchaseReturns.id, id), eq(purchaseReturns.orgId, orgId))).limit(1);
    if (!purchaseReturn) return { success: false, error: "Purchase return not found" };
    if (purchaseReturn.status === 'approved' || purchaseReturn.status === 'refunded') return { success: false, error: "Return already approved" };

    const items = await db.select().from(purchaseReturnItems).where(eq(purchaseReturnItems.purchaseReturnId, id));

    const result = await db.transaction(async (tx) => {
      // Subtract stock for returned items
      for (const item of items) {
        if (item.productId) {
          const [product] = await tx.select({ currentStock: products.currentStock }).from(products).where(and(eq(products.id, item.productId), eq(products.orgId, orgId))).limit(1);
          if (product) {
            const newStock = Math.max(0, (product.currentStock || 0) - parseFloat(item.quantity));
            await tx.update(products).set({ currentStock: newStock }).where(eq(products.id, item.productId));
          }
        }
      }

      // Update linked purchase invoice balance if exists
      if (purchaseReturn.purchaseInvoiceId) {
        const [inv] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseReturn.purchaseInvoiceId)).limit(1);
        if (inv) {
          const currentNet = parseFloat(inv.netAmount || '0');
          const refundAmt = parseFloat(purchaseReturn.refundAmount || '0');
          const newNet = Math.max(0, currentNet - refundAmt).toFixed(2);
          await tx.update(purchaseInvoices).set({ netAmount: newNet }).where(eq(purchaseInvoices.id, purchaseReturn.purchaseInvoiceId));
        }
      }

      // Update vendor balance (reduce payable)
      const [vendor] = await tx.select().from(vendors).where(eq(vendors.id, purchaseReturn.vendorId)).limit(1);
      if (vendor) {
        const currentBalance = parseFloat(vendor.balance || '0');
        const refundAmt = parseFloat(purchaseReturn.refundAmount || '0');
        const newBalance = Math.max(0, currentBalance - refundAmt).toFixed(2);
        await tx.update(vendors).set({ balance: newBalance }).where(eq(vendors.id, purchaseReturn.vendorId));
      }

      // Create debit note journal entry
      const entryNumber = await (async () => {
        const res = await tx.select({ entryNumber: journalEntries.entryNumber }).from(journalEntries).where(eq(journalEntries.orgId, orgId)).orderBy(desc(journalEntries.createdAt)).limit(1);
        let nextNum = 1;
        if (res.length > 0 && res[0].entryNumber) { const m = res[0].entryNumber.match(/\d+$/); if (m) nextNum = parseInt(m[0]) + 1; }
        return `JE-${String(nextNum).padStart(5, '0')}`;
      })();

      const [journalEntry] = await tx.insert(journalEntries).values({
        orgId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'purchase_return',
        referenceId: id,
        description: `Purchase Return ${purchaseReturn.returnNumber} - Debit Note`,
      }).returning();

      const [accountsPayable] = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Accounts Payable'))).limit(1);
      const [purchaseReturnsAccount] = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), or(eq(chartOfAccounts.name, 'Purchase Returns & Allowances'), eq(chartOfAccounts.name, 'Purchases')))).limit(1);

      if (accountsPayable && purchaseReturnsAccount) {
        // Debit: Accounts Payable (reduce liability)
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: accountsPayable.id,
          description: `Debit - Accounts Payable (Return ${purchaseReturn.returnNumber})`,
          debitAmount: purchaseReturn.refundAmount,
          creditAmount: '0',
        });

        // Credit: Purchase Returns (contra-expense)
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: purchaseReturnsAccount.id,
          description: `Credit - Purchase Returns (Return ${purchaseReturn.returnNumber})`,
          debitAmount: '0',
          creditAmount: purchaseReturn.refundAmount,
        });
      }

      // Update return status
      await tx.update(purchaseReturns).set({ status: 'approved' }).where(eq(purchaseReturns.id, id));

      return { success: true };
    });

    revalidatePath('/purchases/returns');
    revalidatePath('/inventory');
    return { success: true, message: "Purchase return approved - stock reduced and debit note created" };
  } catch (error) {
    return { success: false, error: "Failed to approve purchase return" };
  }
}

// ==================== VENDOR PAYMENT ACTIONS ====================

export interface VendorPaymentFormData {
  vendorId: string;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'credit_card' | 'other';
  amount: string;
  reference?: string;
  allocations?: Array<{ invoiceId: string; amount: string }>;
  notes?: string;
}

async function generateVendorPaymentNumber(orgId: string): Promise<string> {
  const result = await db.select({ paymentNumber: vendorPayments.paymentNumber }).from(vendorPayments).where(eq(vendorPayments.orgId, orgId)).orderBy(desc(vendorPayments.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].paymentNumber) {
    const match = result[0].paymentNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }
  return `VP-${String(nextNumber).padStart(5, '0')}`;
}

export async function getVendorPayments(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    let result = await db.select({
      id: vendorPayments.id,
      paymentNumber: vendorPayments.paymentNumber,
      paymentDate: vendorPayments.paymentDate,
      paymentMethod: vendorPayments.paymentMethod,
      amount: vendorPayments.amount,
      reference: vendorPayments.reference,
      vendor: { id: vendors.id, name: vendors.name },
    }).from(vendorPayments)
      .leftJoin(vendors, eq(vendorPayments.vendorId, vendors.id))
      .where(eq(vendorPayments.orgId, orgId))
      .orderBy(desc(vendorPayments.createdAt));

    if (searchQuery) {
      result = result.filter(p =>
        p.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch vendor payments" };
  }
}

export async function createVendorPayment(data: VendorPaymentFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId || !data.amount) return { success: false, error: "Vendor and amount are required" };

    const paymentNumber = await generateVendorPaymentNumber(orgId);

    const [newPayment] = await db.insert(vendorPayments).values({
      orgId,
      paymentNumber,
      vendorId: data.vendorId,
      paymentDate: new Date(data.paymentDate),
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      reference: data.reference || '',
      notes: data.notes || null,
    }).returning();

    // Process allocations
    if (data.allocations && data.allocations.length > 0) {
      for (const alloc of data.allocations) {
        await db.insert(vendorPaymentAllocations).values({
          orgId,
          vendorPaymentId: newPayment.id,
          purchaseInvoiceId: alloc.invoiceId,
          allocatedAmount: alloc.amount,
        });

        // Update purchase invoice balance
        const [inv] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, alloc.invoiceId)).limit(1);
        if (inv) {
          const currentNet = parseFloat(inv.netAmount || '0');
          const allocated = parseFloat(alloc.amount);
          // We track payment allocations separately; netAmount stays as original
          // Update vendor balance
        }
      }
    }

    // Create journal entry: Debit Accounts Payable, Credit Cash/Bank
    const entryNumber = await (async () => {
      const res = await db.select({ entryNumber: journalEntries.entryNumber }).from(journalEntries).where(eq(journalEntries.orgId, orgId)).orderBy(desc(journalEntries.createdAt)).limit(1);
      let nextNum = 1;
      if (res.length > 0 && res[0].entryNumber) { const m = res[0].entryNumber.match(/\d+$/); if (m) nextNum = parseInt(m[0]) + 1; }
      return `JE-${String(nextNum).padStart(5, '0')}`;
    })();

    const [cashAccount] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), or(ilike(chartOfAccounts.name, '%cash%'), ilike(chartOfAccounts.name, '%bank%')))).limit(1);
    const [apAccount] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Accounts Payable'))).limit(1);

    if (cashAccount && apAccount) {
      const [journalEntry] = await db.insert(journalEntries).values({
        orgId,
        entryNumber,
        entryDate: new Date(data.paymentDate),
        referenceType: 'vendor_payment',
        referenceId: newPayment.id,
        description: `Vendor Payment ${paymentNumber}`,
      }).returning();

      // Debit: Accounts Payable (reduce liability)
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: apAccount.id,
        description: `Debit - Accounts Payable`,
        debitAmount: data.amount,
        creditAmount: '0',
      });

      // Credit: Cash/Bank (reduce asset)
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: cashAccount.id,
        description: `Credit - ${cashAccount.name}`,
        debitAmount: '0',
        creditAmount: data.amount,
      });
    }

    // Update vendor balance (reduce payable)
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, data.vendorId)).limit(1);
    if (vendor) {
      const currentBalance = parseFloat(vendor.balance || '0');
      const newBalance = Math.max(0, currentBalance - parseFloat(data.amount)).toFixed(2);
      await db.update(vendors).set({ balance: newBalance }).where(eq(vendors.id, data.vendorId));
    }

    revalidatePath('/purchases/payments');
    revalidatePath('/purchases/invoices');
    return { success: true, data: newPayment, message: "Vendor payment recorded successfully" };
  } catch (error) {
    return { success: false, error: "Failed to record vendor payment" };
  }
}

export async function allocateVendorPayment(paymentId: string, allocations: Array<{invoiceId: string, amount: string}>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [payment] = await db.select().from(vendorPayments).where(eq(vendorPayments.id, paymentId)).limit(1);
    if (!payment) return { success: false, error: "Payment not found" };

    for (const alloc of allocations) {
      await db.insert(vendorPaymentAllocations).values({
        orgId,
        vendorPaymentId: paymentId,
        purchaseInvoiceId: alloc.invoiceId,
        allocatedAmount: alloc.amount,
      });
    }

    revalidatePath('/purchases/payments');
    return { success: true, message: "Payment allocated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to allocate payment" };
  }
}

export async function getVendorOutstandingInvoices(vendorId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const invoices = await db.select({
      id: purchaseInvoices.id,
      billNumber: purchaseInvoices.billNumber,
      date: purchaseInvoices.date,
      dueDate: purchaseInvoices.dueDate,
      netAmount: purchaseInvoices.netAmount,
      status: purchaseInvoices.status,
    }).from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.vendorId, vendorId), eq(purchaseInvoices.orgId, orgId)))
      .orderBy(desc(purchaseInvoices.date));

    // Calculate paid amounts from allocations
    const result = [];
    for (const inv of invoices) {
      const allocations = await db.select({
        totalPaid: sql<string>`COALESCE(SUM(${vendorPaymentAllocations.allocatedAmount}), 0)`,
      }).from(vendorPaymentAllocations)
        .where(eq(vendorPaymentAllocations.purchaseInvoiceId, inv.id));

      const totalPaid = parseFloat(allocations[0]?.totalPaid || '0');
      const netAmt = parseFloat(inv.netAmount || '0');
      const balance = netAmt - totalPaid;

      if (balance > 0) {
        result.push({
          ...inv,
          originalAmount: inv.netAmount,
          paidAmount: totalPaid.toFixed(2),
          balanceAmount: balance.toFixed(2),
        });
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch outstanding invoices" };
  }
}

// ==================== VENDOR SETTLEMENT ACTIONS ====================

export async function createVendorSettlement(data: {
  vendorId: string;
  settlementDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'credit_card' | 'other';
  documents: Array<{ documentId: string; documentType: string; originalAmount: string; paidAmount: string; balanceAmount: string; discountAmount: string; settlementAmount: string }>;
  reference?: string;
  notes?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.vendorId || !data.documents.length) return { success: false, error: "Vendor and documents are required" };

    const settlementNumber = await (async () => {
      const res = await db.select({ settlementNumber: settlements.settlementNumber }).from(settlements).where(eq(settlements.orgId, orgId)).orderBy(desc(settlements.createdAt)).limit(1);
      let nextNum = 1;
      if (res.length > 0 && res[0].settlementNumber) { const m = res[0].settlementNumber.match(/\d+$/); if (m) nextNum = parseInt(m[0]) + 1; }
      return `STL-${String(nextNum).padStart(5, '0')}`;
    })();

    const totalOutstanding = data.documents.reduce((sum, doc) => sum + parseFloat(doc.balanceAmount || '0'), 0);
    const totalDiscount = data.documents.reduce((sum, doc) => sum + parseFloat(doc.discountAmount || '0'), 0);
    const totalSettlement = data.documents.reduce((sum, doc) => sum + parseFloat(doc.settlementAmount || '0'), 0);

    const [newSettlement] = await db.insert(settlements).values({
      orgId,
      settlementNumber,
      entityType: 'vendor',
      entityId: data.vendorId,
      settlementDate: new Date(data.settlementDate),
      totalOutstanding: totalOutstanding.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      paidAmount: totalSettlement.toFixed(2),
      status: totalSettlement >= totalOutstanding - totalDiscount ? 'settled' : 'partial',
      paymentMethod: data.paymentMethod,
      reference: data.reference || '',
      notes: data.notes || null,
    }).returning();

    for (const doc of data.documents) {
      await db.insert(settlementLines).values({
        orgId,
        settlementId: newSettlement.id,
        documentType: doc.documentType,
        documentId: doc.documentId,
        originalAmount: doc.originalAmount,
        paidAmount: doc.paidAmount,
        adjustedAmount: doc.settlementAmount,
        discountAmount: doc.discountAmount,
        balanceAmount: '0',
      });

      // Update purchase invoice balances if applicable
      if (doc.documentType === 'invoice') {
        await db.update(purchaseInvoices).set({
          status: 'paid',
        }).where(and(eq(purchaseInvoices.id, doc.documentId), eq(purchaseInvoices.orgId, orgId)));
      }
    }

    // Update vendor balance
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, data.vendorId)).limit(1);
    if (vendor) {
      const currentBalance = parseFloat(vendor.balance || '0');
      const newBalance = Math.max(0, currentBalance - totalSettlement).toFixed(2);
      await db.update(vendors).set({ balance: newBalance }).where(eq(vendors.id, data.vendorId));
    }

    revalidatePath('/purchases/settlement');
    return { success: true, data: newSettlement, message: "Vendor settlement completed successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create vendor settlement" };
  }
}
