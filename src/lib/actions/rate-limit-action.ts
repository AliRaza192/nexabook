import { rateLimit } from "../rate-limit";
import { auth } from "@clerk/nextjs/server";

export async function withRateLimit(maxRequests = 30, windowMs = 60_000): Promise<void> {
  const { userId } = await auth();
  const identifier = userId ?? "anonymous";
  const result = await rateLimit(identifier, maxRequests, windowMs);
  if (!result.success) {
    throw new Error("Too many requests. Please try again later.");
  }
}
