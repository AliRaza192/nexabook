import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, organizations } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      orgId: customers.orgId,
      orgName: organizations.name,
      orgAddress: organizations.address,
      orgCity: organizations.city,
      orgPhone: organizations.phone,
      orgEmail: organizations.email,
      orgNtn: organizations.ntn,
      orgStrn: organizations.strn,
    })
    .from(customers)
    .innerJoin(organizations, eq(customers.orgId, organizations.id))
    .where(eq(customers.portalToken, token))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const customerInvoices = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      netAmount: invoices.netAmount,
      balanceAmount: invoices.balanceAmount,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customer.id),
        eq(invoices.orgId, customer.orgId),
        sql`${invoices.status} NOT IN ('draft', 'cancelled')`
      )
    )
    .orderBy(sql`${invoices.issueDate} DESC`);

  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(customer.orgName || "Business", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const orgLine = [customer.orgAddress, customer.orgCity].filter(Boolean).join(", ");
  if (orgLine) doc.text(orgLine, pageWidth / 2, 27, { align: "center" });
  const contactLine = [customer.orgPhone, customer.orgEmail].filter(Boolean).join(" | ");
  if (contactLine) doc.text(contactLine, pageWidth / 2, 32, { align: "center" });
  doc.text(`NTN: ${customer.orgNtn || "N/A"} | STRN: ${customer.orgStrn || "N/A"}`, pageWidth / 2, 37, { align: "center" });

  // Customer info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Customer Statement", pageWidth / 2, 47, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Customer: ${customer.name}`, 14, 55);
  doc.text(`Date: ${new Date().toLocaleDateString("en-PK")}`, 14, 61);
  doc.text(`Total Invoices: ${customerInvoices.length}`, 14, 67);

  const totalOutstanding = customerInvoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + parseFloat(i.balanceAmount || "0"), 0);
  doc.text(`Outstanding: Rs. ${totalOutstanding.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`, 14, 73);

  // Table
  const tableData = customerInvoices.map((inv, i) => [
    i + 1,
    inv.invoiceNumber,
    new Date(inv.issueDate).toLocaleDateString("en-PK"),
    inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-PK") : "—",
    inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
    `Rs. ${parseFloat(inv.netAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
    `Rs. ${parseFloat(inv.balanceAmount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["#", "Invoice", "Date", "Due Date", "Status", "Amount", "Balance"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [31, 41, 55], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${customer.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
