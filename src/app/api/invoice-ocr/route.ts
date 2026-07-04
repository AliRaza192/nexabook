import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processInvoiceImage } from "@/lib/actions/invoice-ocr";

export async function POST(request: NextRequest) {
  try {
    // Auth check — prevent unauthenticated file uploads
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Upload JPG, PNG, or PDF." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    // Process with Gemini Vision (real OCR, not stub)
    const result = await processInvoiceImage(file);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Invoice OCR API]", error);
    return NextResponse.json(
      { success: false, error: "Processing failed" },
      { status: 500 }
    );
  }
}
