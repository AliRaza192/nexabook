import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const entry = await request.json();

    // In production, this would forward to Sentry/DataDog/etc.
    if (process.env.SENTRY_DSN) {
      const { initSentry } = await import("@/lib/sentry");
      const sentry = initSentry();
      if (sentry && entry.level === "error") {
        sentry.captureException(new Error(entry.message), {
          extra: entry.context || {},
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Log API error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
