import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { getInvoiceWithDetails } from '@/lib/actions/sales';
import { generateInvoiceEmailHTML, InvoiceEmailData } from '@/lib/utils/invoice-email-template';
import { formatPakistaniCurrency } from '@/lib/utils/number-format';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { invoiceId, customerEmail } = await request.json();

    if (!invoiceId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and customer email are required' },
        { status: 400 }
      );
    }

    // Fetch invoice details
    const invoiceResult = await getInvoiceWithDetails(invoiceId);
    if (!invoiceResult.success || !invoiceResult.data) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult.data;

    // Prepare email data
    const emailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      netAmount: invoice.netAmount,
      grossAmount: invoice.grossAmount,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      balanceAmount: invoice.balanceAmount,
      orgName: invoice.orgName,
      orgLogo: invoice.orgLogo,
      orgAddress: invoice.orgAddress,
      orgPhone: invoice.orgPhone,
      orgEmail: invoice.orgEmail,
      customerName: invoice.customerName,
      items: invoice.items,
      notes: invoice.notes,
    };

    // Generate HTML email
    const emailHtml = generateInvoiceEmailHTML(emailData);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${invoice.orgName} <onboarding@resend.dev>`, // Update with your verified domain
      to: [customerEmail],
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.orgName}`,
      html: emailHtml,
      headers: {
        'X-Entity-Ref': invoiceId,
      },
    });

    if (error) {
      console.error('Failed to send email:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email', details: error.message },
        { status: 500 }
      );
    }

    // Update invoice with email sent timestamp
    await db
      .update(invoices)
      .set({ emailSentAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    return NextResponse.json({
      success: true,
      message: 'Invoice email sent successfully',
      emailId: data?.id,
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
