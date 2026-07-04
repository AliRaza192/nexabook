import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPKR } from '@/lib/utils/number-format';

type Color = [number, number, number];

export interface WHTCertificateData {
  org: { name: string; ntn: string | null; strn: string | null; address: string | null } | null;
  vendor: { name: string; ntn: string | null; strn: string | null; address: string | null };
  dateFrom: string;
  dateTo: string;
  totalAmount: number;
  totalWHT: number;
  transactions: {
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
    whtAmount: number;
    whtRate: number;
    reference: string;
  }[];
}

export async function generateWHTCertificatePDF(data: WHTCertificateData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const primary: Color = [37, 99, 235];
  const text: Color = [17, 24, 39];
  const textLight: Color = [107, 114, 128];
  const white: Color = [255, 255, 255];
  const border: Color = [229, 231, 235];

  // Blue header bar
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(...white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('WITHHOLDING TAX CERTIFICATE', margin, 14, { align: 'left' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Certificate Generated: ${new Date().toLocaleDateString('en-PK')}`, margin, 22);

  const quarterLabel = getQuarterLabel(data.dateFrom, data.dateTo);
  doc.setFont('helvetica', 'bold');
  doc.text(`Period: ${quarterLabel}`, margin, 30);

  y = 50;

  // Tax year header
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...text);
  doc.text('SECTION 153 - WITHHOLDING TAX DEDUCTION STATEMENT', margin, y);
  y += 10;

  // Organization info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductor (Company):', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  const orgInfo = [
    `Name: ${data.org?.name || 'N/A'}`,
    `NTN: ${data.org?.ntn || 'N/A'}`,
    `STRN: ${data.org?.strn || 'N/A'}`,
    `Address: ${data.org?.address || 'N/A'}`,
  ];
  doc.setFontSize(9);
  orgInfo.forEach((line) => {
    doc.text(line, margin + 5, y);
    y += 5;
  });

  y += 4;

  // Vendor info
  doc.setFont('helvetica', 'bold');
  doc.text('Deductee (Vendor/Supplier):', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  const vendorInfo = [
    `Name: ${data.vendor.name}`,
    `NTN: ${data.vendor.ntn || 'N/A'}`,
    `STRN: ${data.vendor.strn || 'N/A'}`,
    `Address: ${data.vendor.address || 'N/A'}`,
  ];
  doc.setFontSize(9);
  vendorInfo.forEach((line) => {
    doc.text(line, margin + 5, y);
    y += 5;
  });

  y += 6;

  // Summary statement
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF TAX DEDUCTION', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryText = [
    `This is to certify that the following amounts have been deducted as Withholding Tax under Section 153 of the Income Tax Ordinance, 2001, from payments made to ${data.vendor.name} during the period ${quarterLabel}.`,
  ];
  summaryText.forEach((line) => {
    doc.text(line, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 6;
  });

  y += 4;

  // Transactions table
  autoTable(doc, {
    startY: y,
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'Voucher',
      { content: 'Date', styles: { halign: 'center' } },
      { content: 'Reference', styles: { halign: 'center' } },
      { content: 'Payment Amount (Rs.)', styles: { halign: 'right' } },
      { content: 'Rate (%)', styles: { halign: 'center' } },
      { content: 'WHT Amount (Rs.)', styles: { halign: 'right' } },
    ]],
    body: data.transactions.map((t, i) => [
      { content: String(i + 1), styles: { halign: 'center' } },
      t.paymentNumber,
      { content: new Date(t.paymentDate).toLocaleDateString('en-PK'), styles: { halign: 'center' } },
      { content: t.reference || '-', styles: { halign: 'center' } },
      { content: formatPKR(t.amount, 'south-asian'), styles: { halign: 'right' } },
      { content: `${t.whtRate}%`, styles: { halign: 'center' } },
      { content: formatPKR(t.whtAmount, 'south-asian'), styles: { halign: 'right' } },
    ]),
    foot: [[
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
      { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatPKR(data.totalAmount, 'south-asian'), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: { halign: 'center' } },
      { content: formatPKR(data.totalWHT, 'south-asian'), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [...primary] as Color,
      textColor: [...white] as Color,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    footStyles: { fontSize: 8, fillColor: [243, 244, 246] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 18 },
      6: { cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Rupees ${numberToWords(data.totalWHT)} Only`, margin + 5, y);
  y += 10;

  // Declaration
  doc.setDrawColor(...border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARATION', margin, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const declaration = [
    'I/We hereby declare that the above particulars are correct and complete. The tax deducted has been deposited with the Government Treasury.',
    '',
    'This certificate is issued in accordance with the provisions of Section 153 of the Income Tax Ordinance, 2001.',
  ];
  declaration.forEach((line) => {
    doc.text(line, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 5;
  });

  y += 10;

  // Signatures
  const sigY = y;
  doc.setFontSize(9);
  doc.line(margin, sigY, margin + 50, sigY);
  doc.text('Authorized Signatory', margin, sigY + 5);

  doc.line(pageWidth - margin - 50, sigY, pageWidth - margin, sigY);
  doc.text('Date', pageWidth - margin - 50, sigY + 5);
  doc.text(new Date().toLocaleDateString('en-PK'), pageWidth - margin - 50, sigY + 10, { align: 'left' });

  // Footer
  y = 275;
  doc.setFontSize(7);
  doc.setTextColor(...textLight);
  doc.text(`Generated by NexaBook ERP — This is a computer-generated certificate.`, margin, y, { align: 'left' });
  doc.text(`Page 1 of 1`, pageWidth - margin, y, { align: 'right' });

  return doc.output('blob');
}

function getQuarterLabel(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const fromStr = from.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
  const toStr = to.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
  const fromMonth = from.getMonth();
  const toMonth = to.getMonth();

  if (fromMonth === 0 && toMonth === 2) return `Q1 (Jan-Mar ${from.getFullYear()}) - ${fromStr} to ${toStr}`;
  if (fromMonth === 3 && toMonth === 5) return `Q2 (Apr-Jun ${from.getFullYear()}) - ${fromStr} to ${toStr}`;
  if (fromMonth === 6 && toMonth === 8) return `Q3 (Jul-Sep ${from.getFullYear()}) - ${fromStr} to ${toStr}`;
  if (fromMonth === 9 && toMonth === 11) return `Q4 (Oct-Dec ${from.getFullYear()}) - ${fromStr} to ${toStr}`;
  return `${fromStr} to ${toStr}`;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const crores = (n: number): string => n > 0 ? `${convertBelowThousand(n)} Crore ` : '';
  const lakhs = (n: number): string => n > 0 ? `${convertBelowThousand(n)} Lakh ` : '';
  const thousands = (n: number): string => n > 0 ? `${convertBelowThousand(n)} Thousand ` : '';
  const hundreds = (n: number): string => n > 0 ? `${convertBelowThousand(n)} Hundred ` : '';
  const belowThousand = (n: number): string => convertBelowThousand(n);

  function convertBelowThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
    return `${ones[Math.floor(n / 100)]} Hundred ${convertBelowThousand(n % 100)}`.trim();
  }

  const whole = Math.floor(num);
  const fraction = Math.round((num - whole) * 100);

  const c = Math.floor(whole / 10000000);
  const l = Math.floor((whole % 10000000) / 100000);
  const t = Math.floor((whole % 100000) / 1000);
  const h = Math.floor((whole % 1000) / 100);
  const rest = whole % 100;

  let result = `${crores(c)}${lakhs(l)}${thousands(t)}${hundreds(h)}${belowThousand(rest)}`.trim();
  if (fraction > 0) {
    result += ` and ${fraction}/100`;
  }
  return result;
}
