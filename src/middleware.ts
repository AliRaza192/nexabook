import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/portal(.*)",
  "/vendor-portal(.*)",
  "/api/webhooks(.*)",
  "/api/portal-pay(.*)",
  "/api/portal-statement(.*)",
  "/api/payments(.*)",
  "/api/cron(.*)",
]);

const csrfExemptRoutes = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/portal-pay(.*)",
  "/api/portal-statement(.*)",
  "/api/payments(.*)",
  "/api/cron(.*)",
  "/api/chat(.*)",
  "/api/mobile(.*)",
]);

function isMutationMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (req.nextUrl.pathname.startsWith("/api/")) {
    // Rate limiting
    const result = await rateLimit(ip, 30, 60_000);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // CSRF validation for state-changing requests
    if (isMutationMethod(req.method) && !csrfExemptRoutes(req)) {
      const cookieToken = req.cookies.get("csrf-token")?.value;
      const headerToken = req.headers.get("x-csrf-token");
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
