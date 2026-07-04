import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, digitalFteProducts, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
});

async function getOrgId(userId: string): Promise<string | null> {
  const profile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile.length > 0 && profile[0].orgId ? profile[0].orgId : null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId(userId);
    if (!orgId) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    const { productId, billingCycle } = await request.json();
    if (!productId || !billingCycle) {
      return NextResponse.json(
        { success: false, error: "productId and billingCycle required" },
        { status: 400 }
      );
    }

    // Fetch product
    const [product] = await db
      .select()
      .from(digitalFteProducts)
      .where(eq(digitalFteProducts.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Fetch org for Stripe customer
    const [org] = await db
      .select({ stripeCustomerId: organizations.stripeCustomerId, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    let customerId = org?.stripeCustomerId;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org?.name || "NexaBook Org",
        metadata: { orgId },
      });
      customerId = customer.id;

      await db
        .update(organizations)
        .set({ stripeCustomerId: customerId })
        .where(eq(organizations.id, orgId));
    }

    // Get the Stripe Price ID
    const priceId =
      billingCycle === "yearly"
        ? product.stripePriceIdYearly
        : product.stripePriceIdMonthly;

    if (!priceId) {
      const msg = billingCycle === "yearly"
        ? "Yearly price not configured for this product. Please contact support."
        : "Stripe Price ID not configured. Set STRIPE_FTE_PRICE_ID in .env.local";
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/marketplace?canceled=true`,
      metadata: { orgId, productSlug: product.slug },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    console.error("[Marketplace Checkout]", error);
    return NextResponse.json(
      { success: false, error: "Checkout failed" },
      { status: 500 }
    );
  }
}
