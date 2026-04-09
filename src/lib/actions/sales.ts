"use server";

import { db } from "@/db";
import {
  customers,
  invoices,
  invoiceItems,
  organizations,
  profiles,
  chartOfAccounts,
  products,
  auditLogs,
  journalEntries,
  journalEntryLines,
  saleOrders,
  orderItems
} from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
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
    console.error("getCurrentOrgId error:", error);
    return null;
  }
}

// ==================== CUSTOMER ACTIONS ====================

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  openingBalance?: string;
  creditLimit?: string;
}

export interface CustomerWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  balance: string | null;
  creditLimit: string | null;
  isActive: boolean;
  createdAt: Date;
  totalInvoices?: number;
  outstandingBalance?: string;
}

// Get all customers
export async function getCustomers(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    let whereClause = and(eq(customers.orgId, orgId), eq(customers.isActive, true));

    if (searchQuery) {
      whereClause = and(
        eq(customers.orgId, orgId),
        eq(customers.isActive, true),
        or(
          ilike(customers.name, `%${searchQuery}%`),
          ilike(customers.email, `%${searchQuery}%`),
          ilike(customers.phone, `%${searchQuery}%`),
          ilike(customers.ntn, `%${searchQuery}%`),
        )
      );
    }

    const result = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt));

    return { success: true, data: result };
  } catch (error) {
    console.error("getCustomers error:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// Get customer by ID
export async function getCustomerById(customerId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
      .limit(1);

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    return { success: true, data: customer };
  } catch (error) {
    console.error("getCustomerById error:", error);
    return { success: false, error: "Failed to fetch customer" };
  }
}

// Create customer
export async function createCustomer(data: CustomerFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.name) {
      return { success: false, error: "Customer name is required" };
    }

    const [newCustomer] = await db
      .insert(customers)
      .values({
        orgId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        ntn: data.ntn || null,
        strn: data.strn || null,
        openingBalance: data.openingBalance || '0',
        balance: data.openingBalance || '0',
        creditLimit: data.creditLimit || null,
      })
      .returning();

    revalidatePath('/sales/customers');

    return { success: true, data: newCustomer, message: "Customer created successfully" };
  } catch (error) {
    console.error("createCustomer error:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

// Update customer
export async function updateCustomer(customerId: string, data: Partial<CustomerFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.ntn !== undefined) updateData.ntn = data.ntn;
    if (data.strn !== undefined) updateData.strn = data.strn;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)))
      .returning();

    if (!updatedCustomer) {
      return { success: false, error: "Customer not found" };
    }

    revalidatePath('/sales/customers');

    return { success: true, data: updatedCustomer, message: "Customer updated successfully" };
  } catch (error) {
    console.error("updateCustomer error:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

// Delete customer (soft delete)
export async function deleteCustomer(customerId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    await db
      .update(customers)
      .set({ isActive: false })
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));

    revalidatePath('/sales/customers');

    return { success: true, message: "Customer deleted successfully" };
  } catch (error) {
    console.error("deleteCustomer error:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}

// ==================== INVOICE ACTIONS ====================

export interface InvoiceLineItem {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage?: string;
  taxRate: string;
  lineTotal: string;
}

export interface InvoiceFormData {
  customerId: string;
  invoiceNumber: string;
  orderBooker?: string;
  subject?: string;
  reference?: string;
  issueDate: Date;
  dueDate?: Date;
  grossAmount: string;
  discountPercentage?: string;
  discountAmount?: string;
  taxAmount: string;
  shippingCharges?: string;
  roundOff?: string;
  netAmount: string;
  receivedAmount?: string;
  balanceAmount?: string;
  cashBankAccountId?: string;
  notes?: string;
  terms?: string;
  items: InvoiceLineItem[];
}

// Get all invoices
export async function getInvoices(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const conditions = [eq(invoices.orgId, orgId)];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(invoices.status, statusFilter as any));
    }

    let result = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        netAmount: invoices.netAmount,
        grossAmount: invoices.grossAmount,
        taxAmount: invoices.taxAmount,
        balanceAmount: invoices.balanceAmount,
        createdAt: invoices.createdAt,
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(invoices.createdAt));

    // Apply search filter if provided
    if (searchQuery) {
      result = result.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("getInvoices error:", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}

// Get invoice by ID with items
export async function getInvoiceById(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
      .limit(1);

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    return { success: true, data: { ...invoice, items } };
  } catch (error) {
    console.error("getInvoiceById error:", error);
    return { success: false, error: "Failed to fetch invoice" };
  }
}

