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
  deliveryNotes,
  salesReturns,
  customerPayments,
  settlements,
} from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, sql, and, desc, ilike } from "drizzle-orm";

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
  return String(num).padStart(padding, "0");
}

const documentTables = {
  invoice: invoices,
  order: saleOrders,
  quotation: quotations,
  purchase: purchaseOrders,
  bill: purchaseInvoices,
  grn: goodReceivingNotes,
  delivery: deliveryNotes,
  recurring: invoices,
  sales_return: salesReturns,
  payment: customerPayments,
  settlement: settlements,
} as const;

const documentNumberColumns = {
  invoice: invoices.invoiceNumber,
  order: saleOrders.orderNumber,
  quotation: quotations.quotationNumber,
  purchase: purchaseOrders.orderNumber,
  bill: purchaseInvoices.billNumber,
  grn: goodReceivingNotes.grnNumber,
  delivery: deliveryNotes.deliveryNumber,
  recurring: invoices.invoiceNumber,
  sales_return: salesReturns.returnNumber,
  payment: customerPayments.paymentNumber,
  settlement: settlements.settlementNumber,
} as const;

const documentCreatedAtColumns = {
  invoice: invoices.createdAt,
  order: saleOrders.createdAt,
  quotation: quotations.createdAt,
  purchase: purchaseOrders.createdAt,
  bill: purchaseInvoices.createdAt,
  grn: goodReceivingNotes.createdAt,
  delivery: deliveryNotes.createdAt,
  recurring: invoices.createdAt,
  sales_return: salesReturns.createdAt,
  payment: customerPayments.createdAt,
  settlement: settlements.createdAt,
} as const;

/**
 * Centralized document number generator.
 *
 * FIX (2026 review): previously used COUNT(*) + 1, which breaks the moment
 * any document is deleted — e.g. INV-1, INV-2, INV-3 exist (count=3);
 * delete INV-2 (count=2); next number = count+1 = 3 → collides with the
 * still-existing INV-3. Now parses the highest existing number from the
 * most recently created document instead. Combined with the DB-level unique
 * constraints added in migration
 * 0005, a real collision now throws instead of silently succeeding, and
 * the retry loop below will regenerate on that error.
 */
export async function generateDocumentNumber(
  type:
    | "invoice"
    | "order"
    | "quotation"
    | "purchase"
    | "bill"
    | "grn"
    | "delivery"
    | "recurring"
    | "sales_return"
    | "payment"
    | "settlement",
  orgId: string,
): Promise<string | null> {
  const MAX_RETRIES = 10;

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
  const prefixMap: Record<typeof type, string> = {
    invoice: settings.invoicePrefix || "INV",
    order: settings.orderPrefix || "SO",
    quotation: settings.quotationPrefix || "QT",
    purchase: settings.purchasePrefix || "PO",
    bill: settings.billPrefix || "PI",
    grn: settings.grnPrefix || "GRN",
    delivery: "DN",
    recurring: "SL",
    sales_return: "SR",
    payment: "CP",
    settlement: "STL",
  };
  const prefix = prefixMap[type];
  const table = documentTables[type];
  const numberColumn = documentNumberColumns[type];
  const createdAtColumn = documentCreatedAtColumns[type];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const [latest] = await db
        .select({ number: numberColumn })
        .from(table)
        .where(eq(table.orgId, orgId))
        .orderBy(desc(createdAtColumn))
        .limit(1);

      let nextNumber = 1;
      if (latest?.number) {
        const match = String(latest.number).match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }

      // On retry, offset by attempt to reduce repeat-collision probability
      const jitter =
        attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      const paddedNumber = padNumber(
        nextNumber + jitter,
        settings.numberingPadding || 5,
      );

      let documentNumber = prefix;
      if (settings.numberingIncludeYear) {
        documentNumber += `-${new Date().getFullYear()}`;
      }
      documentNumber += `-${paddedNumber}`;

      return documentNumber;
    } catch (error) {
      console.error(
        `Error generating document number (attempt ${attempt + 1}):`,
        error,
      );
      if (attempt === MAX_RETRIES - 1) return null;
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
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
    throw new Error(
      `Forbidden: This action requires one of these roles: ${allowedRoles.join(", ")}`,
    );
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

/**
 * FIX (2026 review): was COUNT(*)-based, same delete-causes-duplicate flaw
 * as generateDocumentNumber. Now parses the last journal entry's number.
 */
export async function generateJournalEntryNumber(
  orgId: string,
  prefix: string = "JE",
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [latest] = await db
        .select({ entryNumber: journalEntries.entryNumber })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.orgId, orgId),
            ilike(journalEntries.entryNumber, `${prefix}-%`),
          ),
        )
        .orderBy(desc(journalEntries.createdAt))
        .limit(1);

      let nextNum = 1;
      if (latest?.entryNumber) {
        const match = latest.entryNumber.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }

      const jitter =
        attempt > 0 ? Math.floor(Math.random() * (attempt + 1)) : 0;
      return `${prefix}-${String(nextNum + jitter).padStart(5, "0")}`;
    } catch {
      if (attempt < 4)
        await new Promise((r) =>
          setTimeout(r, Math.random() * 100 * (attempt + 1)),
        );
    }
  }
  return `${prefix}-${String(Date.now() % 100000).padStart(5, "0")}`;
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

    return {
      success: true,
      data: { name: org.name, plan: org.planType || "Professional" },
    };
  } catch (error) {
    console.error("Error fetching org profile:", error);
    return { success: false, error: "Failed to fetch organization info" };
  }
}
