import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const PLANS = {
  free: { priceId: null, name: "Free", limit: "basic" },
  professional: { priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "", name: "Professional", limit: "full" },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "", name: "Enterprise", limit: "full" },
} as const;

export type PlanType = keyof typeof PLANS;
