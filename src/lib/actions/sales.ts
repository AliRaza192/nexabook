"use server";

import { db } from "@/db";
import {
  customers,
  invoices,
  invoiceItems,
  chartOfAccounts,
  products,
  auditLogs,
  journalEntries,
  journalEntryLines,
  stockMovements,
  saleOrders,
  orderItems,
  quotations,
  quotationItems,
  deliveryNotes,
  deliveryNoteItems,
  recurringInvoices,
  recurringInvoiceItems,
  salesReturns,
  salesReturnItems,
  customerPayments,
  customerPaymentAllocations,
  settlements,
  settlementLines
} from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

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

      // 2. Update inventory (subtract stock) & log stock movements
      for (const item of items) {
        if (item.productId) {
          const [product] = await tx
            .select({ currentStock: products.currentStock, costPrice: products.costPrice, name: products.name })
            .from(products)
            .where(and(eq(products.id, item.productId), eq(products.orgId, orgId)))
            .limit(1);

          if (product) {
            const available = product.currentStock || 0;
            const required = parseFloat(item.quantity);
            if (required > available) {
              throw new Error(`Insufficient stock for ${product.name || 'product'}. Required: ${required}, Available: ${available}`);
            }
            const newStock = available - required;
            await tx
              .update(products)
              .set({ currentStock: newStock })
              .where(eq(products.id, item.productId));

            // Log stock movement
            const unitCost = product.costPrice || '0';
            const totalValue = (required * parseFloat(unitCost)).toFixed(2);
            await tx.insert(stockMovements).values({
              orgId,
              productId: item.productId,
              movementType: 'out',
              reason: 'sale',
              quantity: item.quantity,
              unitCost,
              totalValue,
              referenceType: 'invoice',
              referenceId: invoiceId,
              referenceNumber: invoice.invoiceNumber,
              runningBalance: String(newStock),
            });
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
      const discountAmount = parseFloat(invoice.discountAmount || '0');
      const shippingAmount = parseFloat(invoice.shippingCharges || '0');

      // Fetch Discount Allowed account (expense — debit side)
      const [discountAllowed] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Discount Allowed')
        ))
        .limit(1);

      // Fetch Shipping Revenue account (income — credit side)
      const [shippingRevenue] = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.orgId, orgId),
          eq(chartOfAccounts.name, 'Shipping Revenue')
        ))
        .limit(1);

      const taxAmount = parseFloat(invoice.taxAmount || '0');

      // Debit: Accounts Receivable (Net Amount)
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: accountsReceivable.id,
        description: `Debit - Accounts Receivable (Invoice ${invoice.invoiceNumber})`,
        debitAmount: invoice.netAmount,
        creditAmount: '0',
      });

      // Debit: Discount Allowed (if discount > 0)
      if (discountAmount > 0) {
        if (!discountAllowed) {
          throw new Error('Discount Allowed account not found. Please seed Chart of Accounts first.');
        }
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: discountAllowed.id,
          description: `Debit - Discount Allowed (Invoice ${invoice.invoiceNumber})`,
          debitAmount: invoice.discountAmount,
          creditAmount: '0',
        });
      }

      // Credit: Sales Revenue (grossAmount - discountAmount)
      const salesRevenueAmount = (parseFloat(invoice.grossAmount || '0') - discountAmount).toFixed(2);
      await tx.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: salesRevenue.id,
        description: `Credit - Sales Revenue (Invoice ${invoice.invoiceNumber})`,
        debitAmount: '0',
        creditAmount: salesRevenueAmount,
      });

      // Credit: Sales Tax Payable (if tax > 0)
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

      // Credit: Shipping Revenue (if shipping > 0)
      if (shippingAmount > 0) {
        if (!shippingRevenue) {
          throw new Error('Shipping Revenue account not found. Please seed Chart of Accounts first.');
        }
        await tx.insert(journalEntryLines).values({
          orgId,
          journalEntryId: journalEntry.id,
          accountId: shippingRevenue.id,
          description: `Credit - Shipping Revenue (Invoice ${invoice.invoiceNumber})`,
          debitAmount: '0',
          creditAmount: invoice.shippingCharges,
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
    return { success: false, error: "Failed to fetch sale order" };
  }
}

// ==========================================
// ADVANCED SALES MODULE
// ==========================================

// ==================== QUOTATION TYPES ====================

export interface QuotationFormData {
  customerId: string;
  subject?: string;
  reference?: string;
  issueDate: string;
  expiryDate?: string;
  items: Array<{ productId?: string; description: string; quantity: string; unitPrice: string; discountPercentage?: string; taxRate?: string }>;
  discountPercentage?: string;
  taxAmount?: string;
  shippingCharges?: string;
  notes?: string;
  terms?: string;
}

export interface DeliveryNoteFormData {
  invoiceId?: string;
  orderId?: string;
  customerId: string;
  deliveryDate: string;
  shippedVia?: string;
  trackingNumber?: string;
  deliveryAddress?: string;
  items: Array<{ productId?: string; description: string; orderedQty: string; deliveredQty: string }>;
  notes?: string;
}

export interface RecurringInvoiceFormData {
  customerId: string;
  templateName: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  subject?: string;
  status?: string;
  items: Array<{ productId?: string; description: string; quantity: string; unitPrice: string; taxRate?: string }>;
  discountPercentage?: string;
  taxAmount?: string;
  shippingCharges?: string;
  notes?: string;
  terms?: string;
}

export interface SalesReturnFormData {
  invoiceId?: string;
  customerId: string;
  returnDate: string;
  reason: 'defective' | 'wrong_item' | 'not_as_described' | 'customer_request' | 'damaged_in_transit' | 'other';
  reasonDetails?: string;
  items: Array<{ productId?: string; description: string; quantity: string; unitPrice: string }>;
  notes?: string;
}

export interface CustomerPaymentFormData {
  customerId: string;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'credit_card' | 'other';
  amount: string;
  reference?: string;
  allocations?: Array<{ invoiceId: string; amount: string }>;
  notes?: string;
}

export interface SettlementFormData {
  customerId: string;
  settlementDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'credit_card' | 'other';
  documents: Array<{ documentId: string; documentType: string; originalAmount: string; paidAmount: string; balanceAmount: string; discountAmount: string; settlementAmount: string }>;
  reference?: string;
  notes?: string;
}

// ==================== QUOTATION ACTIONS ====================

async function generateQuotationNumber(orgId: string): Promise<string> {
  const result = await db.select({ quotationNumber: quotations.quotationNumber }).from(quotations).where(eq(quotations.orgId, orgId)).orderBy(desc(quotations.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].quotationNumber) {
    const match = result[0].quotationNumber.match(/\d+$/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }
  return `QUO-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextQuotationNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const number = await generateQuotationNumber(orgId);
    return { success: true, data: number };
  } catch (error) {
    return { success: false, error: "Failed to generate quotation number" };
  }
}

export async function getQuotations(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const conditions = [eq(quotations.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(quotations.status, statusFilter as any));
    let result = await db.select({
      id: quotations.id, quotationNumber: quotations.quotationNumber, issueDate: quotations.issueDate,
      expiryDate: quotations.expiryDate, status: quotations.status, netAmount: quotations.netAmount,
      subject: quotations.subject, createdAt: quotations.createdAt,
      customer: { id: customers.id, name: customers.name }
    }).from(quotations).leftJoin(customers, eq(quotations.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]).orderBy(desc(quotations.createdAt));
    if (searchQuery) {
      result = result.filter(q => q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) || q.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) || q.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch quotations" };
  }
}

export async function getQuotationById(quotationId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const [quotation] = await db.select().from(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.orgId, orgId))).limit(1);
    if (!quotation) return { success: false, error: "Quotation not found" };
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
    return { success: true, data: { ...quotation, items } };
  } catch (error) {
    return { success: false, error: "Failed to fetch quotation" };
  }
}

export async function createQuotation(data: QuotationFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId || !data.items.length) return { success: false, error: "Customer and at least one item are required" };
    const quotationNumber = await generateQuotationNumber(orgId);
    const grossAmount = data.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
      const discPct = parseFloat(item.discountPercentage || '0'); const lineTotal = qty * price;
      return sum + (lineTotal - (lineTotal * discPct / 100));
    }, 0);
    const globalDiscPct = parseFloat(data.discountPercentage || '0');
    const discountAmount = grossAmount * globalDiscPct / 100;
    const taxAmount = parseFloat(data.taxAmount || '0');
    const shipping = parseFloat(data.shippingCharges || '0');
    const netAmount = grossAmount - discountAmount + taxAmount + shipping;
    const [newQuotation] = await db.insert(quotations).values({
      orgId, quotationNumber, customerId: data.customerId, subject: data.subject || '',
      reference: data.reference || '', issueDate: new Date(data.issueDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null, status: 'draft',
      grossAmount: grossAmount.toFixed(2), discountPercentage: globalDiscPct.toFixed(2),
      discountAmount: discountAmount.toFixed(2), taxAmount: taxAmount.toFixed(2),
      shippingCharges: shipping.toFixed(2), netAmount: netAmount.toFixed(2),
      notes: data.notes || null, terms: data.terms || null
    }).returning();
    for (const item of data.items) {
      const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
      const discPct = parseFloat(item.discountPercentage || '0'); const taxRate = parseFloat(item.taxRate || '0');
      const lineTotal = (qty * price) - ((qty * price) * discPct / 100);
      await db.insert(quotationItems).values({
        orgId, quotationId: newQuotation.id, productId: item.productId || null,
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || '0', taxRate: item.taxRate || '0', lineTotal: lineTotal.toFixed(2)
      });
    }
    await db.insert(auditLogs).values({ orgId, userId: (await auth()).userId || 'system', action: 'QUOTATION_CREATED', entityType: 'quotation', entityId: newQuotation.id, changes: JSON.stringify({ quotationNumber, netAmount }) });
    revalidatePath('/sales/quotations');
    return { success: true, data: newQuotation, message: "Quotation created successfully", quotationNumber };
  } catch (error) {
    return { success: false, error: "Failed to create quotation" };
  }
}

export async function updateQuotation(quotationId: string, data: Partial<QuotationFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const updateData: any = {};
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
    if (data.shippingCharges !== undefined) updateData.shippingCharges = data.shippingCharges;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.items) {
      const grossAmount = data.items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
        const discPct = parseFloat(item.discountPercentage || '0'); const lineTotal = qty * price;
        return sum + (lineTotal - (lineTotal * discPct / 100));
      }, 0);
      const globalDiscPct = parseFloat(data.discountPercentage || '0');
      const discountAmount = grossAmount * globalDiscPct / 100;
      const taxAmount = parseFloat(data.taxAmount || '0');
      const shipping = parseFloat(data.shippingCharges || '0');
      const netAmount = grossAmount - discountAmount + taxAmount + shipping;
      updateData.grossAmount = grossAmount.toFixed(2); updateData.discountAmount = discountAmount.toFixed(2);
      updateData.netAmount = netAmount.toFixed(2);
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
      for (const item of data.items) {
        const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
        const discPct = parseFloat(item.discountPercentage || '0');
        const lineTotal = (qty * price) - ((qty * price) * discPct / 100);
        await db.insert(quotationItems).values({
          orgId, quotationId, productId: item.productId || null, description: item.description,
          quantity: item.quantity, unitPrice: item.unitPrice, discountPercentage: item.discountPercentage || '0',
          taxRate: item.taxRate || '0', lineTotal: lineTotal.toFixed(2)
        });
      }
    }
    const [updated] = await db.update(quotations).set(updateData).where(and(eq(quotations.id, quotationId), eq(quotations.orgId, orgId))).returning();
    if (!updated) return { success: false, error: "Quotation not found" };
    revalidatePath('/sales/quotations');
    return { success: true, data: updated, message: "Quotation updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update quotation" };
  }
}

export async function deleteQuotation(quotationId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
    await db.delete(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.orgId, orgId)));
    revalidatePath('/sales/quotations');
    return { success: true, message: "Quotation deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete quotation" };
  }
}

export async function convertQuotationToOrder(quotationId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const [quotation] = await db.select().from(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.orgId, orgId))).limit(1);
    if (!quotation) return { success: false, error: "Quotation not found" };
    if (quotation.isConverted) return { success: false, error: "Quotation already converted" };
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
    async function generateSaleOrderNumber(orgId: string): Promise<string> {
      const result = await db.select({ orderNumber: saleOrders.orderNumber }).from(saleOrders).where(eq(saleOrders.orgId, orgId)).orderBy(desc(saleOrders.createdAt)).limit(1);
      let nextNumber = 1;
      if (result.length > 0 && result[0].orderNumber) { const match = result[0].orderNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
      return `SO-${String(nextNumber).padStart(5, '0')}`;
    }
    const orderNumber = await generateSaleOrderNumber(orgId);
    const [newOrder] = await db.insert(saleOrders).values({
      orgId, orderNumber, customerId: quotation.customerId, orderBooker: '',
      subject: quotation.subject || `From ${quotation.quotationNumber}`, reference: quotation.reference,
      orderDate: quotation.issueDate, deliveryDate: quotation.expiryDate, status: 'draft',
      grossAmount: quotation.grossAmount, discountPercentage: quotation.discountPercentage,
      discountAmount: quotation.discountAmount, taxAmount: quotation.taxAmount,
      shippingCharges: quotation.shippingCharges, netAmount: quotation.netAmount,
      notes: quotation.notes, terms: quotation.terms
    }).returning();
    for (const item of items) {
      await db.insert(orderItems).values({
        orgId, orderId: newOrder.id, productId: item.productId || null,
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage, taxRate: item.taxRate, lineTotal: item.lineTotal
      });
    }
    await db.update(quotations).set({ status: 'converted', isConverted: true }).where(eq(quotations.id, quotationId));
    revalidatePath('/sales/quotations'); revalidatePath('/sales/orders');
    return { success: true, data: newOrder, message: "Quotation converted to sale order" };
  } catch (error) {
    return { success: false, error: "Failed to convert quotation to order" };
  }
}

// ==================== DELIVERY NOTE ACTIONS ====================

async function generateDeliveryNumber(orgId: string): Promise<string> {
  const result = await db.select({ deliveryNumber: deliveryNotes.deliveryNumber }).from(deliveryNotes).where(eq(deliveryNotes.orgId, orgId)).orderBy(desc(deliveryNotes.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].deliveryNumber) { const match = result[0].deliveryNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
  return `DN-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextDeliveryNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const number = await generateDeliveryNumber(orgId);
    return { success: true, data: number };
  } catch (error) {
    return { success: false, error: "Failed to generate delivery number" };
  }
}

export async function getDeliveryNotes(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const conditions = [eq(deliveryNotes.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(deliveryNotes.status, statusFilter as any));
    let result = await db.select({
      id: deliveryNotes.id, deliveryNumber: deliveryNotes.deliveryNumber, deliveryDate: deliveryNotes.deliveryDate,
      status: deliveryNotes.status, shippedVia: deliveryNotes.shippedVia, trackingNumber: deliveryNotes.trackingNumber,
      customer: { id: customers.id, name: customers.name }
    }).from(deliveryNotes).leftJoin(customers, eq(deliveryNotes.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]).orderBy(desc(deliveryNotes.createdAt));
    if (searchQuery) {
      result = result.filter(d => d.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch delivery notes" };
  }
}

export async function createDeliveryNote(data: DeliveryNoteFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId) return { success: false, error: "Customer is required" };
    const deliveryNumber = await generateDeliveryNumber(orgId);
    const [newDelivery] = await db.insert(deliveryNotes).values({
      orgId, deliveryNumber, customerId: data.customerId,
      invoiceId: data.invoiceId || null, orderId: data.orderId || null,
      deliveryDate: new Date(data.deliveryDate), status: 'pending',
      shippedVia: data.shippedVia || null, trackingNumber: data.trackingNumber || null,
      deliveryAddress: data.deliveryAddress || null, notes: data.notes || null
    }).returning();
    for (const item of data.items) {
      await db.insert(deliveryNoteItems).values({
        orgId, deliveryNoteId: newDelivery.id, productId: item.productId || null,
        description: item.description, orderedQty: item.orderedQty, deliveredQty: item.deliveredQty
      });
    }
    if (data.invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, data.invoiceId)).limit(1);
      if (inv && inv.status === 'approved') {
        await db.update(invoices).set({ status: 'sent' }).where(eq(invoices.id, data.invoiceId));
      }
    }
    revalidatePath('/sales/delivery');
    return { success: true, data: newDelivery, message: "Delivery note created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create delivery note" };
  }
}

