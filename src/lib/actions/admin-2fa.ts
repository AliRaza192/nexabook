"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";

export async function checkAdmin2FAStatus(): Promise<{
  isAdmin: boolean;
  has2FA: boolean;
}> {
  const { userId } = await auth();
  if (!userId) return { isAdmin: false, has2FA: false };

  const orgId = await getCurrentOrgId();
  if (!orgId) return { isAdmin: false, has2FA: false };

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.orgId, orgId)))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    return { isAdmin: false, has2FA: false };
  }

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    return { isAdmin: true, has2FA: clerkUser.twoFactorEnabled ?? false };
  } catch {
    return { isAdmin: true, has2FA: false };
  }
}
