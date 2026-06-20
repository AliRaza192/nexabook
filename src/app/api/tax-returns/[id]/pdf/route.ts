import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { salesTaxReturns, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateTaxReturnPDF } from '@/lib/utils/tax-return-pdf';
import { getCurrentOrgId } from '@/lib/actions/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const [taxReturn] = await db
      .select()
      .from(salesTaxReturns)
      .where(and(
        eq(salesTaxReturns.id, id),
        eq(salesTaxReturns.orgId, orgId)
      ))
      .limit(1);

    if (!taxReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const pdfBuffer = await generateTaxReturnPDF({
      orgName: org?.name || 'Organization',
      orgNtn: org?.ntn || null,
      orgStrn: org?.strn || null,
      orgAddress: org?.address || null,
      periodLabel: taxReturn.periodLabel,
      returnType: taxReturn.returnType,
      periodStart: taxReturn.periodStart.toISOString(),
      periodEnd: taxReturn.periodEnd.toISOString(),
      totalSales: taxReturn.totalSales,
      totalOutputTax: taxReturn.totalOutputTax,
      totalPurchases: taxReturn.totalPurchases,
      totalInputTax: taxReturn.totalInputTax,
      netPayable: taxReturn.netPayable,
      status: taxReturn.status,
      generatedAt: new Date(),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tax-return-${taxReturn.periodLabel}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
