"use server";

import { db } from "@/db";
import {
  fixedAssets,
  depreciationLogs,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  auditLogs,
} from "@/db/schema";
import { eq, and, desc, ilike, or, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ==========================================
// FIXED ASSETS
// ==========================================

export interface FixedAssetFormData {
  name: string;
  category: string;
  purchaseDate: string;
  purchaseCost: string;
  usefulLifeYears: string;
  salvageValue?: string;
  depreciationMethod?: string;
  notes?: string;
}

/**
 * Get all fixed assets for the current organization
 */
export async function getFixedAssets(searchQuery?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(fixedAssets.orgId, orgId)];
    if (searchQuery) {
      conditions.push(
        or(
          ilike(fixedAssets.name, `%${searchQuery}%`),
          ilike(fixedAssets.category, `%${searchQuery}%`),
        )!
      );
    }

    const assets = await db
      .select()
      .from(fixedAssets)
      .where(and(...conditions))
      .orderBy(desc(fixedAssets.purchaseDate));

    return { success: true, data: assets };
  } catch (error) {
    console.error("Failed to fetch fixed assets:", error);
    return { success: false, error: "Failed to fetch fixed assets" };
  }
}

/**
 * Get a single fixed asset by ID
 */
export async function getFixedAsset(assetId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.orgId, orgId)))
      .limit(1);

    if (!asset) return { success: false, error: "Asset not found" };

    return { success: true, data: asset };
  } catch (error) {
    return { success: false, error: "Failed to fetch asset" };
  }
}

/**
 * Create a new fixed asset
 */
export async function createFixedAsset(data: FixedAssetFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name || !data.purchaseCost || !data.purchaseDate || !data.usefulLifeYears) {
      return { success: false, error: "Name, purchase cost, purchase date, and useful life are required" };
    }

    const purchaseCost = parseFloat(data.purchaseCost);
    const usefulLife = parseInt(data.usefulLifeYears);
    const salvageValue = parseFloat(data.salvageValue || "0");

    if (isNaN(purchaseCost) || purchaseCost <= 0) {
      return { success: false, error: "Invalid purchase cost" };
    }

    if (isNaN(usefulLife) || usefulLife <= 0) {
      return { success: false, error: "Invalid useful life" };
    }

    if (salvageValue >= purchaseCost) {
      return { success: false, error: "Salvage value must be less than purchase cost" };
    }

    const [asset] = await db
      .insert(fixedAssets)
      .values({
        orgId,
        name: data.name,
        category: data.category,
        purchaseDate: new Date(data.purchaseDate),
        purchaseCost: data.purchaseCost,
        usefulLifeYears: usefulLife,
        salvageValue: data.salvageValue || "0",
        depreciationMethod: data.depreciationMethod || "straight_line",
        accumulatedDepreciation: "0",
        status: "active",
        notes: data.notes,
      })
      .returning();

    revalidatePath("/fixed-assets/register");
    return { success: true, data: asset, message: "Fixed asset created successfully" };
  } catch (error) {
    console.error("Failed to create fixed asset:", error);
    return { success: false, error: "Failed to create fixed asset" };
  }
}

/**
 * Update a fixed asset
 */
export async function updateFixedAsset(assetId: string, data: Partial<FixedAssetFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.purchaseCost !== undefined) updateData.purchaseCost = data.purchaseCost;
    if (data.usefulLifeYears !== undefined) updateData.usefulLifeYears = parseInt(data.usefulLifeYears);
    if (data.salvageValue !== undefined) updateData.salvageValue = data.salvageValue;
    if (data.depreciationMethod !== undefined) updateData.depreciationMethod = data.depreciationMethod;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
      .update(fixedAssets)
      .set(updateData)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.orgId, orgId)))
      .returning();

    if (!updated) return { success: false, error: "Asset not found" };

    revalidatePath("/fixed-assets/register");
    return { success: true, data: updated, message: "Fixed asset updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update fixed asset" };
  }
}

/**
 * Delete a fixed asset (only if no depreciation logs exist)
 */
export async function deleteFixedAsset(assetId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Check if asset has depreciation logs
    const depLogs = await db
      .select({ count: sql<number>`count(*)` })
      .from(depreciationLogs)
      .where(and(eq(depreciationLogs.assetId, assetId), eq(depreciationLogs.orgId, orgId)));

    if (depLogs[0].count > 0) {
      return { success: false, error: "Cannot delete asset with depreciation history" };
    }

    const [deleted] = await db
      .delete(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.orgId, orgId)))
      .returning();

    if (!deleted) return { success: false, error: "Asset not found" };

    revalidatePath("/fixed-assets/register");
    return { success: true, message: "Fixed asset deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete fixed asset" };
  }
}

// ==========================================
// DEPRECIATION CALCULATION & POSTING
// ==========================================

