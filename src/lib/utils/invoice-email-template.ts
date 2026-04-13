import { formatPakistaniCurrency } from '@/lib/utils/number-format';

export interface InvoiceEmailData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  netAmount: string;
  grossAmount: string;
  taxAmount: string;
  discountAmount: string;
  balanceAmount: string;
  orgName: string;
  orgLogo: string | null;
  orgAddress: string | null;
  orgPhone: string | null;
  orgEmail: string | null;
  customerName: string;
  items: {
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    productName?: string;
  }[];
  notes: string | null;
}

/**
 * Generate professional HTML email template for invoices
 */
export function generateInvoiceEmailHTML(data: InvoiceEmailData): string {
  const formatDate = (date: Date | null) => {
    if (!date) return 'On Receipt';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, #bodyTable { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; }
    
    /* Client-specific styles */
    #outlook a { padding: 0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      table.center-on-narrow { display: inline-block !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Invoice ${data.invoiceNumber} from ${data.orgName} for ${formatPakistaniCurrency(parseFloat(data.netAmount))}
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: auto;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="color: #ffffff; font-size: 28px; font-weight: bold;">
                    ${data.orgLogo ? `<img src="${data.orgLogo}" alt="${data.orgName}" width="50" style="display: inline-block; vertical-align: middle; margin-right: 15px; border-radius: 4px;" />` : ''}
                    ${data.orgName}
                  </td>
                </tr>
                ${data.orgAddress || data.orgPhone ? `
                <tr>
                  <td style="color: #dbeafe; font-size: 13px; padding-top: 10px;">
                    ${data.orgAddress ? `<div>${data.orgAddress}</div>` : ''}
                    ${data.orgPhone ? `<div>Phone: ${data.orgPhone}</div>` : ''}
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Invoice Title -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 40px 20px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 24px; font-weight: bold; color: #2563eb; padding-bottom: 20px;">
                    INVOICE
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: #111827;">
                    Dear <strong>${data.customerName}</strong>,
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 15px; color: #6b7280; padding-top: 15px; line-height: 1.6;">
                    Your invoice <strong style="color: #2563eb;">#${data.invoiceNumber}</strong> for <strong style="color: #111827;">${formatPakistaniCurrency(parseFloat(data.netAmount))}</strong> is ready. Please review the details below:
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Details Grid -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 20px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 15px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;"><strong>Invoice #:</strong> ${data.invoiceNumber}</td>
                        <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;"><strong>Issue Date:</strong> ${formatDate(data.issueDate)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6b7280;"><strong>Due Date:</strong> ${formatDate(data.dueDate)}</td>
                        <td style="font-size: 13px; color: #6b7280;"><strong>Status:</strong> Pending</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 6px;">
                <!-- Table Header -->
                <tr style="background-color: #2563eb;">
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #ffffff;">#</td>
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #ffffff;">Description</td>
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #ffffff; text-align: center;">Qty</td>
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #ffffff; text-align: right;">Unit Price</td>
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #ffffff; text-align: right;">Amount</td>
                </tr>
                <!-- Table Rows -->
                ${data.items.map((item, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                  <td style="padding: 12px 15px; font-size: 13px; color: #6b7280; text-align: center;">${index + 1}</td>
                  <td style="padding: 12px 15px; font-size: 13px; color: #111827;">${item.productName || item.description}</td>
                  <td style="padding: 12px 15px; font-size: 13px; color: #6b7280; text-align: center;">${item.quantity}</td>
                  <td style="padding: 12px 15px; font-size: 13px; color: #6b7280; text-align: right;">${formatPakistaniCurrency(parseFloat(item.unitPrice))}</td>
                  <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${formatPakistaniCurrency(parseFloat(item.lineTotal))}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          <!-- Summary Section -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #2563eb;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; color: #6b7280; padding-bottom: 10px;">Subtotal</td>
                        <td style="font-size: 14px; color: #111827; text-align: right; padding-bottom: 10px;">${formatPakistaniCurrency(parseFloat(data.grossAmount))}</td>
                      </tr>
                      ${parseFloat(data.discountAmount) > 0 ? `
                      <tr>
                        <td style="font-size: 14px; color: #6b7280; padding-bottom: 10px;">Discount</td>
                        <td style="font-size: 14px; color: #ef4444; text-align: right; padding-bottom: 10px;">-${formatPakistaniCurrency(parseFloat(data.discountAmount))}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="font-size: 14px; color: #6b7280; padding-bottom: 10px;">Tax (GST)</td>
                        <td style="font-size: 14px; color: #111827; text-align: right; padding-bottom: 10px;">${formatPakistaniCurrency(parseFloat(data.taxAmount))}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="font-size: 18px; font-weight: bold; color: #2563eb; padding-top: 15px;">NET TOTAL</td>
                        <td style="font-size: 18px; font-weight: bold; color: #2563eb; text-align: right; padding-top: 15px;">${formatPakistaniCurrency(parseFloat(data.netAmount))}</td>
                      </tr>
                      ${parseFloat(data.balanceAmount) > 0 ? `
                      <tr>
                        <td style="font-size: 14px; font-weight: 600; color: #ef4444; padding-top: 10px;">Balance Due</td>
                        <td style="font-size: 14px; font-weight: 600; color: #ef4444; text-align: right; padding-top: 10px;">${formatPakistaniCurrency(parseFloat(data.balanceAmount))}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border-radius: 6px; border: 2px solid #2563eb;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 16px; font-weight: 600; color: #2563eb; padding-bottom: 10px;">
                          💳 Payment Instructions
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #1e40af; line-height: 1.6;">
                          Please pay to the bank details below:<br />
                          <strong>Bank:</strong> [Your Bank Name]<br />
                          <strong>Account:</strong> [Your Account Number]<br />
                          <strong>IBAN:</strong> [Your IBAN]
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notes Section -->
          ${data.notes ? `
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 14px; font-weight: 600; color: #111827; padding-bottom: 8px;">Notes:</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #6b7280; line-height: 1.6; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                    ${data.notes}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 30px 40px; border-radius: 0 0 8px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; font-size: 14px; color: #9ca3af; padding-bottom: 10px;">
                    <strong style="color: #ffffff;">${data.orgName}</strong>
                  </td>
                </tr>
                ${data.orgEmail ? `
                <tr>
                  <td style="text-align: center; font-size: 13px; color: #9ca3af;">
                    ${data.orgEmail}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="text-align: center; font-size: 12px; color: #6b7280; padding-top: 15px; border-top: 1px solid #374151;">
                    This is a computer-generated invoice from <strong style="color: #2563eb;">NexaBook</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Email Container -->
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
