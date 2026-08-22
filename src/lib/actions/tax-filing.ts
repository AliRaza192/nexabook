"use server";

import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  purchaseInvoices,
  purchaseItems,
  organizations,
  salesTaxReturns,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { submitInvoiceToFBR, type FBRSubmissionPayload } from "@/lib/fbr-api";
import { revalidatePath } from "next/cache";

// ==================== FBR SUBMISSION STATS ====================

export interface FBRSubmissionStats {
  total: number;
  submitted: number;
  pending: number;
  failed: number;
  thisMonth: number;
}

export async function getFBRSubmissionStats(): Promise<{
  success: boolean;
  data?: FBRSubmissionStats;
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await db
      .select({
        status: invoices.fbrStatus,
        count: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      )
      .groupBy(invoices.fbrStatus);

    let submitted = 0;
    let pending = 0;
    let failed = 0;

    for (const row of stats) {
      if (row.status === "submitted") submitted = row.count;
      else if (row.status === "failed") failed = row.count;
      else pending += row.count; // null status = pending
    }

    const thisMonthResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          gte(invoices.createdAt, monthStart),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      );

    return {
      success: true,
      data: {
        total: submitted + pending + failed,
        submitted,
        pending,
        failed,
        thisMonth: thisMonthResult[0]?.count || 0,
      },
    };
  } catch (error) {
    console.error("[getFBRSubmissionStats]", error);
    return { success: false, error: "Failed to get submission stats" };
  }
}

// ==================== BATCH FBR SUBMISSION ====================

export interface BatchSubmissionResult {
  invoiceId: string;
  invoiceNumber: string;
  success: boolean;
  submissionId?: string;
  error?: string;
}

export async function batchSubmitToFBR(
  invoiceIds: string[]
): Promise<{
  success: boolean;
  data?: {
    submitted: number;
    failed: number;
    results: BatchSubmissionResult[];
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Fetch org NTN/STRN
    const org = await db
      .select({ ntn: organizations.ntn, strn: organizations.strn })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org[0]?.ntn || !org[0]?.strn) {
      return {
        success: false,
        error: "Organization NTN and STRN are required for FBR submission",
      };
    }

    // Fetch invoices with items
    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        netAmount: invoices.netAmount,
        taxAmount: invoices.taxAmount,
        customerName: sql<string>`(SELECT name FROM customers WHERE id = ${invoices.customerId})`,
        customerNtn: sql<string>`(SELECT ntn FROM customers WHERE id = ${invoices.customerId})`,
        customerStrn: sql<string>`(SELECT strn FROM customers WHERE id = ${invoices.customerId})`,
        customerAddress: sql<string>`(SELECT address FROM customers WHERE id = ${invoices.customerId})`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          inArray(invoices.id, invoiceIds)
        )
      );

    const results: BatchSubmissionResult[] = [];
    let submitted = 0;
    let failed = 0;

    // Process in batches of 5 (FBR rate limit)
    const BATCH_SIZE = 5;
    for (let i = 0; i < invoiceList.length; i += BATCH_SIZE) {
      const batch = invoiceList.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (inv) => {
          // Fetch line items
          const items = await db
            .select({
              description: invoiceItems.description,
              quantity: invoiceItems.quantity,
              unitPrice: invoiceItems.unitPrice,
              taxRate: invoiceItems.taxRate,
              taxType: invoiceItems.taxType,
              lineTotal: invoiceItems.lineTotal,
            })
            .from(invoiceItems)
            .where(eq(invoiceItems.invoiceId, inv.id));

          const payload: FBRSubmissionPayload = {
            ntn: org[0].ntn!,
            strn: org[0].strn!,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate:
              inv.issueDate instanceof Date
                ? inv.issueDate.toISOString().split("T")[0]
                : String(inv.issueDate),
            customerName: inv.customerName || "Unknown",
            customerNtn: inv.customerNtn || undefined,
            customerStrn: inv.customerStrn || undefined,
            customerAddress: inv.customerAddress || undefined,
            totalAmount: parseFloat(inv.netAmount),
            taxAmount: parseFloat(inv.taxAmount),
            netAmount: parseFloat(inv.netAmount),
            items: items.map((item) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              taxRate: parseFloat(item.taxRate),
              taxType: item.taxType,
              lineTotal: parseFloat(item.lineTotal),
            })),
          };

          const response = await submitInvoiceToFBR(payload);

          // Update invoice FBR status
          await db
            .update(invoices)
            .set({
              fbrSubmissionId: response.submissionId || null,
              fbrInvoiceNumber: response.fbrInvoiceNumber || null,
              fbrStatus: response.success ? "submitted" : "failed",
              fbrResponse: response.error || response.rawResponse || null,
              fbrSubmittedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));

          return {
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            success: response.success,
            submissionId: response.submissionId,
            error: response.error,
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
          if (result.value.success) submitted++;
          else failed++;
        } else {
          failed++;
          results.push({
            invoiceId: "unknown",
            invoiceNumber: "unknown",
            success: false,
            error: result.reason?.message || "Unknown error",
          });
        }
      }
    }

    revalidatePath("/reports/tax-returns");

    return {
      success: true,
      data: { submitted, failed, results },
    };
  } catch (error) {
    console.error("[batchSubmitToFBR]", error);
    return { success: false, error: "Batch submission failed" };
  }
}