export interface DepreciationScheduleRow {
  month: number;
  year: number;
  monthName: string;
  openingBalance: number;
  depreciation: number;
  closingBalance: number;
}

/**
 * Calculate monthly depreciation for an asset using Straight Line Method
 */
async function calculateMonthlyDepreciation(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeYears: number,
  depreciationMethod: string
): Promise<number> {
  const depreciableAmount = purchaseCost - salvageValue;
  const totalMonths = usefulLifeYears * 12;
  
  if (depreciationMethod === "straight_line") {
    return depreciableAmount / totalMonths;
  } else if (depreciationMethod === "declining_balance") {
    // Double declining balance: 2x straight-line rate
    const straightLineRate = 1 / usefulLifeYears;
    const decliningRate = straightLineRate * 2;
    // For first month, use full purchase cost
    return (purchaseCost * decliningRate) / 12;
  }
  
  return depreciableAmount / totalMonths; // Default to straight line
}

/**
 * Generate depreciation schedule for a specific asset and year
 */
export async function getDepreciationSchedule(
  assetId: string,
  year: number
): Promise<{
  success: boolean;
  data?: {
    asset: any;
    schedule: DepreciationScheduleRow[];
    totalDepreciation: number;
    openingBookValue: number;
    closingBookValue: number;
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Fetch asset
    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.orgId, orgId)))
      .limit(1);

    if (!asset) return { success: false, error: "Asset not found" };

    const purchaseCost = parseFloat(asset.purchaseCost);
    const salvageValue = parseFloat(asset.salvageValue);
    const usefulLife = asset.usefulLifeYears;
    const purchaseDate = new Date(asset.purchaseDate);
    const method = asset.depreciationMethod;

    // Calculate months elapsed before the target year
    const startOfYear = new Date(year, 0, 1);
    const monthsElapsedBeforeYear = (startOfYear.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                                     (startOfYear.getMonth() - purchaseDate.getMonth());
    const monthsBefore = Math.max(0, monthsElapsedBeforeYear);
    const totalMonths = usefulLife * 12;

    // Calculate opening book value at start of year
    let currentBookValue = purchaseCost;
    const depreciableAmount = purchaseCost - salvageValue;

    // Simulate depreciation up to start of target year
    for (let m = 0; m < Math.min(monthsBefore, totalMonths); m++) {
      const monthlyDep = await calculateMonthlyDepreciation(
        currentBookValue,
        salvageValue,
        usefulLife,
        method
      );
      
      if (method === "declining_balance") {
        currentBookValue = Math.max(salvageValue, currentBookValue - monthlyDep);
      } else {
        // Straight line: use constant monthly depreciation
        const constantMonthlyDep = depreciableAmount / totalMonths;
        currentBookValue = Math.max(salvageValue, currentBookValue - constantMonthlyDep);
      }
    }

    const openingBookValue = currentBookValue;
    const schedule: DepreciationScheduleRow[] = [];
    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Generate schedule for 12 months
    for (let month = 0; month < 12; month++) {
      const totalMonthsElapsed = monthsBefore + month;
      if (totalMonthsElapsed >= totalMonths) break;

      const openingBV = currentBookValue;
      let depreciation = 0;

      if (method === "straight_line") {
        depreciation = depreciableAmount / totalMonths;
      } else {
        // Declining balance
        depreciation = await calculateMonthlyDepreciation(
          currentBookValue,
          salvageValue,
          usefulLife,
          method
        );
      }

      const closingBV = Math.max(salvageValue, currentBookValue - depreciation);
      depreciation = openingBV - closingBV; // Adjust for precision

      schedule.push({
        month: month + 1,
        year,
        monthName: MONTH_NAMES[month],
        openingBalance: Math.round(openingBV * 100) / 100,
        depreciation: Math.round(depreciation * 100) / 100,
        closingBalance: Math.round(closingBV * 100) / 100,
      });

      currentBookValue = closingBV;
    }

    const totalDepreciation = schedule.reduce((sum, row) => sum + row.depreciation, 0);
    const closingBookValue = schedule.length > 0 ? schedule[schedule.length - 1].closingBalance : openingBookValue;

    return {
      success: true,
      data: {
        asset,
        schedule,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        openingBookValue: Math.round(openingBookValue * 100) / 100,
        closingBookValue: Math.round(closingBookValue * 100) / 100,
      },
    };
  } catch (error) {
    console.error("Failed to calculate depreciation schedule:", error);
    return { success: false, error: "Failed to calculate depreciation schedule" };
  }
}

/**
 * Post depreciation - Creates journal entry and logs depreciation
 */
