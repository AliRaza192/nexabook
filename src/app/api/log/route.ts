import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const entry = await request.json();
    const level = entry.level || "info";
    const message = entry.message || "Client log";
    const meta = entry.context || {};

    if (level === "error") {
      logger.error(message, meta);
    } else if (level === "warn") {
      logger.warn(message, meta);
    } else {
      logger.info(message, meta);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
