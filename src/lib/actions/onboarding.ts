"use server";

import { db } from "@/db";
import { onboardingProgress, organizations, products, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

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
