"use server";

import { db } from "@/db";
import {
  creditDebitNotes, creditDebitNoteLines, pdcInstruments,
  miscContactSettlements,
  journalEntries, journalEntryLines, bankAccounts,
  customers, vendors, products,
} from "@/db/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ==========================================
// CREDIT & DEBIT NOTES
// ==========================================

export interface CreditDebitNoteFormData {
  noteType: "credit_note" | "debit_note";
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  purchaseInvoiceId?: string;
  issueDate: string;
  reason?: string;
  notes?: string;
  lines: {
    productId?: string;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
  }[];
}

export async function getCreditDebitNotes(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(creditDebitNotes.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(creditDebitNotes.noteNumber, `%${searchQuery}%`),
          ilike(creditDebitNotes.reason, `%${searchQuery}%`),
        )!
      );
    }

    const notes = await db
      .select()
      .from(creditDebitNotes)
      .where(and(...conditions))
      .orderBy(desc(creditDebitNotes.issueDate));

    return { success: true, data: notes };
  } catch (error) {
    return { success: false, error: "Failed to fetch credit/debit notes" };
  }
}

export async function getCreditDebitNoteById(noteId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [note] = await db
      .select()
      .from(creditDebitNotes)
      .where(and(eq(creditDebitNotes.id, noteId), eq(creditDebitNotes.orgId, orgId)))
      .limit(1);

    if (!note) return { success: false, error: "Note not found" };

    const lines = await db
      .select()
      .from(creditDebitNoteLines)
      .where(eq(creditDebitNoteLines.creditDebitNoteId, noteId));

    return { success: true, data: { ...note, lines } };
  } catch (error) {
    return { success: false, error: "Failed to fetch note" };
  }
}

export async function addCreditDebitNote(data: CreditDebitNoteFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.customerId && !data.vendorId) {
      return { success: false, error: "Customer or Vendor is required" };
    }

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one line item is required" };
    }

    // Calculate totals
    let totalAmount = 0;
    let totalTax = 0;
    for (const line of data.lines) {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const taxRate = parseFloat(line.taxRate || "0");
      const lineTotal = qty * price;
      const lineTax = lineTotal * (taxRate / 100);
      totalAmount += lineTotal;
      totalTax += lineTax;
    }

    const netAmount = totalAmount + totalTax;

    // Generate note number
    const prefix = data.noteType === "credit_note" ? "CN" : "DN";
    const count = await db
      .select()
      .from(creditDebitNotes)
      .where(and(eq(creditDebitNotes.orgId, orgId), eq(creditDebitNotes.noteType, data.noteType)));

    const noteNumber = `${prefix}-${String(count.length + 1).padStart(5, "0")}`;

    const [note] = await db
      .insert(creditDebitNotes)
      .values({
        orgId,
        noteNumber,
        noteType: data.noteType,
        customerId: data.customerId || null,
        vendorId: data.vendorId || null,
        invoiceId: data.invoiceId || null,
        purchaseInvoiceId: data.purchaseInvoiceId || null,
        issueDate: new Date(data.issueDate),
        amount: totalAmount.toString(),
        taxAmount: totalTax.toString(),
        netAmount: netAmount.toString(),
        reason: data.reason,
        notes: data.notes,
        approvalStatus: "pending_approval",
      })
      .returning();

    // Insert line items
    for (const line of data.lines) {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const taxRate = parseFloat(line.taxRate || "0");
      const lineTotal = qty * price;

      await db.insert(creditDebitNoteLines).values({
        orgId,
        creditDebitNoteId: note.id,
        productId: line.productId || null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || "0",
        lineTotal: lineTotal.toString(),
      });
    }

    revalidatePath("/accounts/credit-debit-notes");
    return { success: true, data: note, message: `${data.noteType === "credit_note" ? "Credit" : "Debit"} note created` };
  } catch (error) {
    return { success: false, error: "Failed to create note" };
  }
}

export async function approveCreditDebitNote(noteId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    const [note] = await db
      .select()
      .from(creditDebitNotes)
      .where(and(eq(creditDebitNotes.id, noteId), eq(creditDebitNotes.orgId, orgId)))
      .limit(1);

    if (!note) return { success: false, error: "Note not found" };
    if (note.approvalStatus === "approved") return { success: false, error: "Already approved" };

    await db
      .update(creditDebitNotes)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(eq(creditDebitNotes.id, noteId));

    revalidatePath("/accounts/credit-debit-notes");
    return { success: true, message: "Note approved" };
  } catch (error) {
    return { success: false, error: "Failed to approve note" };
  }
}

