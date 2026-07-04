export function formatInvoiceMessage(params: {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  orgName: string;
}): string {
  return (
    `Dear ${params.customerName},\n\n` +
    `Your Invoice *${params.invoiceNumber}* is ready.\n\n` +
    `Amount Due: *${params.amount}*\n` +
    `Due Date: *${params.dueDate}*\n\n` +
    `Please make payment at your earliest convenience.\n\n` +
    `Thank you for your business!\n` +
    `${params.orgName}`
  );
}

export function formatQuotationMessage(params: {
  customerName: string;
  quotationNumber: string;
  amount: string;
  expiryDate: string;
  orgName: string;
}): string {
  return (
    `Dear ${params.customerName},\n\n` +
    `Your Quotation *${params.quotationNumber}* is ready.\n\n` +
    `Total Amount: *${params.amount}*\n` +
    `Valid Until: *${params.expiryDate}*\n\n` +
    `Please review and let us know if you have any questions.\n\n` +
    `Thank you for your interest!\n` +
    `${params.orgName}`
  );
}

export function generateWhatsAppLink(
  phone: string | null | undefined,
  message: string
): string {
  const encodedMessage = encodeURIComponent(message);
  if (phone) {
    const cleaned = phone.replace(/[^0-9]/g, "");
    const formatted = cleaned.startsWith("92")
      ? cleaned
      : `92${cleaned.replace(/^0/, "")}`;
    return `https://wa.me/${formatted}?text=${encodedMessage}`;
  }
  return `https://wa.me/?text=${encodedMessage}`;
}

export function formatCurrencyForMessage(amount: string | number | null): string {
  if (!amount) return "N/A";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `PKR ${num.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}

export function formatDateForMessage(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const WHATSAPP_API_VERSION = "v22.0";

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

function getConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_PHONE_NUMBER_ID && !!process.env.WHATSAPP_ACCESS_TOKEN;
}

export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  templateParams: { header?: string; body: string[] }
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const cleaned = to.replace(/[^0-9]/g, "");
  const formattedPhone = cleaned.startsWith("92")
    ? cleaned
    : `92${cleaned.replace(/^0/, "")}`;

  try {
    const url = `https://graph.facebook.com/${config.apiVersion || WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            ...(templateParams.header
              ? [{ type: "header", parameters: [{ type: "text", text: templateParams.header }] }]
              : []),
            {
              type: "body",
              parameters: templateParams.body.map((p) => ({ type: "text", text: p })),
            },
          ],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || "WhatsApp API error" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendTextMessage(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const cleaned = to.replace(/[^0-9]/g, "");
  const formattedPhone = cleaned.startsWith("92")
    ? cleaned
    : `92${cleaned.replace(/^0/, "")}`;

  try {
    const url = `https://graph.facebook.com/${config.apiVersion || WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: true, body: message },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || "WhatsApp API error" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
