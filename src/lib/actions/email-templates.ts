"use server";

import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

const DEFAULT_INVOICE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.header{background:#1e293b;color:#fff;padding:24px;text-align:center}
.header h1{margin:0;font-size:22px}
.content{padding:24px}
.invoice-table{width:100%;border-collapse:collapse;margin:16px 0}
.invoice-table th,.invoice-table td{padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}
.invoice-table th{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#64748b}
.footer{text-align:center;padding:16px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0}
.btn{display:inline-block;padding:10px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0}
</style></head>
<body>
<div class="container">
<div class="header"><h1>{businessName}</h1><p style="margin:4px 0 0;opacity:0.8">Invoice #{invoiceNumber}</p></div>
<div class="content">
<p>Assalam-o-Alaikum <strong>{customerName}</strong>,</p>
<p>Your invoice <strong>#{invoiceNumber}</strong> of <strong>Rs. {amount}</strong> is due on <strong>{dueDate}</strong>.</p>
<p style="text-align:center"><a href="{paymentLink}" class="btn">Pay Now</a></p>
<table class="invoice-table"><tr><th>Description</th><th>Qty</th><th>Amount</th></tr>
{items}
<tr><td colspan="2" style="text-align:right"><strong>Total</strong></td><td><strong>Rs. {amount}</strong></td></tr>
</table>
{notes}
</div>
<div class="footer"><p>{businessName} — {businessPhone} | {businessEmail}</p></div>
</div>
</body>
</html>`;

const DEFAULT_QUOTATION_HTML = DEFAULT_INVOICE_HTML.replace("Invoice #{invoiceNumber}", "Quotation #{quoteNumber}").replace("due on", "valid until");

export async function getEmailTemplate(templateType: string = "invoice") {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(eq(emailTemplates.orgId, orgId), eq(emailTemplates.templateType, templateType))
      )
      .limit(1);

    if (!template) {
      return {
        success: true,
        data: {
          subject: templateType === "invoice"
            ? "Invoice #{invoiceNumber} from {businessName}"
            : "Quotation #{quoteNumber} from {businessName}",
          bodyHtml: templateType === "invoice" ? DEFAULT_INVOICE_HTML : DEFAULT_QUOTATION_HTML,
          templateType,
        },
      };
    }

    return { success: true, data: template };
  } catch (error) {
    return { success: false, error: "Failed to load template" };
  }
}

export async function saveEmailTemplate(data: {
  templateType: string;
  subject: string;
  bodyHtml: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(
        and(eq(emailTemplates.orgId, orgId), eq(emailTemplates.templateType, data.templateType))
      )
      .limit(1);

    if (existing) {
      await db
        .update(emailTemplates)
        .set({ subject: data.subject, bodyHtml: data.bodyHtml, updatedAt: new Date() })
        .where(eq(emailTemplates.id, existing.id));
    } else {
      await db.insert(emailTemplates).values({
        orgId, templateType: data.templateType,
        subject: data.subject, bodyHtml: data.bodyHtml,
      });
    }

    revalidatePath("/settings/email-templates");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save template" };
  }
}