// ==========================================
// PDC INSTRUMENTS
// ==========================================

export interface PdcInstrumentFormData {
  instrumentType: string;
  partyType: "customer" | "vendor";
  customerId?: string;
  vendorId?: string;
  bankAccountId?: string;
  amount: string;
  issueDate: string;
  chequeDate: string;
  bankName?: string;
  branchName?: string;
  reference?: string;
  notes?: string;
}

export async function getPdcInstruments(status?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(pdcInstruments.orgId, orgId)];
    if (status) {
      conditions.push(eq(pdcInstruments.status, status as any));
    }

    const instruments = await db
      .select()
      .from(pdcInstruments)
      .where(and(...conditions))
      .orderBy(desc(pdcInstruments.chequeDate));

    return { success: true, data: instruments };
  } catch (error) {
    return { success: false, error: "Failed to fetch PDC instruments" };
  }
}

export async function getPdcInstrumentsDashboard() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allInstruments = await db
      .select()
      .from(pdcInstruments)
      .where(eq(pdcInstruments.orgId, orgId))
      .orderBy(desc(pdcInstruments.chequeDate));

    const stats = {
      received: allInstruments.filter(i => i.status === "received").length,
      deposited: allInstruments.filter(i => i.status === "deposited").length,
      cleared: allInstruments.filter(i => i.status === "cleared").length,
      bounced: allInstruments.filter(i => i.status === "bounced").length,
      totalAmount: allInstruments.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0),
    };

    return { success: true, data: { instruments: allInstruments, stats } };
  } catch (error) {
    return { success: false, error: "Failed to fetch PDC dashboard" };
  }
}

export async function addPdcInstrument(data: PdcInstrumentFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.amount || !data.issueDate || !data.chequeDate) {
      return { success: false, error: "Amount, issue date, and cheque date are required" };
    }

    if (data.partyType === "customer" && !data.customerId) {
      return { success: false, error: "Customer is required for customer PDC" };
    }
    if (data.partyType === "vendor" && !data.vendorId) {
      return { success: false, error: "Vendor is required for vendor PDC" };
    }

    const count = await db.select().from(pdcInstruments).where(eq(pdcInstruments.orgId, orgId));
    const instrumentNumber = `PDC-${String(count.length + 1).padStart(5, "0")}`;

    const [instrument] = await db
      .insert(pdcInstruments)
      .values({
        orgId,
        instrumentNumber,
        instrumentType: data.instrumentType,
        partyType: data.partyType,
        customerId: data.customerId || null,
        vendorId: data.vendorId || null,
        bankAccountId: data.bankAccountId || null,
        amount: data.amount,
        issueDate: new Date(data.issueDate),
        chequeDate: new Date(data.chequeDate),
        bankName: data.bankName,
        branchName: data.branchName,
        status: "received",
        reference: data.reference,
        notes: data.notes,
      })
      .returning();

    revalidatePath("/accounts/instruments");
    return { success: true, data: instrument, message: "PDC instrument recorded" };
  } catch (error) {
    return { success: false, error: "Failed to record PDC instrument" };
  }
}

export async function updatePdcStatus(instrumentId: string, status: "received" | "deposited" | "cleared" | "bounced", bounceReason?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = { status };
    if (status === "deposited") updateData.depositedDate = new Date();
    if (status === "cleared") updateData.clearedDate = new Date();
    if (status === "bounced" && bounceReason) updateData.bounceReason = bounceReason;

    const [updated] = await db
      .update(pdcInstruments)
      .set(updateData)
      .where(and(eq(pdcInstruments.id, instrumentId), eq(pdcInstruments.orgId, orgId)))
      .returning();

    if (!updated) return { success: false, error: "Instrument not found" };

    revalidatePath("/accounts/instruments");
    return { success: true, message: `PDC status updated to ${status}` };
  } catch (error) {
    return { success: false, error: "Failed to update PDC status" };
  }
}

// ==========================================
// OTHER CONTACT SETTLEMENTS
// ==========================================

