import { rateLimit } from "@/lib/rate-limit";
import { getCurrentOrgId } from "./shared";

/**
 * Rate limit server actions by orgId.
 * Use at the start of sensitive actions (create, update, delete).
 *
 * @param actionName - Name of the action for rate limit keying
 * @param maxRequests - Max requests allowed in the window (default: 30)
 * @param windowMs - Time window in ms (default: 60 seconds)
 */
export async function rateLimitAction(
  actionName: string,
  maxRequests = 30,
  windowMs = 60_000
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: true }; // No org = no rate limit (auth will catch it)

    const key = `action:${orgId}:${actionName}`;
    const result = await rateLimit(key, maxRequests, windowMs);

    if (!result.success) {
      return {
        success: false,
        error: "Too many requests. Please try again later.",
      };
    }

    return { success: true };
  } catch {
    // If rate limiting fails (e.g., Redis down), allow the request
    return { success: true };
  }
}