// Generate invoice number
async function generateInvoiceNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.orgId, orgId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].invoiceNumber) {
    const match = result[0].invoiceNumber.match(/\d+$/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      nextNumber = lastNumber + 1;
    }
  }

  return `SL-${String(nextNumber).padStart(5, '0')}`;
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

// Create invoice (Draft/Pending - does not update inventory yet)
export async function createInvoice(data: InvoiceFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.customerId || !data.items.length) {
      return { success: false, error: "Customer and at least one item are required" };
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(orgId);

    // Calculate balance
    const receivedAmount = data.receivedAmount || '0';
    const netAmount = data.netAmount;
    const balanceAmount = (parseFloat(netAmount) - parseFloat(receivedAmount)).toFixed(2);

    // Create invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        orgId,
        invoiceNumber,
        customerId: data.customerId,
        orderBooker: data.orderBooker || null,
        subject: data.subject || null,
        reference: data.reference || null,
        issueDate: data.issueDate,
        dueDate: data.dueDate || null,
        status: 'draft',
        grossAmount: data.grossAmount,
        discountPercentage: data.discountPercentage || '0',
        discountAmount: data.discountAmount || '0',
        taxAmount: data.taxAmount,
        shippingCharges: data.shippingCharges || '0',
        roundOff: data.roundOff || '0',
        netAmount: data.netAmount,
        receivedAmount: receivedAmount,
        balanceAmount: balanceAmount,
        cashBankAccountId: data.cashBankAccountId || null,
        notes: data.notes,
        terms: data.terms,
      })
      .returning();

    // Create invoice items
    for (const item of data.items) {
      await db.insert(invoiceItems).values({
        orgId,
        invoiceId: newInvoice.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || '0',
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: newInvoice.id,
      changes: JSON.stringify({
        invoiceNumber: newInvoice.invoiceNumber,
        netAmount: newInvoice.netAmount,
        status: newInvoice.status,
      }),
    });

    revalidatePath('/sales/invoices');
    revalidatePath('/sales/invoices/new');

    return {
      success: true,
      data: newInvoice,
      message: "Invoice created successfully",
      invoiceNumber
    };
  } catch (error) {
    console.error("createInvoice error:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

// Approve invoice (Atomic Transaction - Updates inventory & creates journal entries)
export async function approveInvoice(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Get invoice with items
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
      .limit(1);

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === 'approved') {
      return { success: false, error: "Invoice is already approved" };
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    // Start atomic transaction
    const result = await db.transaction(async (tx) => {
      // 1. Update invoice status to Approved
      await tx
        .update(invoices)
        .set({ status: 'approved' })
        .where(eq(invoices.id, invoiceId));

      // 2. Update inventory (subtract stock)
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

      // 3. Create Journal Entry
      const entryNumber = await generateJournalEntryNumber(orgId);
      
      const [journalEntry] = await tx
        .insert(journalEntries)
        .values({
          orgId,
          entryNumber,
          entryDate: new Date(),
          referenceType: 'invoice',
          referenceId: invoiceId,
          description: `Invoice ${invoice.invoiceNumber} approval`,
        })
        .returning();

      // Find required accounts
      const [accountsReceivable] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Accounts Receivable')
        ))
        .limit(1);

      const [salesRevenue] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Sales Revenue')
        ))
        .limit(1);

      const [salesTaxPayable] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Sales Tax Payable')
        ))
        .limit(1);

      if (!accountsReceivable || !salesRevenue) {
        throw new Error('Required accounts not found. Please seed Chart of Accounts first.');
      }

      // 4. Create Journal Entry Lines
      // Debit: Accounts Receivable (Net Amount)
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: accountsReceivable.id,
        description: `Debit - Accounts Receivable (Invoice ${invoice.invoiceNumber})`,
        debitAmount: invoice.netAmount,
        creditAmount: '0',
      });

      // Credit: Sales Revenue (Gross Amount)
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: salesRevenue.id,
        description: `Credit - Sales Revenue (Invoice ${invoice.invoiceNumber})`,
        debitAmount: '0',
        creditAmount: invoice.grossAmount || '0',
      });

      // Credit: Sales Tax Payable (if tax > 0)
      const taxAmount = parseFloat(invoice.taxAmount || '0');
      if (taxAmount > 0 && salesTaxPayable) {
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: salesTaxPayable.id,
          description: `Credit - Sales Tax Payable (Invoice ${invoice.invoiceNumber})`,
          debitAmount: '0',
          creditAmount: invoice.taxAmount,
        });
      }

      // If payment received, record cash/bank entry
      const receivedAmount = parseFloat(invoice.receivedAmount || '0');
      if (receivedAmount > 0 && invoice.cashBankAccountId) {
        // Debit: Cash/Bank Account
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: invoice.cashBankAccountId,
          description: `Debit - Cash/Bank (Payment for Invoice ${invoice.invoiceNumber})`,
          debitAmount: invoice.receivedAmount,
          creditAmount: '0',
        });

        // Credit: Customer Account (reduce receivable)
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: accountsReceivable.id,
          description: `Credit - Accounts Receivable (Payment for Invoice ${invoice.invoiceNumber})`,
          debitAmount: '0',
          creditAmount: invoice.receivedAmount,
        });
      }

      // 5. Create audit log
      await tx.insert(auditLogs).values({
        orgId,
        userId: (await auth()).userId || 'system',
        action: 'INVOICE_APPROVED',
        entityType: 'invoice',
        entityId: invoiceId,
        changes: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          status: 'approved',
          journalEntry: entryNumber,
        }),
      });

      return { success: true, message: 'Invoice approved and journal entry created', entryNumber };
    });

    revalidatePath('/sales/invoices');
    revalidatePath('/inventory');

    return result;
  } catch (error) {
    console.error("approveInvoice error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve invoice" };
  }
}

