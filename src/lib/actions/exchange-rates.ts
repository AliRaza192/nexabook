"use server";

import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

export interface ExchangeRateFormData {
  fromCurrency: string;
  rate: string;
  effectiveDate?: string;
}

export async function getExchangeRates() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const rates = await db
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.orgId, orgId), eq(exchangeRates.isActive, true)))
      .orderBy(desc(exchangeRates.effectiveDate));

    return { success: true, data: rates };
  } catch (error) {
    console.error("Error in exchange-rates.ts:", error);
    return { success: false, error: "Failed to fetch exchange rates" };
  }
}

export async function getExchangeRate(fromCurrency: string, date?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return null;

    const conditions = [
      eq(exchangeRates.orgId, orgId),
      eq(exchangeRates.fromCurrency, fromCurrency),
      eq(exchangeRates.isActive, true),
    ];

    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(and(...conditions))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);

    return rate || null;
  } catch {
    return null;
  }
}

export async function createExchangeRate(data: ExchangeRateFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [rate] = await db
      .insert(exchangeRates)
      .values({
        orgId,
        fromCurrency: data.fromCurrency.toUpperCase(),
        toCurrency: "PKR",
        rate: data.rate,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      })
      .returning();

    return { success: true, data: rate, message: "Exchange rate added" };
  } catch (error) {
    console.error("Error in exchange-rates.ts:", error);
    return { success: false, error: "Failed to create exchange rate" };
  }
}

export async function deleteExchangeRate(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(exchangeRates)
      .set({ isActive: false })
      .where(and(eq(exchangeRates.id, id), eq(exchangeRates.orgId, orgId)));

    return { success: true, message: "Exchange rate removed" };
  } catch (error) {
    console.error("Error in exchange-rates.ts:", error);
    return { success: false, error: "Failed to delete exchange rate" };
  }
}
