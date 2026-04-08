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
  auditLogs 
} from "@/db/schema";
import { eq, and, or, ilike, desc, like } from "drizzle-orm";
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
  taxRate: string;
  amount: string;
}

export interface InvoiceFormData {
  customerId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  subTotal: string;
  taxTotal: string;
  discountTotal: string;
  grandTotal: string;
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
        subTotal: invoices.subTotal,
        taxTotal: invoices.taxTotal,
        discountTotal: invoices.discountTotal,
        grandTotal: invoices.grandTotal,
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
  const year = new Date().getFullYear();
  
  const result = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.orgId, orgId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].invoiceNumber) {
    const lastNumber = parseInt(result[0].invoiceNumber.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }

  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
}

// Create invoice with accounting integration
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

    // Create invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        orgId,
        invoiceNumber,
        customerId: data.customerId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        status: 'draft',
        subTotal: data.subTotal,
        taxTotal: data.taxTotal,
        discountTotal: data.discountTotal,
        grandTotal: data.grandTotal,
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
        taxRate: item.taxRate,
        amount: item.amount,
      });
    }

    // Update product stock if products were used
    for (const item of data.items) {
      if (item.productId) {
        const [product] = await db
          .select({ currentStock: products.currentStock })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product) {
          const newStock = Math.max(0, (product.currentStock || 0) - parseFloat(item.quantity));
          await db
            .update(products)
            .set({ currentStock: newStock })
            .where(eq(products.id, item.productId));
        }
      }
    }

    // TODO: Create Journal Entry for Accounting Integration
    // This would be implemented when journal entries table is added
    // Example:
    // Debit: Accounts Receivable (grandTotal)
    // Credit: Sales Revenue (subTotal)
    // Credit: Sales Tax Payable (taxTotal)

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

// Update invoice status
export async function updateInvoiceStatus(invoiceId: string, status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue') {
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
        grandTotal: invoices.grandTotal,
      })
      .from(invoices)
      .where(eq(invoices.orgId, orgId));

    const totalInvoices = allInvoices.length;
    const totalRevenue = allInvoices.reduce((sum, inv) => {
      return sum + (inv.grandTotal ? parseFloat(inv.grandTotal) : 0);
    }, 0);

    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = allInvoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length;
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

    // Note: Journal entries table would need to be created
    // This is a placeholder for the accounting integration logic
    
    // Example journal entry:
    // Debit: Accounts Receivable (grandTotal)
    // Credit: Sales Revenue (subTotal)
    // Credit: Sales Tax Payable (taxTotal)

    // For now, just log the entry
    console.log('Journal Entry for Invoice:', {
      invoiceId,
      debit: { account: 'Accounts Receivable', amount: invoice.grandTotal },
      credits: [
        { account: 'Sales Revenue', amount: invoice.subTotal },
        { account: 'Sales Tax Payable', amount: invoice.taxTotal },
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
        grandTotal: invoice.grandTotal,
        status: invoice.status,
      }),
    });

    return { success: true, message: "Journal entry created for invoice" };
  } catch (error) {
    console.error("createInvoiceJournalEntry error:", error);
    return { success: false, error: "Failed to create journal entry" };
  }
}