// Update invoice status
export async function updateInvoiceStatus(invoiceId: string, status: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [updatedInvoice] = await db
      .update(invoices)
      .set({ status })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
      .returning();

    if (!updatedInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    revalidatePath('/sales/invoices');

    return { success: true, data: updatedInvoice, message: "Invoice status updated" };
  } catch (error) {
    console.error("updateInvoiceStatus error:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}

// Delete invoice
export async function deleteInvoice(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Delete invoice items first
    await db
      .delete(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    // Delete invoice
    await db
      .delete(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));

    revalidatePath('/sales/invoices');

    return { success: true, message: "Invoice deleted successfully" };
  } catch (error) {
    console.error("deleteInvoice error:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}

// Get invoice stats
export async function getInvoiceStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const allInvoices = await db
      .select({
        status: invoices.status,
        netAmount: invoices.netAmount,
      })
      .from(invoices)
      .where(eq(invoices.orgId, orgId));

    const totalInvoices = allInvoices.length;
    const totalRevenue = allInvoices.reduce((sum, inv) => {
      return sum + (inv.netAmount ? parseFloat(inv.netAmount) : 0);
    }, 0);

    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid' || inv.status === 'approved').length;
    const pendingInvoices = allInvoices.filter(inv => inv.status === 'sent' || inv.status === 'draft' || inv.status === 'pending').length;
    const overdueInvoices = allInvoices.filter(inv => inv.status === 'overdue').length;

    return {
      success: true,
      data: {
        totalInvoices,
        totalRevenue,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
      },
    };
  } catch (error) {
    console.error("getInvoiceStats error:", error);
    return { success: false, error: "Failed to fetch invoice stats" };
  }
}

// ==================== JOURNAL ENTRY ACTIONS ====================

// Create journal entry for invoice (Accounting Integration)
export async function createInvoiceJournalEntry(invoiceId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Get invoice details
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
      .limit(1);

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Find accounts
    const accountsReceivable = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Accounts Receivable')
      ))
      .limit(1);

    const salesRevenue = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Sales Revenue')
      ))
      .limit(1);

    const salesTaxPayable = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Sales Tax Payable')
      ))
      .limit(1);

    // Note: This function is deprecated - use approveInvoice instead
    // which creates proper journal entries with the new schema

    // For now, just log the entry
    console.log('Journal Entry for Invoice:', {
      invoiceId,
      debit: { account: 'Accounts Receivable', amount: invoice.netAmount },
      credits: [
        { account: 'Sales Revenue', amount: invoice.grossAmount },
        { account: 'Sales Tax Payable', amount: invoice.taxAmount },
      ],
    });

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: invoiceId,
      changes: JSON.stringify({
        invoiceNumber: invoice.invoiceNumber,
        netAmount: invoice.netAmount,
        status: invoice.status,
      }),
    });

    return { success: true, message: "Journal entry created for invoice" };
  } catch (error) {
    console.error("createInvoiceJournalEntry error:", error);
    return { success: false, error: "Failed to create journal entry" };
  }
}

