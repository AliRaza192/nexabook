"use server";

import { db } from "@/db";
import {
  onboardingProgress, organizations, products, customers, profiles, chartOfAccounts,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function createOrganization(data: {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const existingOrgId = await getCurrentOrgId();
    if (existingOrgId) return { success: true, data: { orgId: existingOrgId } };

    const user = await currentUser();
    if (!user) return { success: false, error: "User not found" };

    const timestamp = Date.now();
    const [newOrg] = await db.insert(organizations).values({
      name: data.name,
      slug: `my-business-${timestamp}`,
      currency: "PKR",
      fiscalYearStart: "07-01",
      country: "Pakistan",
      address: data.address || null,
      city: data.city || null,
      phone: data.phone || null,
    }).returning({ id: organizations.id });

    if (!newOrg) return { success: false, error: "Failed to create organization" };

    const userEmail = user.emailAddresses[0]?.emailAddress || "";
    const userFullName = user.fullName || user.username || "User";

    await db.insert(profiles).values({
      userId,
      orgId: newOrg.id,
      role: "admin",
      fullName: userFullName,
      email: userEmail,
    });

    // Seed default Chart of Accounts
    const defaultAccounts = [
      { code: "1010", name: "Cash", type: "asset", subType: "cash", description: "Cash on hand" },
      { code: "1020", name: "Bank", type: "asset", subType: "bank", description: "Bank account" },
      { code: "1100", name: "Accounts Receivable", type: "asset", subType: "accounts_receivable", description: "Money owed by customers" },
      { code: "1200", name: "Inventory", type: "asset", subType: "inventory", description: "Goods available for sale" },
      { code: "2100", name: "Accounts Payable", type: "liability", subType: "accounts_payable", description: "Money owed to suppliers" },
      { code: "2200", name: "Sales Tax Payable", type: "liability", subType: "tax_payable", description: "Sales tax collected" },
      { code: "3000", name: "Owner's Equity", type: "equity", subType: "capital", description: "Owner's investment" },
      { code: "3010", name: "Opening Balance Equity", type: "equity", subType: "opening_balance_equity", description: "Opening balance contra account" },
      { code: "3100", name: "Retained Earnings", type: "equity", subType: "retained_earnings", description: "Accumulated profits" },
      { code: "4000", name: "Sales Revenue", type: "income", subType: "sales_revenue", description: "Revenue from sales" },
      { code: "5000", name: "Cost of Goods Sold", type: "expense", subType: "cogs", description: "Direct cost of goods sold" },
    ];

    await db.insert(chartOfAccounts).values(
      defaultAccounts.map(a => ({ ...a, orgId: newOrg.id, isSystemAccount: true, isActive: true, balance: "0" }))
    );

    revalidatePath("/onboarding");
    return { success: true, data: { orgId: newOrg.id } };
  } catch (error) {
    console.error("[createOrganization]", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export async function getOnboardingStatus() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.orgId, orgId))
      .limit(1);

    return {
      success: true,
      data: progress || { completedSteps: [], isCompleted: false },
    };
  } catch {
    return { success: false, error: "Failed to get onboarding status" };
  }
}

export async function completeOnboardingStep(step: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.orgId, orgId))
      .limit(1);

    if (existing) {
      const existingSteps = (existing.completedSteps || []) as string[];
      const steps = [...new Set([...existingSteps, step])];
      await db
        .update(onboardingProgress)
        .set({ completedSteps: steps, updatedAt: new Date() })
        .where(eq(onboardingProgress.orgId, orgId));
    } else {
      await db.insert(onboardingProgress).values({
        orgId,
        completedSteps: [step],
      });
    }

    revalidatePath("/onboarding");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update onboarding" };
  }
}

export async function finishOnboarding() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.orgId, orgId))
      .limit(1);

    if (existing) {
      await db
        .update(onboardingProgress)
        .set({ isCompleted: true, updatedAt: new Date() })
        .where(eq(onboardingProgress.orgId, orgId));
    } else {
      await db.insert(onboardingProgress).values({
        orgId,
        completedSteps: [],
        isCompleted: true,
      });
    }

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to complete onboarding" };
  }
}

export async function updateOrganizationOnboarding(data: {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(organizations)
      .set({
        name: data.name,
        address: data.address,
        city: data.city,
        phone: data.phone,
      })
      .where(eq(organizations.id, orgId));

    revalidatePath("/onboarding");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update organization" };
  }
}
