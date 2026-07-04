"use server";

import { db } from "@/db";
import { 
  organizations, 
  profiles, 
  chartOfAccounts, 
  invoices, 
  saleOrders, 
  quotations, 
  purchaseOrders, 
  purchaseInvoices, 
  goodReceivingNotes,
  journalEntries,
} from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

// NOTE: Default COA seeding is handled by seedInitialCOA() in accounts.ts
// That version is comprehensive (~70 accounts) and should be the single source of truth.
// Do NOT add another seed function here.

// Get the current user's organization ID
export async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const userProfile = await db
      .select({ orgId: profiles.orgId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return userProfile.length > 0 ? userProfile[0].orgId : null;
  } catch (error) {
    console.error("[getCurrentOrgId]", error);
    return null;
  }
}

// Helper to pad numbers with leading zeros
function padNumber(num: number, padding: number): string {
  return String(num).padStart(padding, '0');
}

// Centralized function to generate document numbers
export async function generateDocumentNumber(
  type: 'invoice' | 'order' | 'quotation' | 'purchase' | 'bill' | 'grn', 
  orgId: string
): Promise<string | null> {
  const MAX_RETRIES = 10;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const orgSettings = await db
        .select({
          invoicePrefix: organizations.invoicePrefix,
          orderPrefix: organizations.orderPrefix,
          quotationPrefix: organizations.quotationPrefix,
          purchasePrefix: organizations.purchasePrefix,
          billPrefix: organizations.billPrefix,
          grnPrefix: organizations.grnPrefix,
          numberingPadding: organizations.numberingPadding,
          numberingIncludeYear: organizations.numberingIncludeYear,
        })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!orgSettings || orgSettings.length === 0) {
        console.error(`Organization settings not found for orgId: ${orgId}`);
        return null;
      }

      const settings = orgSettings[0];
      let prefix = '';
      let count = 0;

      switch (type) {
        case 'invoice':
          prefix = settings.invoicePrefix || 'INV';
          const [invoiceCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(eq(invoices.orgId, orgId));
          count = Number(invoiceCount.count);
          break;
        case 'order':
          prefix = settings.orderPrefix || 'SO';
          const [orderCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(saleOrders)
            .where(eq(saleOrders.orgId, orgId));
          count = Number(orderCount.count);
          break;
        case 'quotation':
          prefix = settings.quotationPrefix || 'QT';
          const [quotationCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(quotations)
            .where(eq(quotations.orgId, orgId));
          count = Number(quotationCount.count);
          break;
        case 'purchase':
          prefix = settings.purchasePrefix || 'PO';
          const [purchaseCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(purchaseOrders)
            .where(eq(purchaseOrders.orgId, orgId));
          count = Number(purchaseCount.count);
          break;
        case 'bill':
          prefix = settings.billPrefix || 'PI';
          const [billCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.orgId, orgId));
          count = Number(billCount.count);
          break;
        case 'grn':
          prefix = settings.grnPrefix || 'GRN';
          const [grnCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(goodReceivingNotes)
            .where(eq(goodReceivingNotes.orgId, orgId));
          count = Number(grnCount.count);
          break;
        default:
          console.error(`Unknown document type: ${type}`);
          return null;
      }

      // On retry, offset by attempt number to avoid same collision
      const nextNumber = count + 1 + attempt;
      const currentYear = new Date().getFullYear();
      const paddedNumber = padNumber(nextNumber, settings.numberingPadding || 5);

      let documentNumber = prefix;
      if (settings.numberingIncludeYear) {
        documentNumber += `-${currentYear}`;
      }
      documentNumber += `-${paddedNumber}`;

      return documentNumber;
    } catch (error) {
      console.error(`Error generating document number (attempt ${attempt + 1}):`, error);
      if (attempt === MAX_RETRIES - 1) return null;
      await new Promise(r => setTimeout(r, 50 * (attempt + 1)));
    }
  }
  return null;
}


// ==========================================
// ROLE-BASED ACCESS CONTROL
// ==========================================

type UserRole = "admin" | "manager" | "accountant" | "staff";

/**
 * Check if current user has required role.
 * Usage: await requireRole(["admin", "accountant"])
 * Throws error if user doesn't have permission.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: Not logged in");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Unauthorized: No organization found");

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
    .limit(1);

  if (!profile) throw new Error("Unauthorized: Profile not found");
  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error(`Forbidden: This action requires one of these roles: ${allowedRoles.join(", ")}`);
  }
}

/**
 * Get current user's role (returns null if not found)
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const orgId = await getCurrentOrgId();
    if (!orgId) return null;

    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
      .limit(1);

    return (profile?.role as UserRole) || null;
  } catch {
    return null;
  }
}

export async function generateJournalEntryNumber(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(journalEntries)
        .where(eq(journalEntries.orgId, orgId));
      const jitter = attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      const nextNum = (result[0]?.count || 0) + 1 + jitter;
      return `JE-${String(nextNum).padStart(5, "0")}`;
    } catch {
      if (attempt < 4) await new Promise(r => setTimeout(r, Math.random() * 100 * (attempt + 1)));
    }
  }
  return `JE-${String(Date.now() % 100000).padStart(5, "0")}`;
}

export async function getOrgProfile() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ name: organizations.name, planType: organizations.planType })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) return { success: false, error: "Organization not found" };

    return { success: true, data: { name: org.name, plan: org.planType || "Professional" } };
  } catch (error) {
    console.error("Error fetching org profile:", error);
    return { success: false, error: "Failed to fetch organization info" };
  }
}