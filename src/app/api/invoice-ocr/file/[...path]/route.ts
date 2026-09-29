import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readFile } from "fs/promises";
import { join, basename } from "path";
import { getCurrentOrgId } from "@/lib/actions/shared";
import { captureException } from "@/lib/error-handler";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  webp: "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { path: segments } = await params;
    if (!segments || segments.length !== 2) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [fileOrgId, rawName] = segments;

    // Tenancy check — a user may only read their own org's uploads.
    if (fileOrgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filename = basename(rawName);
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/.test(filename)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const ext = filename.split(".").pop() || "";
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const uploadDir = join(process.cwd(), ".uploads", "invoices");
    const filePath = join(uploadDir, orgId, filename);

    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    captureException(error, { module: "invoice-ocr", function: "GET /file" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
