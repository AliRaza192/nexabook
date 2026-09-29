import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const ratelimitInstances = new Map<string, Ratelimit>();

function getRatelimit(maxRequests: number, windowMs: number): Ratelimit {
  const key = `${maxRequests}:${windowMs}`;
  let instance = ratelimitInstances.get(key);
  if (!instance) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        "Rate limiting requires Upstash Redis. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment."
      );
    }
    const redis = Redis.fromEnv();
    const windowSeconds = Math.ceil(windowMs / 1000);
    const windowUnit = windowSeconds <= 60 ? "s" : "m";
    const windowAmount = windowSeconds <= 60 ? windowSeconds : Math.ceil(windowSeconds / 60);
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowAmount} ${windowUnit}`),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
    ratelimitInstances.set(key, instance);
  }
  return instance;
}

export async function rateLimit(identifier: string, maxRequests = 60, windowMs = 60_000): Promise<RateLimitResult> {
  const rl = getRatelimit(maxRequests, windowMs);
  const result = await rl.limit(identifier);
  return { success: result.success, remaining: result.remaining, reset: result.reset };
}