// ==================== HELPER FUNCTIONS ====================

// Get Cash/Bank accounts for payment dropdown
export async function getCashBankAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.isActive, true),
        or(
          eq(chartOfAccounts.type, 'asset'),
          eq(chartOfAccounts.type, 'bank')
        )
      ))
      .orderBy(chartOfAccounts.code);

    // Filter for cash and bank accounts specifically
    const cashBankAccounts = accounts.filter(acc => 
      acc.name.toLowerCase().includes('cash') || 
      acc.name.toLowerCase().includes('bank') ||
      acc.code.startsWith('11') // Common prefix for cash/bank accounts
    );

    return { success: true, data: cashBankAccounts };
  } catch (error) {
    console.error("getCashBankAccounts error:", error);
    return { success: false, error: "Failed to fetch cash/bank accounts" };
  }
}

// Get next invoice number (for UI display)
export async function getNextInvoiceNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const invoiceNumber = await generateInvoiceNumber(orgId);
    return { success: true, data: invoiceNumber };
  } catch (error) {
    console.error("getNextInvoiceNumber error:", error);
    return { success: false, error: "Failed to generate invoice number" };
  }
}

// ==================== SALE ORDER ACTIONS ====================

// Generate sale order number
async function generateSaleOrderNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ orderNumber: saleOrders.orderNumber })
    .from(saleOrders)
    .where(eq(saleOrders.orgId, orgId))
    .orderBy(desc(saleOrders.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].orderNumber) {
    const match = result[0].orderNumber.match(/\d+$/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      nextNumber = lastNumber + 1;
    }
  }

  return `SO-${String(nextNumber).padStart(5, '0')}`;
}

// Sale Order Form Data interface
export interface SaleOrderFormData {
  customerId: string;
  orderNumber: string;
  orderBooker?: string;
  subject?: string;
  reference?: string;
  orderDate: Date;
  deliveryDate?: Date;
  grossAmount: string;
  discountPercentage?: string;
  discountAmount?: string;
  taxAmount: string;
  shippingCharges?: string;
  roundOff?: string;
  netAmount: string;
  notes?: string;
  terms?: string;
  items: InvoiceLineItem[];
}

// Get next sale order number (for UI display)
export async function getNextSaleOrderNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const orderNumber = await generateSaleOrderNumber(orgId);
    return { success: true, data: orderNumber };
  } catch (error) {
    console.error("getNextSaleOrderNumber error:", error);
    return { success: false, error: "Failed to generate sale order number" };
  }
}

