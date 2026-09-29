"use server";

import { db } from "@/db";
import { fiscalPeriods, journalEntries } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getCurrentOrgId, requireRole } from "./shared";
import { captureException } from "@/lib/error-handler";

export async function getFiscalPeriods() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const periods = await db
      .select()
      .from(fiscalPeriods)
      .where(and(
        eq(fiscalPeriods.orgId, orgId),
        eq(fiscalPeriods.isActive, true),
      ))
      .orderBy(desc(fiscalPeriods.startDate));

    return { success: true, data: periods };
  } catch (error) {
    captureException(error, { module: "fiscal-periods", function: "getFiscalPeriods" });
    return { success: false, error: "Failed to fetch fiscal periods" };
  }
}

export async function createFiscalPeriod(data: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      return { success: false, error: "Start date must be before end date" };
    }

    const [period] = await db
      .insert(fiscalPeriods)
      .values({
        orgId,
        name: data.name,
        startDate: start,
        endDate: end,
      })
      .returning();

    return { success: true, data: period };
  } catch (error) {
    captureException(error, { module: "fiscal-periods", function: "createFiscalPeriod" });
    return { success: false, error: "Failed to create fiscal period" };
  }
}

export async function togglePeriodLock(periodId: string, locked: boolean) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [period] = await db
      .update(fiscalPeriods)
      .set({ isLocked: locked, updatedAt: new Date() })
      .where(and(eq(fiscalPeriods.id, periodId), eq(fiscalPeriods.orgId, orgId)))
      .returning();

    if (!period) return { success: false, error: "Period not found" };
    return { success: true, data: period };
  } catch (error) {
    captureException(error, { module: "fiscal-periods", function: "togglePeriodLock" });
    return { success: false, error: "Failed to update period lock status" };
  }
}

// FIX (2026 review): deleting a locked period previously removed it from the
// table entirely, which means checkPeriodLocked() would no longer find any
// row covering that date range — silently unlocking every transaction date
// that period used to protect. Locked periods must be unlocked (via
// togglePeriodLock) before they can be deleted.
export async function deleteFiscalPeriod(periodId: string) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [period] = await db
      .select({ isLocked: fiscalPeriods.isLocked })
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.id, periodId), eq(fiscalPeriods.orgId, orgId)))
      .limit(1);

    if (!period) return { success: false, error: "Period not found" };
    if (period.isLocked) {
      return { success: false, error: "Cannot delete a locked period — unlock it first" };
    }

    await db
      .delete(fiscalPeriods)
      .where(and(eq(fiscalPeriods.id, periodId), eq(fiscalPeriods.orgId, orgId)));

    return { success: true };
  } catch (error) {
    captureException(error, { module: "fiscal-periods", function: "deleteFiscalPeriod" });
    return { success: false, error: "Failed to delete fiscal period" };
  }
}

export async function checkPeriodLocked(entryDate: Date): Promise<boolean> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return false;

    const [period] = await db
      .select({ id: fiscalPeriods.id })
      .from(fiscalPeriods)
      .where(and(
        eq(fiscalPeriods.orgId, orgId),
        eq(fiscalPeriods.isLocked, true),
        eq(fiscalPeriods.isActive, true),
        lte(fiscalPeriods.startDate, entryDate),
        gte(fiscalPeriods.endDate, entryDate),
      ))
      .limit(1);

    return !!period;
  } catch (error) {
    captureException(error, { module: "fiscal-periods", function: "checkPeriodLocked" });
    return false;
  }
}