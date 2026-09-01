import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, orgFteSubscriptions, digitalFteProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { captureException } from "@/lib/error-handler";

type PlanType = "free" | "professional" | "enterprise";

function safePeriodEnd(sub: Record<string, unknown>): Date | null {
  const items = sub.items as Record<string, unknown> | undefined;
  const data = items?.data as unknown[] | undefined;
  const firstItem = data?.[0] as Record<string, unknown> | undefined;
  const ts = (firstItem?.current_period_end as number) ?? (sub.current_period_end as number);
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
        const session = event.data.object as unknown as Record<string, unknown>;
        const metadata = session.metadata as Record<string, unknown> | undefined;
        const orgId = metadata?.orgId as string | undefined;
        const subscriptionId = session.subscription as string;
        const planType = (metadata?.planType as PlanType) || "professional";
        const productSlug = metadata?.productSlug as string | undefined;

        if (orgId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);

          if (productSlug) {
            const [fteProduct] = await db
              .select()
              .from(digitalFteProducts)
              .where(eq(digitalFteProducts.slug, productSlug))
              .limit(1);

            if (fteProduct) {
              const periodEnd = safePeriodEnd(sub as unknown as Record<string, unknown>);
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
            const periodEnd = safePeriodEnd(sub as unknown as Record<string, unknown>);
            await db.update(organizations).set({
              stripeSubscriptionId: subscriptionId,
              planType,
              subscriptionStatus: sub.status,
              subscriptionEndsAt: periodEnd ?? undefined,
            }).where(eq(organizations.id, orgId));
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = safePeriodEnd(sub as unknown as Record<string, unknown>);
          await db.update(organizations).set({
            subscriptionStatus: sub.status,
            subscriptionEndsAt: periodEnd ?? undefined,
          }).where(eq(organizations.stripeSubscriptionId, subscriptionId));
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as Record<string, unknown>;

        const [existingFteSub] = await db
          .select()
          .from(orgFteSubscriptions)
          .where(eq(orgFteSubscriptions.stripeSubscriptionId, sub.id as string))
          .limit(1);

        if (existingFteSub) {
          const periodEnd = safePeriodEnd(sub);
          await db
            .update(orgFteSubscriptions)
            .set({
              status: sub.status === "active" || sub.status === "trialing" ? "active" : "canceled",
              currentPeriodEnd: periodEnd ?? undefined,
              cancelAtPeriodEnd: (sub.cancel_at_period_end as boolean) || false,
              updatedAt: new Date(),
            })
            .where(eq(orgFteSubscriptions.stripeSubscriptionId, sub.id as string));
        } else {
          const periodEnd = safePeriodEnd(sub);
          const subMetadata = sub.metadata as Record<string, unknown> | undefined;
          await db.update(organizations).set({
            subscriptionStatus: sub.status as string,
            subscriptionEndsAt: periodEnd ?? undefined,
            planType: sub.status === "active" || sub.status === "trialing"
              ? ((subMetadata?.planType as PlanType) || "professional")
              : "free",
          }).where(eq(organizations.stripeSubscriptionId, sub.id as string));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureException(error, { module: "stripe/webhook", function: "POST" });
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
