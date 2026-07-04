import { NextRequest, NextResponse } from "next/server";
import { getWHTVendorStatement } from "@/lib/actions/reports";
import { generateWHTCertificatePDF } from "@/lib/utils/wht-certificate-pdf";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!vendorId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: "vendorId, dateFrom, dateTo are required" }, { status: 400 });
    }

    const result = await getWHTVendorStatement(vendorId, dateFrom, dateTo);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "No data" }, { status: 404 });
    }

    const pdfBlob = await generateWHTCertificatePDF(result.data);
    const vendorName = result.data.vendor.name.replace(/\s+/g, "_");

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="WHT_Certificate_${vendorName}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate WHT certificate" }, { status: 500 });
  }
}
