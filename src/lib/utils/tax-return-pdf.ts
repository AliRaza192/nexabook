import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPakistaniCurrency } from '@/lib/utils/number-format';

export interface TaxReturnPDFData {
  orgName: string;
  orgNtn: string | null;
  orgStrn: string | null;
  orgAddress: string | null;
  periodLabel: string;
  returnType: string;
  periodStart: string;
  periodEnd: string;
  totalSales: string;
  totalOutputTax: string;
  totalPurchases: string;
  totalInputTax: string;
  netPayable: string;
  status: string;
  generatedAt: Date;
}

export async function generateTaxReturnPDF(data: TaxReturnPDFData): Promise<Buffer> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Tax Return', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString('en-GB')} ${data.generatedAt.toLocaleTimeString('en-GB')}`, pageWidth / 2, 27, { align: 'center' });

  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageWidth - 14, 30);

  let y = 38;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Organization Details', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const orgLines = [
    `Name: ${data.orgName}`,
    `NTN: ${data.orgNtn || 'N/A'}`,
    `STRN: ${data.orgStrn || 'N/A'}`,
    `Address: ${data.orgAddress || 'N/A'}`,
  ];
  for (const line of orgLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  y += 3;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Return Period', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${data.periodLabel} (${data.returnType})`, 14, y);
  y += 5;
  doc.text(`From: ${new Date(data.periodStart).toLocaleDateString('en-GB')}`, 14, y);
  y += 5;
  doc.text(`To: ${new Date(data.periodEnd).toLocaleDateString('en-GB')}`, 14, y);
  y += 5;
  doc.text(`Status: ${data.status}`, 14, y);
  y += 8;

  const fmt = (val: string | number) => formatPakistaniCurrency(typeof val === 'string' ? parseFloat(val) : val);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount (PKR)']],
    body: [
      ['Total Sales (Excluding Tax)', fmt(data.totalSales)],
      ['Output Tax Collected', fmt(data.totalOutputTax)],
      ['Total Purchases (Excluding Tax)', fmt(data.totalPurchases)],
      ['Input Tax Paid', fmt(data.totalInputTax)],
    ],
    foot: [['Net Tax Payable', fmt(data.netPayable)]],
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || y + 60;

  if (parseFloat(data.netPayable) > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text(`Amount Payable: ${fmt(data.netPayable)}`, 14, finalY + 10);
    doc.setTextColor(0, 0, 0);
  } else if (parseFloat(data.netPayable) < 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 0);
    doc.text(`Refund Due: ${fmt(Math.abs(parseFloat(data.netPayable)))}`, 14, finalY + 10);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Tax Payable: Nil', 14, finalY + 10);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, finalY + 25, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
