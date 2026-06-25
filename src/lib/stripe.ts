import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const PLANS = {
  free: { priceId: null, name: "Free", limit: "basic" },
  professional: { priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "", name: "Professional", limit: "full" },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "", name: "Enterprise", limit: "full" },
} as const;

export type PlanType = keyof typeof PLANS;