// ==================== RETRY FAILED SUBMISSIONS ====================

export async function retryFailedSubmissions(): Promise<{
  success: boolean;
  data?: { retried: number; submitted: number; failed: number };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get all failed invoices
    const failedInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.fbrStatus, "failed"),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      );

    if (failedInvoices.length === 0) {
      return {
        success: true,
        data: { retried: 0, submitted: 0, failed: 0 },
      };
    }

    const result = await batchSubmitToFBR(
      failedInvoices.map((inv) => inv.id)
    );

    return {
      success: true,
      data: {
        retried: failedInvoices.length,
        submitted: result.data?.submitted || 0,
        failed: result.data?.failed || 0,
      },
    };
  } catch (error) {
    console.error("[retryFailedSubmissions]", error);
    return { success: false, error: "Retry failed" };
  }
}

// ==================== FILING DEADLINES ====================

export interface FilingDeadline {
  taxAuthority: string;
  returnType: string;
  deadline: string;
  daysUntil: number;
  pendingInvoices: number;
  status: "upcoming" | "overdue" | "filed";
}

export async function getFilingDeadlines(): Promise<{
  success: boolean;
  data?: FilingDeadline[];
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // GST return due: 18th of next month
    const gstDeadline = new Date(currentYear, currentMonth + 1, 18);
    const gstDaysUntil = Math.ceil(
      (gstDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count pending invoices for current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const pendingInvoices = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          gte(invoices.createdAt, monthStart),
          lte(invoices.createdAt, monthEnd),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"]),
          sql`${invoices.fbrStatus} IS NULL`
        )
      );

    // Check if GST return already filed for last month
    const lastMonth = currentMonth === 0 ? 12 : currentMonth;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthLabel = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}`;

    const gstReturnFiled = await db
      .select({ id: salesTaxReturns.id })
      .from(salesTaxReturns)
      .where(
        and(
          eq(salesTaxReturns.orgId, orgId),
          eq(salesTaxReturns.periodLabel, lastMonthLabel)
        )
      )
      .limit(1);

    const deadlines: FilingDeadline[] = [
      {
        taxAuthority: "FBR",
        returnType: "GST Return",
        deadline: gstDeadline.toISOString().split("T")[0],
        daysUntil: gstDaysUntil,
        pendingInvoices: pendingInvoices[0]?.count || 0,
        status:
          gstReturnFiled.length > 0
            ? "filed"
            : gstDaysUntil < 0
            ? "overdue"
            : "upcoming",
      },
    ];

    // Provincial returns due: 15th of next month
    const provincialDeadline = new Date(currentYear, currentMonth + 1, 15);
    const provincialDaysUntil = Math.ceil(
      (provincialDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count invoices with provincial tax types
    const provincialInvoices = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.orgId, orgId),
          gte(invoices.createdAt, monthStart),
          lte(invoices.createdAt, monthEnd),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"]),
          inArray(invoiceItems.taxType, ["SRB", "PRA", "KPRA", "BRA"])
        )
      );

    if ((provincialInvoices[0]?.count || 0) > 0) {
      deadlines.push({
        taxAuthority: "Provincial",
        returnType: "Provincial Sales Tax",
        deadline: provincialDeadline.toISOString().split("T")[0],
        daysUntil: provincialDaysUntil,
        pendingInvoices: provincialInvoices[0]?.count || 0,
        status: provincialDaysUntil < 0 ? "overdue" : "upcoming",
      });
    }

    return { success: true, data: deadlines };
  } catch (error) {
    console.error("[getFilingDeadlines]", error);
    return { success: false, error: "Failed to get filing deadlines" };
  }
}

// ==================== PROVINCIAL TAX RETURNS ====================

export type TaxAuthority = "SRB" | "PRA" | "KPRA" | "BRA";

export interface ProvincialReturnData {
  taxAuthority: TaxAuthority;
  periodLabel: string;
  totalSales: number;
  totalTax: number;
  netPayable: number;
  invoiceCount: number;
}

export async function generateProvincialReturn(
  taxAuthority: TaxAuthority,
  year: number,
  month: number
): Promise<{
  success: boolean;
  data?: ProvincialReturnData;
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

    // Get invoices with this provincial tax type
    const result = await db
      .select({
        totalSales: sql<string>`SUM(CAST(${invoiceItems.lineTotal} AS DECIMAL(14,2)))`,
        totalTax: sql<string>`SUM(CAST(${invoiceItems.lineTotal} AS DECIMAL(14,2)) * CAST(${invoiceItems.taxRate} AS DECIMAL(5,2)) / 100)`,
        invoiceCount: sql<number>`count(distinct ${invoices.id})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoiceItems.taxType, taxAuthority),
          gte(invoices.createdAt, start),
          lte(invoices.createdAt, end),
          inArray(invoices.status, ["approved", "sent", "paid", "partial"])
        )
      );

    const totalSales = parseFloat(result[0]?.totalSales || "0");
    const totalTax = parseFloat(result[0]?.totalTax || "0");

    return {
      success: true,
      data: {
        taxAuthority,
        periodLabel,
        totalSales,
        totalTax,
        netPayable: totalTax,
        invoiceCount: result[0]?.invoiceCount || 0,
      },
    };
  } catch (error) {
    console.error("[generateProvincialReturn]", error);
    return { success: false, error: "Failed to generate provincial return" };
  }
}

