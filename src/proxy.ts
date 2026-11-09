import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/portal/[token]",
  "/vendor-portal/[token]",
  "/api/webhooks/[id]",
  "/api/portal-pay",
  "/api/portal-statement",
  "/api/payments/callback",
  "/api/payments/initiate",
  "/api/cron/(.*)",
  "/api/stripe/webhook",
]);

const csrfExemptRoutes = createRouteMatcher([
  "/api/webhooks/[id]",
  "/api/portal-pay",
  "/api/portal-statement",
  "/api/payments/callback",
  "/api/payments/initiate",
  "/api/cron/(.*)",
  "/api/chat",
  "/api/mobile/(.*)",
  "/api/stripe/webhook",
]);

function isMutationMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = userId || `ip:${ip}`;

    const result = await rateLimit(rateLimitKey, 60, 60_000);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (isMutationMethod(req.method) && !csrfExemptRoutes(req)) {
      const cookieToken = req.cookies.get("csrf-token")?.value;
      const headerToken = req.headers.get("x-csrf-token");
      if (!cookieToken || !headerToken) {
        return NextResponse.json(
          { error: "CSRF token missing" },
          { status: 403 }
        );
      }
      const a = Buffer.from(cookieToken);
      const b = Buffer.from(headerToken);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}, {
  signInUrl: "/login",
  signUpUrl: "/register",
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
