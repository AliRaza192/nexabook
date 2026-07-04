import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getInvoiceWithDetails } from '@/lib/actions/sales';
import {
  formatInvoiceMessage,
  sendTextMessage,
  isWhatsAppConfigured,
} from '@/lib/utils/whatsapp';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    await validateCsrf();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invoiceId, phoneNumber } = await request.json();

    if (!invoiceId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and phone number are required' },
        { status: 400 }
      );
    }

    const invoiceResult = await getInvoiceWithDetails(invoiceId);
    if (!invoiceResult.success || !invoiceResult.data) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult.data;

    const amount = invoice.netAmount
      ? `PKR ${parseFloat(invoice.netAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
      : "N/A";
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
      : "N/A";

    const message = formatInvoiceMessage({
      customerName: invoice.customerName,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      dueDate,
      orgName: invoice.orgName,
    });

    if (isWhatsAppConfigured()) {
      const result = await sendTextMessage(phoneNumber, message);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to send WhatsApp message' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Invoice sent via WhatsApp successfully',
        method: 'api',
      });
    }

    const encoded = encodeURIComponent(message);
    const cleaned = phoneNumber.replace(/[^0-9]/g, "");
    const formatted = cleaned.startsWith("92")
      ? cleaned
      : `92${cleaned.replace(/^0/, "")}`;
    const waLink = `https://wa.me/${formatted}?text=${encoded}`;

    return NextResponse.json({
      success: true,
      message: 'WhatsApp link generated',
      method: 'link',
      waLink,
    });
  } catch (error) {
    console.error('Error sending invoice WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
