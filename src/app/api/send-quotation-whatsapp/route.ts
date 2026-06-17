import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  formatQuotationMessage,
  sendTextMessage,
  isWhatsAppConfigured,
} from '@/lib/utils/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quotationId, phoneNumber, customerName, quotationNumber, netAmount, expiryDate, orgName } = await request.json();

    if (!quotationId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Quotation ID and phone number are required' },
        { status: 400 }
      );
    }

    const amount = netAmount
      ? `PKR ${parseFloat(netAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
      : "N/A";
    const validUntil = expiryDate
      ? new Date(expiryDate).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
      : "N/A";

    const message = formatQuotationMessage({
      customerName: customerName || "Customer",
      quotationNumber: quotationNumber || "N/A",
      amount,
      expiryDate: validUntil,
      orgName: orgName || "Business",
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
        message: 'Quotation sent via WhatsApp successfully',
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
    console.error('Error sending quotation via WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
