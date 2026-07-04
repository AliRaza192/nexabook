import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, orgFteSubscriptions, digitalFteProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

function safePeriodEnd(sub: any): Date | null {
  // Try items.data[0] first (newer API versions), then top-level
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  if (typeof ts === "number" && !isNaN(ts)) return new Date(ts * 1000);
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const orgId = session.metadata?.orgId;
        const subscriptionId = session.subscription as string;
        const planType = session.metadata?.planType || "professional";
        const productSlug = session.metadata?.productSlug;

        if (orgId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);

          // Handle FTE product subscription
          if (productSlug) {
            const [fteProduct] = await db
              .select()
              .from(digitalFteProducts)
              .where(eq(digitalFteProducts.slug, productSlug))
              .limit(1);

            if (fteProduct) {
              const periodEnd = safePeriodEnd(sub);
              await db.insert(orgFteSubscriptions).values({
                orgId,
                fteProductId: fteProduct.id,
                status: sub.status === "active" ? "active" : "past_due",
                stripeSubscriptionId: subscriptionId,
                stripeCustomerId: session.customer as string,
                currentPeriodEnd: periodEnd ?? new Date(),
              });
            }
          } else {
            // Handle main platform subscription
            const periodEnd = safePeriodEnd(sub);
            await db.update(organizations).set({
              stripeSubscriptionId: subscriptionId,
              planType: planType as any,
              subscriptionStatus: sub.status,
              subscriptionEndsAt: periodEnd ?? undefined,
            }).where(eq(organizations.id, orgId));
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = safePeriodEnd(sub);
          await db.update(organizations).set({
            subscriptionStatus: sub.status,
            subscriptionEndsAt: periodEnd ?? undefined,
          }).where(eq(organizations.stripeSubscriptionId, subscriptionId));
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;

        // Check if this is an FTE subscription
        const [existingFteSub] = await db
          .select()
          .from(orgFteSubscriptions)
          .where(eq(orgFteSubscriptions.stripeSubscriptionId, sub.id))
          .limit(1);

        if (existingFteSub) {
          // Update FTE subscription
          const periodEnd = safePeriodEnd(sub);
          await db
            .update(orgFteSubscriptions)
            .set({
              status: sub.status === "active" || sub.status === "trialing" ? "active" : "canceled",
              currentPeriodEnd: periodEnd ?? undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end || false,
              updatedAt: new Date(),
            })
            .where(eq(orgFteSubscriptions.stripeSubscriptionId, sub.id));
        } else {
          // Update main platform subscription
          const periodEnd = safePeriodEnd(sub);
          await db.update(organizations).set({
            subscriptionStatus: sub.status,
            subscriptionEndsAt: periodEnd ?? undefined,
            planType: sub.status === "active" || sub.status === "trialing"
              ? (sub.metadata?.planType as any) || "professional"
              : "free",
          }).where(eq(organizations.stripeSubscriptionId, sub.id));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
