"use server";

import { db } from "@/db";
import { salesTaxReturns, invoices, purchaseInvoices, organizations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";
import { submitSalesTaxReturnToFBR } from "@/lib/fbr-api";

export type ReturnPeriod = "monthly" | "quarterly";

function getPeriodRange(year: number, period: number, returnType: ReturnPeriod) {
  if (returnType === "monthly") {
    const start = new Date(year, period - 1, 1);
    const end = new Date(year, period, 0, 23, 59, 59);
    const label = `${year}-${String(period).padStart(2, "0")}`;
    return { start, end, label };
  }
  const qStartMonth = (period - 1) * 3;
  const start = new Date(year, qStartMonth, 1);
  const end = new Date(year, qStartMonth + 3, 0, 23, 59, 59);
  const label = `${year}-Q${period}`;
  return { start, end, label };
}

export async function generateTaxReturn(
  year: number,
  period: number,
  returnType: ReturnPeriod
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { start, end, label } = getPeriodRange(year, period, returnType);

    const existing = await db
      .select({ id: salesTaxReturns.id })
      .from(salesTaxReturns)
      .where(and(
        eq(salesTaxReturns.orgId, orgId),
        eq(salesTaxReturns.periodLabel, label)
      ))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: `Tax return for ${label} already exists` };
    }

    const [outputResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${invoices.taxAmount}, 0))` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.issueDate} >= ${start}`,
        sql`${invoices.issueDate} <= ${end}`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const [salesResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${invoices.netAmount}, 0))` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        sql`${invoices.issueDate} >= ${start}`,
        sql`${invoices.issueDate} <= ${end}`,
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      ));

    const [inputResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${purchaseInvoices.taxTotal}, 0))` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.date} >= ${start}`,
        sql`${purchaseInvoices.date} <= ${end}`,
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const [purchaseResult] = await db
      .select({ total: sql<string>`SUM(COALESCE(${purchaseInvoices.netAmount}, 0))` })
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.orgId, orgId),
        sql`${purchaseInvoices.date} >= ${start}`,
        sql`${purchaseInvoices.date} <= ${end}`,
        sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
      ));

    const totalSales = parseFloat(salesResult?.total || "0");
    const totalOutputTax = parseFloat(outputResult?.total || "0");
    const totalPurchases = parseFloat(purchaseResult?.total || "0");
    const totalInputTax = parseFloat(inputResult?.total || "0");
    const netPayable = totalOutputTax - totalInputTax;

    const userId = (await auth()).userId;

    const fbrReturnPeriod = returnType === "monthly"
      ? `${year}${String(period).padStart(2, "0")}`
      : `${year}Q${period}`;

    const [taxReturn] = await db
      .insert(salesTaxReturns)
      .values({
        orgId,
        periodStart: start,
        periodEnd: end,
        periodLabel: label,
        returnType,
        totalSales: totalSales.toFixed(2),
        totalOutputTax: totalOutputTax.toFixed(2),
        totalPurchases: totalPurchases.toFixed(2),
        totalInputTax: totalInputTax.toFixed(2),
        netPayable: netPayable.toFixed(2),
        status: "calculated",
        calculatedAt: new Date(),
        createdBy: userId || "system",
        fbrReturnPeriod,
      })
      .returning();

    revalidatePath("/reports/tax-returns");
    return { success: true, data: taxReturn };
  } catch (error) {
    console.error("Error in tax-returns.ts:", error);
    return { success: false, error: "Failed to generate tax return" };
  }
}

export async function submitTaxReturn(returnId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [taxReturn] = await db
      .select()
      .from(salesTaxReturns)
      .where(and(
        eq(salesTaxReturns.id, returnId),
        eq(salesTaxReturns.orgId, orgId)
      ))
      .limit(1);

    if (!taxReturn) return { success: false, error: "Tax return not found" };
    if (taxReturn.status !== "calculated") {
      return { success: false, error: `Cannot submit return with status "${taxReturn.status}"` };
    }

    const [org] = await db
      .select({
        ntn: organizations.ntn,
        strn: organizations.strn,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org?.ntn || !org?.strn) {
      return { success: false, error: "Organization NTN and STRN are required for FBR submission" };
    }

    const result = await submitSalesTaxReturnToFBR({
      ntn: org.ntn,
      strn: org.strn,
      orgName: org.name,
      returnPeriod: taxReturn.fbrReturnPeriod || taxReturn.periodLabel,
      periodStart: taxReturn.periodStart.toISOString(),
      periodEnd: taxReturn.periodEnd.toISOString(),
      returnType: taxReturn.returnType as "monthly" | "quarterly",
      totalSales: parseFloat(taxReturn.totalSales),
      totalOutputTax: parseFloat(taxReturn.totalOutputTax),
      totalPurchases: parseFloat(taxReturn.totalPurchases),
      totalInputTax: parseFloat(taxReturn.totalInputTax),
      netPayable: parseFloat(taxReturn.netPayable),
    });

    await db
      .update(salesTaxReturns)
      .set({
        status: result.success ? "submitted" : "draft",
        submittedAt: result.success ? new Date() : null,
        fbrSubmissionId: result.submissionId || null,
        fbrResponse: result.rawResponse || result.error || null,
      })
      .where(eq(salesTaxReturns.id, returnId));

    revalidatePath("/reports/tax-returns");
    return result;
  } catch (error) {
    console.error("Error in tax-returns.ts:", error);
    return { success: false, error: "Failed to submit tax return to FBR" };
  }
}

export async function getTaxReturns() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found", data: [] };

    const returns = await db
      .select()
      .from(salesTaxReturns)
      .where(eq(salesTaxReturns.orgId, orgId))
      .orderBy(desc(salesTaxReturns.createdAt));

    return { success: true, data: returns };
  } catch (error) {
    console.error("Error in tax-returns.ts:", error);
    return { success: false, error: "Failed to fetch tax returns" };
  }
}

export async function deleteTaxReturn(returnId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(salesTaxReturns)
      .where(and(
        eq(salesTaxReturns.id, returnId),
        eq(salesTaxReturns.orgId, orgId)
      ));

    revalidatePath("/reports/tax-returns");
    return { success: true, message: "Tax return deleted" };
  } catch (error) {
    console.error("Error in tax-returns.ts:", error);
    return { success: false, error: "Failed to delete tax return" };
  }
}
