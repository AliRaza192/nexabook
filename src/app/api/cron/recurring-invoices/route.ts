import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recurringInvoices, recurringInvoiceItems, invoices, invoiceItems, customers } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRecurring = await db
      .select({
        rec: recurringInvoices,
        customerName: customers.name,
      })
      .from(recurringInvoices)
      .innerJoin(customers, eq(recurringInvoices.customerId, customers.id))
      .where(
        and(
          eq(recurringInvoices.status, "active"),
          lte(recurringInvoices.nextInvoiceDate, today),
          sql`(${recurringInvoices.endDate} IS NULL OR ${recurringInvoices.endDate} >= ${today})`
        )
      );

    const generated: string[] = [];

    for (const { rec, customerName } of dueRecurring) {
      const items = await db
        .select()
        .from(recurringInvoiceItems)
        .where(eq(recurringInvoiceItems.recurringInvoiceId, rec.id));

      const [newInvoice] = await db
        .insert(invoices)
        .values({
          orgId: rec.orgId,
          customerId: rec.customerId,
          invoiceNumber: `RCR-${Date.now()}-${rec.id.slice(0, 4)}`,
          issueDate: today,
          dueDate: new Date(today.getTime() + 15 * 86400000),
          status: "sent",
          subject: rec.subject || undefined,
          notes: rec.notes || undefined,
          terms: rec.terms || undefined,
          discountPercentage: rec.discountPercentage,
          shippingCharges: rec.shippingCharges,
          taxAmount: rec.taxAmount,
          grossAmount: "0",
          netAmount: "0",
          balanceAmount: "0",
        })
        .returning();

      let totalGross = 0;

      for (const item of items) {
        const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        totalGross += lineTotal;
        await db.insert(invoiceItems).values({
          orgId: rec.orgId,
          invoiceId: newInvoice.id,
          productId: item.productId || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: lineTotal.toFixed(2),
        });
      }

      const discountAmt = (totalGross * parseFloat(rec.discountPercentage)) / 100;
      const netTotal = totalGross - discountAmt + parseFloat(rec.taxAmount) + parseFloat(rec.shippingCharges);

      await db
        .update(invoices)
        .set({
          grossAmount: totalGross.toFixed(2),
          netAmount: netTotal.toFixed(2),
          balanceAmount: netTotal.toFixed(2),
        })
        .where(eq(invoices.id, newInvoice.id));

      if (!rec.nextInvoiceDate) {
        generated.push(`${rec.templateName} → ${customerName}: no next date set`);
        continue;
      }
      const nextDate = new Date(rec.nextInvoiceDate);
      switch (rec.interval) {
        case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
        case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
        case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
        case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }

      await db
        .update(recurringInvoices)
        .set({
          lastGeneratedInvoiceId: newInvoice.id,
          nextInvoiceDate: nextDate,
          status: rec.endDate && nextDate > rec.endDate ? "completed" : "active",
        })
        .where(eq(recurringInvoices.id, rec.id));

      generated.push(`${rec.templateName} → Invoice #${newInvoice.invoiceNumber} (${customerName})`);
    }

    return NextResponse.json({ success: true, generated: generated.length, details: generated });
  } catch (err) {
    console.error("Recurring invoice cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
