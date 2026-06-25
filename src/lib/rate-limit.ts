import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

class InMemoryRateLimit {
  private store = new Map<string, { count: number; resetAt: number }>();

  async limit(identifier: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return { success: false, remaining: 0, reset: entry.resetAt };
    }

    return { success: true, remaining: maxRequests - entry.count, reset: entry.resetAt };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) this.store.delete(key);
    }
  }
}

let ratelimit: Ratelimit | null = null;
let inMemory: InMemoryRateLimit | null = null;

function getRatelimit() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!ratelimit) {
      const redis = Redis.fromEnv();
      ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit",
      });
    }
    return ratelimit;
  }
  return null;
}

function getInMemory() {
  if (!inMemory) {
    inMemory = new InMemoryRateLimit();
    setInterval(() => inMemory!.cleanup(), 60_000);
  }
  return inMemory;
}

export async function rateLimit(identifier: string, maxRequests = 60, windowMs = 60_000): Promise<RateLimitResult> {
  const redis = getRatelimit();
  if (redis) {
    const result = await redis.limit(identifier);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  }
  return getInMemory().limit(identifier, maxRequests, windowMs);
}
