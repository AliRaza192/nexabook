import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

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

        if (orgId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await db.update(organizations).set({
            stripeSubscriptionId: subscriptionId,
            planType: planType as any,
            subscriptionStatus: sub.status,
            subscriptionEndsAt: new Date((sub as any).current_period_end * 1000),
          }).where(eq(organizations.id, orgId));
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await db.update(organizations).set({
            subscriptionStatus: sub.status,
            subscriptionEndsAt: new Date((sub as any).current_period_end * 1000),
          }).where(eq(organizations.stripeSubscriptionId, subscriptionId));
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await db.update(organizations).set({
          subscriptionStatus: sub.status,
          subscriptionEndsAt: new Date(sub.current_period_end * 1000),
          planType: sub.status === "active" || sub.status === "trialing"
            ? (sub.metadata?.planType as any) || "professional"
            : "free",
        }).where(eq(organizations.stripeSubscriptionId, sub.id));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
