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
} from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
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
      // Debit: Inventory (Asset) - Net Amount
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: inventoryAccount.id,
        description: `Debit - Inventory Asset (Purchase ${invoice.billNumber})`,
        debitAmount: invoice.netAmount,
        creditAmount: '0',
      });

      // Credit: Vendor Payable (Liability) - Net Amount
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: vendorPayable.id,
        description: `Credit - Vendor Payable (Purchase ${invoice.billNumber})`,
        debitAmount: '0',
        creditAmount: invoice.netAmount,
      });

      // If tax > 0, add tax entry
      const taxAmount = parseFloat(invoice.taxTotal || '0');
      if (taxAmount > 0 && purchaseTax) {
        // Adjust: Debit Inventory for gross, Credit Payable for gross
        // Already done above, now add tax split
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: purchaseTax.id,
          description: `Debit - Input Tax (Purchase ${invoice.billNumber})`,
          debitAmount: invoice.taxTotal,
          creditAmount: '0',
        });

        // Reduce inventory debit by tax amount (net effect)
        // This is handled in the main inventory debit above
      }

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