export interface MiscContactSettlementFormData {
  partyName: string;
  contactType: string;
  settlementDate: string;
  totalOutstanding: string;
  settledAmount: string;
  discountAmount?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  reference?: string;
  notes?: string;
}

export async function getMiscContactSettlements(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(miscContactSettlements.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(miscContactSettlements.settlementNumber, `%${searchQuery}%`),
          ilike(miscContactSettlements.partyName, `%${searchQuery}%`),
        )!
      );
    }

    const settlements = await db
      .select()
      .from(miscContactSettlements)
      .where(and(...conditions))
      .orderBy(desc(miscContactSettlements.settlementDate));

    return { success: true, data: settlements };
  } catch (error) {
    return { success: false, error: "Failed to fetch settlements" };
  }
}

export async function addMiscContactSettlement(data: MiscContactSettlementFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.partyName || !data.totalOutstanding || !data.settledAmount) {
      return { success: false, error: "Party name, outstanding amount, and settled amount are required" };
    }

    const count = await db.select().from(miscContactSettlements).where(eq(miscContactSettlements.orgId, orgId));
    const settlementNumber = `MCS-${String(count.length + 1).padStart(5, "0")}`;

    const [settlement] = await db
      .insert(miscContactSettlements)
      .values({
        orgId,
        settlementNumber,
        partyName: data.partyName,
        contactType: data.contactType as any,
        settlementDate: new Date(data.settlementDate),
        totalOutstanding: data.totalOutstanding,
        settledAmount: data.settledAmount,
        discountAmount: data.discountAmount || "0",
        paymentMethod: (data.paymentMethod as any) || null,
        bankAccountId: data.bankAccountId || null,
        reference: data.reference,
        notes: data.notes,
        approvalStatus: "pending_approval",
      })
      .returning();

    revalidatePath("/accounts/contact-settlement");
    return { success: true, data: settlement, message: "Settlement recorded" };
  } catch (error) {
    return { success: false, error: "Failed to record settlement" };
  }
}

export async function approveMiscContactSettlement(settlementId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    const [settlement] = await db
      .select()
      .from(miscContactSettlements)
      .where(and(eq(miscContactSettlements.id, settlementId), eq(miscContactSettlements.orgId, orgId)))
      .limit(1);

    if (!settlement) return { success: false, error: "Settlement not found" };
    if (settlement.approvalStatus === "approved") return { success: false, error: "Already approved" };

    // Update bank account balance if applicable
    if (settlement.bankAccountId) {
      const settledAmount = parseFloat(settlement.settledAmount || "0");
      const [bankAccount] = await db
        .select({ currentBalance: bankAccounts.currentBalance })
        .from(bankAccounts)
        .where(eq(bankAccounts.id, settlement.bankAccountId))
        .limit(1);

      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.currentBalance || "0");
        const newBalance = currentBalance - settledAmount;
        await db
          .update(bankAccounts)
          .set({ currentBalance: newBalance.toString() })
          .where(eq(bankAccounts.id, settlement.bankAccountId));
      }
    }

    await db
      .update(miscContactSettlements)
      .set({ approvalStatus: "approved", approvedBy: userId || "system", approvedAt: new Date() })
      .where(eq(miscContactSettlements.id, settlementId));

    revalidatePath("/accounts/contact-settlement");
    return { success: true, message: "Settlement approved" };
  } catch (error) {
    return { success: false, error: "Failed to approve settlement" };
  }
}

// ==========================================
// GET CUSTOMERS & VENDORS FOR DROPDOWNS
// ==========================================

export async function getCustomersForDropdown() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const custs = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isActive, true)))
      .orderBy(customers.name);

    return { success: true, data: custs };
  } catch (error) {
    return { success: false, error: "Failed to fetch customers" };
  }
}

export async function getVendorsForDropdown() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const vends = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(and(eq(vendors.orgId, orgId), eq(vendors.isActive, true)))
      .orderBy(vendors.name);

    return { success: true, data: vends };
  } catch (error) {
    return { success: false, error: "Failed to fetch vendors" };
  }
}

export async function getProductsForDropdown() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const prods = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    return { success: true, data: prods };
  } catch (error) {
    return { success: false, error: "Failed to fetch products" };
  }
}
