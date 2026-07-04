import { db } from "@/db";
import { orgFteSubscriptions, digitalFteProducts } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";

export type FteProductSlug =
  | "accounting-fte"
  | "tax-compliance-fte"
  | "inventory-fte"
  | "payroll-fte"
  | "crm-fte";

// Check if org has active subscription for a Digital FTE product
export async function hasFteAccess(
  orgId: string,
  productSlug: FteProductSlug
): Promise<{ hasAccess: boolean; status?: string; expiresAt?: Date }> {
  try {
    const result = await db
      .select({
        status: orgFteSubscriptions.status,
        currentPeriodEnd: orgFteSubscriptions.currentPeriodEnd,
      })
      .from(orgFteSubscriptions)
      .innerJoin(
        digitalFteProducts,
        eq(orgFteSubscriptions.fteProductId, digitalFteProducts.id)
      )
      .where(
        and(
          eq(orgFteSubscriptions.orgId, orgId),
          eq(digitalFteProducts.slug, productSlug),
          or(
            eq(orgFteSubscriptions.status, "active"),
            eq(orgFteSubscriptions.status, "trial")
          )
        )
      )
      .limit(1);

    if (result.length === 0) {
      return { hasAccess: false };
    }

    const sub = result[0];

    // Check if subscription has expired
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
      return { hasAccess: false, status: "expired", expiresAt: sub.currentPeriodEnd };
    }

    return {
      hasAccess: true,
      status: sub.status,
      expiresAt: sub.currentPeriodEnd || undefined,
    };
  } catch (error) {
    console.error("[hasFteAccess]", error);
    return { hasAccess: false };
  }
}

// Get all FTE subscriptions for an org
export async function getOrgFteSubscriptions(orgId: string) {
  try {
    const subs = await db
      .select({
        id: orgFteSubscriptions.id,
        status: orgFteSubscriptions.status,
        currentPeriodEnd: orgFteSubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: orgFteSubscriptions.cancelAtPeriodEnd,
        productName: digitalFteProducts.name,
        productSlug: digitalFteProducts.slug,
        productDescription: digitalFteProducts.description,
        priceMonthly: digitalFteProducts.priceMonthly,
      })
      .from(orgFteSubscriptions)
      .innerJoin(
        digitalFteProducts,
        eq(orgFteSubscriptions.fteProductId, digitalFteProducts.id)
      )
      .where(eq(orgFteSubscriptions.orgId, orgId));

    return subs;
  } catch (error) {
    console.error("[getOrgFteSubscriptions]", error);
    return [];
  }
}

// Get all available Digital FTE products
export async function getAvailableFteProducts() {
  try {
    return await db
      .select()
      .from(digitalFteProducts)
      .where(eq(digitalFteProducts.isActive, true));
  } catch (error) {
    console.error("[getAvailableFteProducts]", error);
    return [];
  }
}
