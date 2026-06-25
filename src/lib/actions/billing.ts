"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { stripe, PLANS } from "@/lib/stripe";

export async function createCheckoutSession(priceId: string, planType: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, email: organizations.email, stripeCustomerId: organizations.stripeCustomerId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) return { success: false, error: "Organization not found" };

    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.email || undefined,
        metadata: { orgId },
      });
      customerId = customer.id;
      await db.update(organizations).set({ stripeCustomerId: customerId }).where(eq(organizations.id, orgId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: { orgId, planType },
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error in billing.ts:", error);
    return { success: false, error: "Failed to create checkout session" };
  }
}

export async function getSubscription() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({
        planType: organizations.planType,
        stripeSubscriptionId: organizations.stripeSubscriptionId,
        subscriptionStatus: organizations.subscriptionStatus,
        subscriptionEndsAt: organizations.subscriptionEndsAt,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) return { success: false, error: "Organization not found" };

    return {
      success: true,
      data: {
        plan: org.planType,
        subscriptionId: org.stripeSubscriptionId,
        status: org.subscriptionStatus,
        endsAt: org.subscriptionEndsAt,
      },
    };
  } catch (error) {
    console.error("Error in billing.ts:", error);
    return { success: false, error: "Failed to get subscription" };
  }
}

export async function createPortalSession() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ stripeCustomerId: organizations.stripeCustomerId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org?.stripeCustomerId) return { success: false, error: "No Stripe customer found" };

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error in billing.ts:", error);
    return { success: false, error: "Failed to create portal session" };
  }
}
