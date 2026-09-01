import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, customers, organizations, reminderSettings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendTextMessage, isWhatsAppConfigured } from "@/lib/utils/whatsapp";
import { captureException } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const whatsappEnabled = isWhatsAppConfigured();

    const activeOrgs = await db
      .select({
        orgId: reminderSettings.orgId,
        orgName: organizations.name,
        orgPhone: organizations.phone,
        daysBefore: reminderSettings.reminderDaysBefore,
        onDueDate: reminderSettings.reminderOnDueDate,
        daysAfter: reminderSettings.reminderDaysAfter,
        template: reminderSettings.messageTemplate,
      })
      .from(reminderSettings)
      .innerJoin(organizations, eq(reminderSettings.orgId, organizations.id))
      .where(eq(reminderSettings.isActive, true));

    const results: { customer: string; phone: string | null; message: string; sent: boolean }[] = [];

    for (const org of activeOrgs) {
      const today = new Date();
      const beforeDate = new Date();
      beforeDate.setDate(today.getDate() + org.daysBefore);

      const afterDate = new Date();
      afterDate.setDate(today.getDate() - org.daysAfter);

      const dueInvoices = await db
        .select({
          invoiceNumber: invoices.invoiceNumber,
          customerName: customers.name,
          customerPhone: customers.phone,
          netAmount: invoices.netAmount,
          dueDate: invoices.dueDate,
        })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .where(
          and(
            eq(invoices.orgId, org.orgId),
            sql`${invoices.balanceAmount} > '0'`,
            sql`${invoices.status} NOT IN ('draft', 'cancelled', 'paid')`,
            sql`${invoices.dueDate} <= ${beforeDate}`,
            sql`${invoices.dueDate} >= ${afterDate}`
          )
        );

      for (const inv of dueInvoices) {
        const message = org.template
          .replace(/{customerName}/g, inv.customerName || "Customer")
          .replace(/{businessName}/g, org.orgName || "Business")
          .replace(/{invoiceNumber}/g, inv.invoiceNumber)
          .replace(/{amount}/g, inv.netAmount)
          .replace(/{dueDate}/g, inv.dueDate?.toLocaleDateString("en-PK") || "N/A");

        let sent = false;
        if (whatsappEnabled && inv.customerPhone) {
          const result = await sendTextMessage(inv.customerPhone, message);
          sent = result.success;
          if (!result.success) {
            captureException(result.error, { module: "payment-reminders", function: "GET", customerPhone: inv.customerPhone });
          }
        }

        results.push({
          customer: inv.customerName || "Unknown",
          phone: inv.customerPhone,
          message,
          sent,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      whatsappEnabled,
      messages: results,
    });
  } catch (err) {
    captureException(err, { module: "payment-reminders", function: "GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