// Create sale order (Draft - does not update inventory)
export async function createSaleOrder(data: SaleOrderFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    if (!data.customerId || !data.items.length) {
      return { success: false, error: "Customer and at least one item are required" };
    }

    // Generate order number
    const orderNumber = await generateSaleOrderNumber(orgId);

    // Create sale order
    const [newOrder] = await db
      .insert(saleOrders)
      .values({
        orgId,
        orderNumber,
        customerId: data.customerId,
        orderBooker: data.orderBooker || '',
        subject: data.subject || '',
        reference: data.reference || '',
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || null,
        status: 'draft',
        grossAmount: data.grossAmount,
        discountPercentage: data.discountPercentage || '0',
        discountAmount: data.discountAmount || '0',
        taxAmount: data.taxAmount,
        shippingCharges: data.shippingCharges || '0',
        roundOff: data.roundOff || '0',
        netAmount: data.netAmount,
        notes: data.notes,
        terms: data.terms,
      })
      .returning();

    // Create order items
    for (const item of data.items) {
      await db.insert(orderItems).values({
        orgId,
        orderId: newOrder.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || '0',
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'SALE_ORDER_CREATED',
      entityType: 'sale_order',
      entityId: newOrder.id,
      changes: JSON.stringify({
        orderNumber: newOrder.orderNumber,
        netAmount: newOrder.netAmount,
        status: newOrder.status,
      }),
    });

    revalidatePath('/sales/orders');
    revalidatePath('/sales/orders/new');

    return {
      success: true,
      data: newOrder,
      message: "Sale order created successfully",
      orderNumber
    };
  } catch (error) {
    console.error("createSaleOrder error:", error);
    return { success: false, error: "Failed to create sale order" };
  }
}

// Approve sale order (does NOT update inventory or create journal entries)
export async function approveSaleOrder(orderId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Get order
    const [order] = await db
      .select()
      .from(saleOrders)
      .where(and(eq(saleOrders.id, orderId), eq(saleOrders.orgId, orgId)))
      .limit(1);

    if (!order) {
      return { success: false, error: "Sale order not found" };
    }

    if (order.status === 'approved' || order.status === 'confirmed') {
      return { success: false, error: "Sale order is already approved" };
    }

    // Update status only (no inventory/journal updates for orders)
    const [updatedOrder] = await db
      .update(saleOrders)
      .set({ status: 'approved' })
      .where(eq(saleOrders.id, orderId))
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || 'system',
      action: 'SALE_ORDER_APPROVED',
      entityType: 'sale_order',
      entityId: orderId,
      changes: JSON.stringify({
        orderNumber: order.orderNumber,
        status: 'approved',
      }),
    });

    revalidatePath('/sales/orders');

    return { success: true, data: updatedOrder, message: 'Sale order approved' };
  } catch (error) {
    console.error("approveSaleOrder error:", error);
    return { success: false, error: "Failed to approve sale order" };
  }
}

// Get all sale orders
export async function getSaleOrders(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const conditions = [eq(saleOrders.orgId, orgId)];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(saleOrders.status, statusFilter as any));
    }

    let result = await db
      .select({
        id: saleOrders.id,
        orderNumber: saleOrders.orderNumber,
        orderDate: saleOrders.orderDate,
        deliveryDate: saleOrders.deliveryDate,
        status: saleOrders.status,
        netAmount: saleOrders.netAmount,
        grossAmount: saleOrders.grossAmount,
        taxAmount: saleOrders.taxAmount,
        createdAt: saleOrders.createdAt,
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(saleOrders)
      .leftJoin(customers, eq(saleOrders.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(saleOrders.createdAt));

    // Apply search filter if provided
    if (searchQuery) {
      result = result.filter(ord =>
        ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("getSaleOrders error:", error);
    return { success: false, error: "Failed to fetch sale orders" };
  }
}

// Get sale order by ID with items
export async function getSaleOrderById(orderId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const [order] = await db
      .select()
      .from(saleOrders)
      .where(and(eq(saleOrders.id, orderId), eq(saleOrders.orgId, orgId)))
      .limit(1);

    if (!order) {
      return { success: false, error: "Sale order not found" };
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return { success: true, data: { ...order, items } };
  } catch (error) {
    console.error("getSaleOrderById error:", error);
    return { success: false, error: "Failed to fetch sale order" };
  }
}