export async function postDepreciation(
  assetId: string,
  year: number,
  month: number
): Promise<{
  success: boolean;
  data?: {
    journalEntryNumber: string;
    depreciationAmount: number;
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Fetch asset
    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.orgId, orgId)))
      .limit(1);

    if (!asset) return { success: false, error: "Asset not found" };

    if (asset.status === "fully_depreciated" || asset.status === "disposed" || asset.status === "sold") {
      return { success: false, error: "Asset is no longer active" };
    }

    // Calculate monthly depreciation
    const purchaseCost = parseFloat(asset.purchaseCost);
    const salvageValue = parseFloat(asset.salvageValue);
    const usefulLife = asset.usefulLifeYears;
    const method = asset.depreciationMethod;
    const depreciableAmount = purchaseCost - salvageValue;
    const totalMonths = usefulLife * 12;

    // Check if already fully depreciated
    const currentAccumulatedDep = parseFloat(asset.accumulatedDepreciation);
    if (currentAccumulatedDep >= depreciableAmount) {
      await db
        .update(fixedAssets)
        .set({ status: "fully_depreciated" })
        .where(eq(fixedAssets.id, assetId));
      
      return { success: false, error: "Asset is fully depreciated" };
    }

    const monthlyDepreciation = depreciableAmount / totalMonths;

    // Find COA accounts for depreciation
    const [depreciationExpenseAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        ilike(chartOfAccounts.name, "%depreciation expense%")
      ))
      .limit(1);

    const [accumulatedDepreciationAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        ilike(chartOfAccounts.name, "%accumulated depreciation%")
      ))
      .limit(1);

    if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
      return { 
        success: false, 
        error: "Depreciation expense or accumulated depreciation account not found in Chart of Accounts" 
      };
    }

    // Generate journal entry number
    const entryCount = await db.select().from(journalEntries).where(eq(journalEntries.orgId, orgId));
    const entryNumber = `JE-DEP-${String(entryCount.length + 1).padStart(5, "0")}`;

    // Create depreciation date
    const depreciationDate = new Date(year, month - 1, 1);

    // Create journal entry
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: depreciationDate,
        referenceType: "depreciation",
        referenceId: assetId,
        description: `Depreciation for ${asset.name} - ${MONTH_NAMES[month - 1]} ${year}`,
      })
      .returning();

    // Create journal entry lines
    // Debit: Depreciation Expense
    // Credit: Accumulated Depreciation
    await db.insert(journalEntryLines).values({
      orgId,
      journalEntryId: journalEntry.id,
      accountId: depreciationExpenseAccount.id,
      debitAmount: monthlyDepreciation.toFixed(2),
      creditAmount: "0",
      description: `Depreciation expense - ${asset.name}`,
    });

    await db.insert(journalEntryLines).values({
      orgId,
      journalEntryId: journalEntry.id,
      accountId: accumulatedDepreciationAccount.id,
      debitAmount: "0",
      creditAmount: monthlyDepreciation.toFixed(2),
      description: `Accumulated depreciation - ${asset.name}`,
    });

    // Calculate new book value
    const newAccumulatedDep = currentAccumulatedDep + monthlyDepreciation;
    const newBookValue = purchaseCost - newAccumulatedDep;

    // Update asset's accumulated depreciation
    await db
      .update(fixedAssets)
      .set({
        accumulatedDepreciation: newAccumulatedDep.toFixed(2),
      })
      .where(eq(fixedAssets.id, assetId));

    // Create depreciation log
    const [depLog] = await db
      .insert(depreciationLogs)
      .values({
        orgId,
        assetId,
        depreciationDate,
        amount: monthlyDepreciation.toFixed(2),
        bookValueAfter: Math.max(salvageValue, newBookValue).toFixed(2),
        journalEntryId: journalEntry.id,
        isPosted: true,
        notes: `Posted via journal entry ${entryNumber}`,
      })
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || "system",
      action: "DEPRECIATION_POSTED",
      entityType: "fixed_asset",
      entityId: assetId,
      changes: JSON.stringify({
        assetName: asset.name,
        entryNumber,
        depreciationAmount: monthlyDepreciation,
        month: MONTH_NAMES[month - 1],
        year,
      }),
    });

    revalidatePath("/fixed-assets/depreciation");
    revalidatePath("/accounts/ledger");

    return {
      success: true,
      data: {
        journalEntryNumber: entryNumber,
        depreciationAmount: monthlyDepreciation,
      },
    };
  } catch (error) {
    console.error("Failed to post depreciation:", error);
    return { success: false, error: "Failed to post depreciation" };
  }
}

/**
 * Get depreciation history for an asset
 */
export async function getDepreciationHistory(assetId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const logs = await db
      .select()
      .from(depreciationLogs)
      .where(and(eq(depreciationLogs.assetId, assetId), eq(depreciationLogs.orgId, orgId)))
      .orderBy(desc(depreciationLogs.depreciationDate));

    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: "Failed to fetch depreciation history" };
  }
}

// Helper: Month names
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
