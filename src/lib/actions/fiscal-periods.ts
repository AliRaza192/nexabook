"use server";

import { db } from "@/db";
import { fiscalPeriods, journalEntries } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

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
    console.error("Error in fiscal-periods.ts:", error);
    return { success: false, error: "Failed to fetch fiscal periods" };
  }
}

export async function createFiscalPeriod(data: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [period] = await db
      .insert(fiscalPeriods)
      .values({
        orgId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      })
      .returning();

    return { success: true, data: period };
  } catch (error) {
    console.error("Error in fiscal-periods.ts:", error);
    return { success: false, error: "Failed to create fiscal period" };
  }
}

export async function togglePeriodLock(periodId: string, locked: boolean) {
  try {
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
    console.error("Error in fiscal-periods.ts:", error);
    return { success: false, error: "Failed to update period lock status" };
  }
}

export async function deleteFiscalPeriod(periodId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(fiscalPeriods)
      .where(and(eq(fiscalPeriods.id, periodId), eq(fiscalPeriods.orgId, orgId)));

    return { success: true };
  } catch (error) {
    console.error("Error in fiscal-periods.ts:", error);
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
    console.error("Error in fiscal-periods.ts:", error);
    return false;
  }
}