export async function updateDeliveryStatus(deliveryId: string, status: string, deliveredBy?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const updateData: any = { status };
    if (deliveredBy) updateData.deliveredBy = deliveredBy;
    const [updated] = await db.update(deliveryNotes).set(updateData).where(and(eq(deliveryNotes.id, deliveryId), eq(deliveryNotes.orgId, orgId))).returning();
    if (!updated) return { success: false, error: "Delivery note not found" };
    revalidatePath('/sales/delivery');
    return { success: true, data: updated, message: "Delivery status updated" };
  } catch (error) {
    return { success: false, error: "Failed to update delivery status" };
  }
}

// ==================== RECURRING INVOICE ACTIONS ====================

async function generateRecurringInvoiceNumber(orgId: string): Promise<string> {
  const result = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.orgId, orgId)).orderBy(desc(invoices.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].invoiceNumber) { const match = result[0].invoiceNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
  return `SL-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextRecurringInvoiceNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    return { success: true, data: await generateRecurringInvoiceNumber(orgId) };
  } catch (error) {
    return { success: false, error: "Failed to generate number" };
  }
}

export async function getRecurringInvoices(statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const conditions = [eq(recurringInvoices.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(recurringInvoices.status, statusFilter));
    const result = await db.select({
      id: recurringInvoices.id, templateName: recurringInvoices.templateName,
      interval: recurringInvoices.interval, startDate: recurringInvoices.startDate,
      endDate: recurringInvoices.endDate, nextInvoiceDate: recurringInvoices.nextInvoiceDate,
      status: recurringInvoices.status,
      customer: { id: customers.id, name: customers.name }
    }).from(recurringInvoices).leftJoin(customers, eq(recurringInvoices.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]).orderBy(desc(recurringInvoices.createdAt));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch recurring invoices" };
  }
}

export async function createRecurringInvoice(data: RecurringInvoiceFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId || !data.templateName) return { success: false, error: "Customer and template name are required" };
    const startDate = new Date(data.startDate);
    let nextInvoiceDate = new Date(startDate);
    const [newRecurring] = await db.insert(recurringInvoices).values({
      orgId, customerId: data.customerId, templateName: data.templateName,
      interval: data.interval, startDate, endDate: data.endDate ? new Date(data.endDate) : null,
      nextInvoiceDate, status: 'active', subject: data.subject || null,
      notes: data.notes || null, terms: data.terms || null,
      discountPercentage: data.discountPercentage || '0', taxAmount: data.taxAmount || '0',
      shippingCharges: data.shippingCharges || '0'
    }).returning();
    for (const item of data.items) {
      const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
      const taxRate = parseFloat(item.taxRate || '0');
      const lineTotal = qty * price + (qty * price * taxRate / 100);
      await db.insert(recurringInvoiceItems).values({
        orgId, recurringInvoiceId: newRecurring.id, productId: item.productId || null,
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        taxRate: item.taxRate || '0', lineTotal: lineTotal.toFixed(2)
      });
    }
    revalidatePath('/sales/recurring');
    return { success: true, data: newRecurring, message: "Recurring invoice created" };
  } catch (error) {
    return { success: false, error: "Failed to create recurring invoice" };
  }
}

export async function updateRecurringInvoice(id: string, data: Partial<RecurringInvoiceFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const updateData: any = {};
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.templateName !== undefined) updateData.templateName = data.templateName;
    if (data.interval !== undefined) updateData.interval = data.interval;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.shippingCharges !== undefined) updateData.shippingCharges = data.shippingCharges;
    if (data.status !== undefined) updateData.status = data.status;
    const [updated] = await db.update(recurringInvoices).set(updateData).where(and(eq(recurringInvoices.id, id), eq(recurringInvoices.orgId, orgId))).returning();
    if (!updated) return { success: false, error: "Recurring invoice not found" };
    if (data.items) {
      await db.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, id));
      for (const item of data.items) {
        const qty = parseFloat(item.quantity || '0'); const price = parseFloat(item.unitPrice || '0');
        const taxRate = parseFloat(item.taxRate || '0');
        const lineTotal = qty * price + (qty * price * taxRate / 100);
        await db.insert(recurringInvoiceItems).values({
          orgId, recurringInvoiceId: id, productId: item.productId || null,
          description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
          taxRate: item.taxRate || '0', lineTotal: lineTotal.toFixed(2)
        });
      }
    }
    revalidatePath('/sales/recurring');
    return { success: true, data: updated, message: "Recurring invoice updated" };
  } catch (error) {
    return { success: false, error: "Failed to update recurring invoice" };
  }
}

export async function deleteRecurringInvoice(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await db.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, id));
    await db.delete(recurringInvoices).where(and(eq(recurringInvoices.id, id), eq(recurringInvoices.orgId, orgId)));
    revalidatePath('/sales/recurring');
    return { success: true, message: "Recurring invoice deleted" };
  } catch (error) {
    return { success: false, error: "Failed to delete recurring invoice" };
  }
}

export async function generateRecurringInvoices() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueRecurring = await db.select().from(recurringInvoices).where(and(eq(recurringInvoices.orgId, orgId), eq(recurringInvoices.status, 'active')));
    let generated = 0;
    for (const recurring of dueRecurring) {
      if (!recurring.nextInvoiceDate || recurring.nextInvoiceDate > today) continue;
      if (recurring.endDate && recurring.endDate < today) {
        await db.update(recurringInvoices).set({ status: 'completed' }).where(eq(recurringInvoices.id, recurring.id));
        continue;
      }
      const items = await db.select().from(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, recurring.id));
      const invoiceNumber = await generateRecurringInvoiceNumber(orgId);
      const grossAmount = items.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
      const discountPct = parseFloat(recurring.discountPercentage || '0');
      const discountAmount = grossAmount * discountPct / 100;
      const taxAmount = parseFloat(recurring.taxAmount || '0');
      const shipping = parseFloat(recurring.shippingCharges || '0');
      const netAmount = grossAmount - discountAmount + taxAmount + shipping;
      const [newInvoice] = await db.insert(invoices).values({
        orgId, invoiceNumber, customerId: recurring.customerId,
        subject: recurring.subject || recurring.templateName, issueDate: today,
        status: 'draft', grossAmount: grossAmount.toFixed(2),
        discountPercentage: recurring.discountPercentage, discountAmount: discountAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2), shippingCharges: shipping.toFixed(2),
        netAmount: netAmount.toFixed(2), receivedAmount: '0', balanceAmount: netAmount.toFixed(2),
        notes: recurring.notes, terms: recurring.terms
      }).returning();
      for (const item of items) {
        await db.insert(invoiceItems).values({
          orgId, invoiceId: newInvoice.id, productId: item.productId || null,
          description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
          taxRate: item.taxRate, lineTotal: item.lineTotal
        });
      }
      let nextDate = new Date(recurring.nextInvoiceDate || today);
      switch (recurring.interval) {
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }
      await db.update(recurringInvoices).set({ nextInvoiceDate: nextDate, lastGeneratedInvoiceId: newInvoice.id }).where(eq(recurringInvoices.id, recurring.id));
      generated++;
    }
    revalidatePath('/sales/recurring'); revalidatePath('/sales/invoices');
    return { success: true, data: { generated }, message: `Generated ${generated} invoices` };
  } catch (error) {
    return { success: false, error: "Failed to generate recurring invoices" };
  }
}

// ==================== SALES RETURN ACTIONS ====================

async function generateSalesReturnNumber(orgId: string): Promise<string> {
  const result = await db.select({ returnNumber: salesReturns.returnNumber }).from(salesReturns).where(eq(salesReturns.orgId, orgId)).orderBy(desc(salesReturns.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].returnNumber) { const match = result[0].returnNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
  return `SR-${String(nextNumber).padStart(5, '0')}`;
}

export async function getNextSalesReturnNumber() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    return { success: true, data: await generateSalesReturnNumber(orgId) };
  } catch (error) {
    return { success: false, error: "Failed to generate return number" };
  }
}

export async function getSalesReturns(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const conditions = [eq(salesReturns.orgId, orgId)];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(salesReturns.status, statusFilter));
    let result = await db.select({
      id: salesReturns.id, returnNumber: salesReturns.returnNumber, returnDate: salesReturns.returnDate,
      reason: salesReturns.reason, netAmount: salesReturns.netAmount, refundAmount: salesReturns.refundAmount,
      status: salesReturns.status,
      customer: { id: customers.id, name: customers.name }
    }).from(salesReturns).leftJoin(customers, eq(salesReturns.customerId, customers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]).orderBy(desc(salesReturns.createdAt));
    if (searchQuery) {
      result = result.filter(r => r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) || r.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch sales returns" };
  }
}

export async function createSalesReturn(data: SalesReturnFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId) return { success: false, error: "Customer is required" };
    const returnNumber = await generateSalesReturnNumber(orgId);
    const grossAmount = data.items.reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0);
    const [newReturn] = await db.insert(salesReturns).values({
      orgId, returnNumber, customerId: data.customerId,
      invoiceId: data.invoiceId || null, returnDate: new Date(data.returnDate),
      reason: data.reason, reasonDetails: data.reasonDetails || null,
      grossAmount: grossAmount.toFixed(2), netAmount: grossAmount.toFixed(2),
      refundAmount: grossAmount.toFixed(2), status: 'pending', notes: data.notes || null
    }).returning();
    for (const item of data.items) {
      const lineTotal = parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0');
      await db.insert(salesReturnItems).values({
        orgId, salesReturnId: newReturn.id, productId: item.productId || null,
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        lineTotal: lineTotal.toFixed(2)
      });
    }
    revalidatePath('/sales/returns');
    return { success: true, data: newReturn, message: "Sales return created (pending approval)" };
  } catch (error) {
    return { success: false, error: "Failed to create sales return" };
  }
}

export async function approveSalesReturn(returnId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const [salesReturn] = await db.select().from(salesReturns).where(and(eq(salesReturns.id, returnId), eq(salesReturns.orgId, orgId))).limit(1);
    if (!salesReturn) return { success: false, error: "Sales return not found" };
    if (salesReturn.status === 'approved' || salesReturn.status === 'refunded') return { success: false, error: "Return already approved" };
    const items = await db.select().from(salesReturnItems).where(eq(salesReturnItems.salesReturnId, returnId));
    for (const item of items) {
      if (item.productId) {
        const [product] = await db.select({ currentStock: products.currentStock }).from(products).where(and(eq(products.id, item.productId), eq(products.orgId, orgId))).limit(1);
        if (product) {
          const newStock = (product.currentStock || 0) + parseFloat(item.quantity);
          await db.update(products).set({ currentStock: newStock }).where(eq(products.id, item.productId));
        }
      }
    }
    if (salesReturn.invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, salesReturn.invoiceId)).limit(1);
      if (inv) {
        const newBalance = parseFloat(inv.balanceAmount || '0') - parseFloat(salesReturn.refundAmount || '0');
        let newStatus: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = inv.status;
        if (newBalance <= 0) newStatus = 'paid'; else if (newBalance < parseFloat(inv.netAmount || '0')) newStatus = 'partial';
        await db.update(invoices).set({ balanceAmount: newBalance.toFixed(2), status: newStatus }).where(eq(invoices.id, salesReturn.invoiceId));
      }
    }
    const [accountsReceivable] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Accounts Receivable'))).limit(1);
    const [salesReturnsAccount] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), or(eq(chartOfAccounts.name, 'Sales Returns & Allowances'), eq(chartOfAccounts.name, 'Sales Revenue')))).limit(1);
    if (accountsReceivable && salesReturnsAccount) {
      const entryNumber = await (async () => {
        const result = await db.select({ entryNumber: journalEntries.entryNumber }).from(journalEntries).where(eq(journalEntries.orgId, orgId)).orderBy(desc(journalEntries.createdAt)).limit(1);
        let nextNumber = 1; if (result.length > 0 && result[0].entryNumber) { const match = result[0].entryNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
        return `JE-${String(nextNumber).padStart(5, '0')}`;
      })();
      const [journalEntry] = await db.insert(journalEntries).values({ orgId, entryNumber, entryDate: new Date(), referenceType: 'sales_return', referenceId: returnId, description: `Sales Return ${salesReturn.returnNumber} - Stock Reversal & Refund` }).returning();
      await db.insert(journalEntryLines).values({ orgId, journalEntryId: journalEntry.id, accountId: accountsReceivable.id, description: `Credit - Accounts Receivable (Return ${salesReturn.returnNumber})`, debitAmount: '0', creditAmount: salesReturn.refundAmount });
      await db.insert(journalEntryLines).values({ orgId, journalEntryId: journalEntry.id, accountId: salesReturnsAccount.id, description: `Debit - Sales Returns (Return ${salesReturn.returnNumber})`, debitAmount: salesReturn.refundAmount, creditAmount: '0' });
    }
    await db.update(salesReturns).set({ status: 'approved' }).where(eq(salesReturns.id, returnId));
    revalidatePath('/sales/returns'); revalidatePath('/inventory');
    return { success: true, message: "Sales return approved - stock reversed and refund recorded" };
  } catch (error) {
    return { success: false, error: "Failed to approve sales return" };
  }
}

// ==================== CUSTOMER PAYMENT ACTIONS ====================

async function generatePaymentNumber(orgId: string): Promise<string> {
  const result = await db.select({ paymentNumber: customerPayments.paymentNumber }).from(customerPayments).where(eq(customerPayments.orgId, orgId)).orderBy(desc(customerPayments.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].paymentNumber) { const match = result[0].paymentNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
  return `CP-${String(nextNumber).padStart(5, '0')}`;
}

export async function getCustomerPayments(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    let result = await db.select({
      id: customerPayments.id, paymentNumber: customerPayments.paymentNumber,
      paymentDate: customerPayments.paymentDate, paymentMethod: customerPayments.paymentMethod,
      amount: customerPayments.amount, reference: customerPayments.reference,
      customer: { id: customers.id, name: customers.name }
    }).from(customerPayments).leftJoin(customers, eq(customerPayments.customerId, customers.id))
      .where(eq(customerPayments.orgId, orgId)).orderBy(desc(customerPayments.createdAt));
    if (searchQuery) {
      result = result.filter(p => p.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) || p.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch payments" };
  }
}

export async function createCustomerPayment(data: CustomerPaymentFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId || !data.amount) return { success: false, error: "Customer and amount are required" };
    const paymentNumber = await generatePaymentNumber(orgId);
    const [newPayment] = await db.insert(customerPayments).values({
      orgId, paymentNumber, customerId: data.customerId,
      paymentDate: new Date(data.paymentDate), paymentMethod: data.paymentMethod,
      amount: data.amount, reference: data.reference || '', notes: data.notes || null
    }).returning();
    if (data.allocations && data.allocations.length > 0) {
      for (const alloc of data.allocations) {
        await db.insert(customerPaymentAllocations).values({
          orgId, customerPaymentId: newPayment.id, invoiceId: alloc.invoiceId,
          allocatedAmount: alloc.amount
        });
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, alloc.invoiceId)).limit(1);
        if (inv) {
          const newBalance = parseFloat(inv.balanceAmount || '0') - parseFloat(alloc.amount);
          let newStatus: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = inv.status;
          if (newBalance <= 0) newStatus = 'paid'; else newStatus = 'partial';
          await db.update(invoices).set({ balanceAmount: newBalance.toFixed(2), status: newStatus }).where(eq(invoices.id, alloc.invoiceId));
        }
      }
    }
    const [cashAccount] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), or(ilike(chartOfAccounts.name, '%cash%'), ilike(chartOfAccounts.name, '%bank%')))).limit(1);
    const [arAccount] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.name, 'Accounts Receivable'))).limit(1);
    if (cashAccount && arAccount) {
      const entryNumber = await (async () => {
        const result = await db.select({ entryNumber: journalEntries.entryNumber }).from(journalEntries).where(eq(journalEntries.orgId, orgId)).orderBy(desc(journalEntries.createdAt)).limit(1);
        let nextNumber = 1; if (result.length > 0 && result[0].entryNumber) { const match = result[0].entryNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
        return `JE-${String(nextNumber).padStart(5, '0')}`;
      })();
      const [journalEntry] = await db.insert(journalEntries).values({ orgId, entryNumber, entryDate: new Date(data.paymentDate), referenceType: 'customer_payment', referenceId: newPayment.id, description: `Customer Payment ${paymentNumber}` }).returning();
      await db.insert(journalEntryLines).values({ orgId, journalEntryId: journalEntry.id, accountId: cashAccount.id, description: `Debit - ${cashAccount.name}`, debitAmount: data.amount, creditAmount: '0' });
      await db.insert(journalEntryLines).values({ orgId, journalEntryId: journalEntry.id, accountId: arAccount.id, description: `Credit - Accounts Receivable`, debitAmount: '0', creditAmount: data.amount });
    }
    revalidatePath('/sales/receive-payment'); revalidatePath('/sales/invoices');
    return { success: true, data: newPayment, message: "Payment recorded successfully" };
  } catch (error) {
    return { success: false, error: "Failed to record payment" };
  }
}

export async function allocatePayment(paymentId: string, allocations: Array<{invoiceId: string, amount: string}>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const [payment] = await db.select().from(customerPayments).where(eq(customerPayments.id, paymentId)).limit(1);
    if (!payment) return { success: false, error: "Payment not found" };
    for (const alloc of allocations) {
      await db.insert(customerPaymentAllocations).values({ orgId, customerPaymentId: paymentId, invoiceId: alloc.invoiceId, allocatedAmount: alloc.amount });
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, alloc.invoiceId)).limit(1);
      if (inv) {
        const newBalance = parseFloat(inv.balanceAmount || '0') - parseFloat(alloc.amount);
        let newStatus: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' = inv.status;
        if (newBalance <= 0) newStatus = 'paid'; else newStatus = 'partial';
        await db.update(invoices).set({ balanceAmount: newBalance.toFixed(2), status: newStatus }).where(eq(invoices.id, alloc.invoiceId));
      }
    }
    revalidatePath('/sales/receive-payment'); revalidatePath('/sales/invoices');
    return { success: true, message: "Payment allocated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to allocate payment" };
  }
}

export async function getCustomerOutstandingInvoices(customerId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const result = await db.select({
      id: invoices.id, invoiceNumber: invoices.invoiceNumber, issueDate: invoices.issueDate,
      dueDate: invoices.dueDate, netAmount: invoices.netAmount, balanceAmount: invoices.balanceAmount,
      status: invoices.status
    }).from(invoices).where(and(eq(invoices.customerId, customerId), eq(invoices.orgId, orgId)));
    return { success: true, data: result.filter(inv => parseFloat(inv.balanceAmount || '0') > 0) };
  } catch (error) {
    return { success: false, error: "Failed to fetch outstanding invoices" };
  }
}

// ==================== SETTLEMENT ACTIONS ====================

async function generateSettlementNumber(orgId: string): Promise<string> {
  const result = await db.select({ settlementNumber: settlements.settlementNumber }).from(settlements).where(eq(settlements.orgId, orgId)).orderBy(desc(settlements.createdAt)).limit(1);
  let nextNumber = 1;
  if (result.length > 0 && result[0].settlementNumber) { const match = result[0].settlementNumber.match(/\d+$/); if (match) nextNumber = parseInt(match[0]) + 1; }
  return `STL-${String(nextNumber).padStart(5, '0')}`;
}

export async function getSettlements(entityType?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    const conditions = [eq(settlements.orgId, orgId)];
    if (entityType) conditions.push(eq(settlements.entityType, entityType));
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(settlements.status, statusFilter as any));
    const result = await db.select().from(settlements).where(conditions.length > 1 ? and(...conditions) : conditions[0]).orderBy(desc(settlements.createdAt));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch settlements" };
  }
}

export async function createCustomerSettlement(data: SettlementFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    if (!data.customerId || !data.documents.length) return { success: false, error: "Customer and documents are required" };
    const settlementNumber = await generateSettlementNumber(orgId);
    const totalOutstanding = data.documents.reduce((sum, doc) => sum + parseFloat(doc.balanceAmount || '0'), 0);
    const totalDiscount = data.documents.reduce((sum, doc) => sum + parseFloat(doc.discountAmount || '0'), 0);
    const totalSettlement = data.documents.reduce((sum, doc) => sum + parseFloat(doc.settlementAmount || '0'), 0);
    const [newSettlement] = await db.insert(settlements).values({
      orgId, settlementNumber, entityType: 'customer', entityId: data.customerId,
      settlementDate: new Date(data.settlementDate), totalOutstanding: totalOutstanding.toFixed(2),
      discountAmount: totalDiscount.toFixed(2), paidAmount: totalSettlement.toFixed(2),
      status: totalSettlement >= totalOutstanding - totalDiscount ? 'settled' : 'partial',
      paymentMethod: data.paymentMethod, reference: data.reference || '', notes: data.notes || null
    }).returning();
    for (const doc of data.documents) {
      await db.insert(settlementLines).values({
        orgId, settlementId: newSettlement.id, documentType: doc.documentType,
        documentId: doc.documentId, originalAmount: doc.originalAmount,
        paidAmount: doc.paidAmount, adjustedAmount: doc.settlementAmount,
        discountAmount: doc.discountAmount, balanceAmount: '0'
      });
      if (doc.documentType === 'invoice') {
        await db.update(invoices).set({
          balanceAmount: '0', status: 'paid'
        }).where(and(eq(invoices.id, doc.documentId), eq(invoices.orgId, orgId)));
      }
    }
    revalidatePath('/sales/settlement');
    return { success: true, data: newSettlement, message: "Settlement recorded successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create settlement" };
  }
}
