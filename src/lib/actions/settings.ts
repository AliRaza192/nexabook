"use server";

import { db } from "@/db";
import { organizations, profiles } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, requireRole } from "./shared";
import { revalidatePath } from "next/cache";

// ─── Company Profile ───────────────────────────────────────────

export async function getCompanyProfile() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    return { success: true, data: org };
  } catch (error) {
    return { success: false, error: "Failed to load company profile" };
  }
}

export interface CompanyProfileData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  ntn?: string;
  strn?: string;
  currency?: string;
  fiscalYearStart?: string;
  invoicePrefix?: string;
  orderPrefix?: string;
  quotationPrefix?: string;
  purchasePrefix?: string;
  billPrefix?: string;
  grnPrefix?: string;
  numberingPadding?: number;
  numberingIncludeYear?: boolean;
  logo?: string;
}

export async function updateCompanyProfile(data: CompanyProfileData) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(organizations)
      .set({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country || "Pakistan",
        website: data.website,
        ntn: data.ntn,
        strn: data.strn,
        currency: data.currency || "PKR",
        fiscalYearStart: data.fiscalYearStart,
        invoicePrefix: data.invoicePrefix,
        orderPrefix: data.orderPrefix,
        quotationPrefix: data.quotationPrefix,
        purchasePrefix: data.purchasePrefix,
        billPrefix: data.billPrefix,
        grnPrefix: data.grnPrefix,
        numberingPadding: data.numberingPadding,
        numberingIncludeYear: data.numberingIncludeYear,
        logo: data.logo,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update";
    return { success: false, error: msg };
  }
}

// ─── User Management ───────────────────────────────────────────

export async function getOrgUsers() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const users = await db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
        role: profiles.role,
        department: profiles.department,
        designation: profiles.designation,
        isActive: profiles.isActive,
        lastLoginAt: profiles.lastLoginAt,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.orgId, orgId))
      .orderBy(profiles.createdAt);

    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: "Failed to load users" };
  }
}

export async function getCurrentUserProfile() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [profile] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
      .limit(1);

    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: "Failed to load profile" };
  }
}

export interface UpdateUserData {
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  role: string;
  isActive: boolean;
}

export async function updateOrgUser(profileId: string, data: UpdateUserData) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    // Ensure this profile belongs to this org
    const [existing] = await db
      .select({ id: profiles.id, userId: profiles.userId })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.orgId, orgId)))
      .limit(1);

    if (!existing) return { success: false, error: "User not found" };

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        phone: data.phone,
        department: data.department,
        designation: data.designation,
        role: data.role as any,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update user";
    return { success: false, error: msg };
  }
}

export async function updateMyProfile(data: {
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        phone: data.phone,
        department: data.department,
        designation: data.designation,
        updatedAt: new Date(),
      })
      .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update profile" };
  }
}

export async function deactivateUser(profileId: string) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    // Cannot deactivate yourself
    const { userId } = await auth();
    const [self] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.userId, userId!), eq(profiles.orgId, orgId)))
      .limit(1);

    if (self?.id === profileId) {
      return { success: false, error: "You cannot deactivate your own account" };
    }

    await db
      .update(profiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(profiles.id, profileId), eq(profiles.orgId, orgId)));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return { success: false, error: msg };
  }
}

export async function reactivateUser(profileId: string) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization" };

    await db
      .update(profiles)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(profiles.id, profileId), eq(profiles.orgId, orgId)));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed" };
  }
}