// ==================== FBR SUBMISSION LIST ====================

export async function getFBRSubmissions(
  status?: "submitted" | "failed" | "pending"
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    netAmount: string;
    fbrStatus: string | null;
    fbrSubmissionId: string | null;
    fbrSubmittedAt: Date | null;
  }>;
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    let whereClause = and(
      eq(invoices.orgId, orgId),
      inArray(invoices.status, ["approved", "sent", "paid", "partial"])
    );

    if (status === "submitted") {
      whereClause = and(whereClause, eq(invoices.fbrStatus, "submitted"));
    } else if (status === "failed") {
      whereClause = and(whereClause, eq(invoices.fbrStatus, "failed"));
    } else if (status === "pending") {
      whereClause = and(whereClause, sql`${invoices.fbrStatus} IS NULL`);
    }

    const results = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        netAmount: invoices.netAmount,
        fbrStatus: invoices.fbrStatus,
        fbrSubmissionId: invoices.fbrSubmissionId,
        fbrSubmittedAt: invoices.fbrSubmittedAt,
        customerName: sql<string>`(SELECT name FROM customers WHERE id = ${invoices.customerId})`,
      })
      .from(invoices)
      .where(whereClause)
      .orderBy(desc(invoices.fbrSubmittedAt));

    return { success: true, data: results };
  } catch (error) {
    console.error("[getFBRSubmissions]", error);
    return { success: false, error: "Failed to get submissions" };
  }
}
