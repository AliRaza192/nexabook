import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPakistaniCurrency, formatAmountWords } from '@/lib/utils/number-format';
import { generateFBRQRCodeBuffer, isFBREligible, FBRQRData } from '@/lib/utils/fbr-qr';

export interface InvoicePDFData {
  // Organization details
  orgName: string;
  orgNtn: string | null;
  orgStrn: string | null;
  orgAddress: string | null;
  orgCity: string | null;
  orgCountry: string | null;
  orgPhone: string | null;
  orgEmail: string | null;
  orgLogo: string | null; // Base64 or URL
  
  // Invoice details
  invoiceNumber: string;
  invoiceSubject: string | null;
  invoiceReference: string | null;
  issueDate: Date;
  dueDate: Date | null;
  status: string;
  
  // Customer details
  customerName: string;
  customerNtn: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  customerPhone: string | null;
  
  // Line items
  items: {
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    discountPercentage: string;
    lineTotal: string;
    productName?: string;
  }[];
  
  // Financial summary
  grossAmount: string;
  discountAmount: string;
  discountPercentage: string;
  taxAmount: string;
  shippingCharges: string;
  roundOff: string;
  netAmount: string;
  
  // Payment
  receivedAmount: string;
  balanceAmount: string;
  
  // Additional
  notes: string | null;
  orderBooker: string | null;
}

// Type alias for jsPDF color
type Color = [number, number, number];

/**
 * Generate a professional invoice PDF using jsPDF
 */
export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Color scheme - using const assertion for proper typing
  const primary: Color = [37, 99, 235];
  const primaryDark: Color = [30, 64, 175];
  const primaryLight: Color = [219, 234, 254];
  const secondary: Color = [107, 114, 128];
  const text: Color = [17, 24, 39];
  const textLight: Color = [107, 114, 128];
  const border: Color = [229, 231, 235];
  const white: Color = [255, 255, 255];
  const highlight: Color = [243, 244, 246];

  // ==================== HEADER SECTION ====================
  // Company header background
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Company name (bold, white text on blue background)
  doc.setTextColor(...white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.orgName, margin, 18);

  // Company details in header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let headerY = 25;
  
  if (data.orgAddress) {
    doc.text(data.orgAddress, margin, headerY);
    headerY += 5;
  }
  
  const locationParts = [data.orgCity, data.orgCountry].filter(Boolean);
  if (locationParts.length > 0) {
    doc.text(locationParts.join(', '), margin, headerY);
    headerY += 5;
  }
  
  if (data.orgPhone) {
    doc.text(`Phone: ${data.orgPhone}`, margin, headerY);
    headerY += 5;
  }
  
  if (data.orgEmail) {
    doc.text(`Email: ${data.orgEmail}`, margin, headerY);
  }

  // NTN & STRN on the right side of header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const rightMargin = pageWidth - margin;
  let ntnY = 25;
  
  if (data.orgNtn) {
    doc.text(`NTN: ${data.orgNtn}`, rightMargin, ntnY, { align: 'right' });
    ntnY += 5;
  }
  
  if (data.orgStrn) {
    doc.text(`STRN: ${data.orgStrn}`, rightMargin, ntnY, { align: 'right' });
  }

  // Reset Y position after header
  y = 52;

  // ==================== INVOICE TITLE & DETAILS ====================
  // Invoice title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('INVOICE', margin, y);
  y += 10;

  // Invoice details grid
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...text);

  const invoiceDetails = [
    { label: 'Invoice #', value: data.invoiceNumber },
    { label: 'Issue Date', value: formatDate(data.issueDate) },
    { label: 'Due Date', value: data.dueDate ? formatDate(data.dueDate) : 'On Receipt' },
    { label: 'Status', value: capitalizeFirst(data.status) },
  ];

  if (data.invoiceReference) {
    invoiceDetails.push({ label: 'Reference', value: data.invoiceReference });
  }

  if (data.orderBooker) {
    invoiceDetails.push({ label: 'Order Booker', value: data.orderBooker });
  }

  // Display in 2-column grid
  const col1X = margin;
  const col2X = pageWidth / 2;
  let detailY = y;

  invoiceDetails.forEach((detail, index) => {
    const x = index % 2 === 0 ? col1X : col2X;
    if (index % 2 === 0 && index > 0) {
      detailY += 7;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textLight);
    doc.text(detail.label, x, detailY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...text);
    doc.text(detail.value, x + 35, detailY);
  });

  y = detailY + 10;

  // Draw separator line
  doc.setDrawColor(...border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ==================== BILL TO SECTION ====================
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('BILL TO', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...text);
  doc.text(data.customerName, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textLight);

  if (data.customerAddress) {
    doc.text(data.customerAddress, margin, y);
    y += 5;
  }

  const customerLocation = [data.customerCity].filter(Boolean);
  if (customerLocation.length > 0) {
    doc.text(customerLocation.join(', '), margin, y);
    y += 5;
  }

  if (data.customerPhone) {
    doc.text(`Phone: ${data.customerPhone}`, margin, y);
    y += 5;
  }

  if (data.customerNtn) {
    doc.text(`NTN: ${data.customerNtn}`, margin, y);
    y += 5;
  }

  y += 3;

  // ==================== LINE ITEMS TABLE ====================
  const tableColumn = ['#', 'Product / Description', 'Qty', 'Unit Price', 'Tax (%)', 'Amount'];
  const tableRows: string[][] = data.items.map((item, index) => [
    (index + 1).toString(),
    item.productName || item.description,
    formatNumber(item.quantity),
    formatPakistaniCurrency(parseFloat(item.unitPrice)),
    `${item.taxRate}%`,
    formatPakistaniCurrency(parseFloat(item.lineTotal)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primary,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: highlight,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 75 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 28 },
    },
  });

  // Get Y position after table
  y = (doc as any).lastAutoTable.finalY + 10;

  // ==================== CALCULATIONS SECTION ====================
  const calcBoxX = pageWidth - margin - 75;
  const calcBoxWidth = 75;
  let calcY = y;

  // Background box
  doc.setFillColor(...highlight);
  doc.roundedRect(calcBoxX, calcY, calcBoxWidth, 52, 2, 2, 'F');

  // Border
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(calcBoxX, calcY, calcBoxWidth, 52, 2, 2, 'S');

  const calculations = [
    { label: 'Subtotal', value: formatPakistaniCurrency(parseFloat(data.grossAmount)), bold: false },
    { label: 'Discount', value: `-${formatPakistaniCurrency(parseFloat(data.discountAmount))}`, bold: false },
    { label: 'Tax (GST)', value: formatPakistaniCurrency(parseFloat(data.taxAmount)), bold: false },
    { label: 'Shipping', value: formatPakistaniCurrency(parseFloat(data.shippingCharges)), bold: false },
  ];

  doc.setFontSize(9);
  calculations.forEach((calc, index) => {
    const rowY = calcY + 7 + (index * 9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textLight);
    doc.text(calc.label, calcBoxX + 5, rowY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...text);
    doc.text(calc.value, calcBoxX + calcBoxWidth - 5, rowY, { align: 'right' });
  });

  // Separator line
  const lineY = calcY + 7 + (calculations.length * 9) + 2;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(calcBoxX + 3, lineY, calcBoxX + calcBoxWidth - 3, lineY);

  // Net Total
  const totalY = lineY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('NET TOTAL', calcBoxX + 5, totalY);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(formatPakistaniCurrency(parseFloat(data.netAmount)), calcBoxX + calcBoxWidth - 5, totalY, { align: 'right' });

  // Payment info below calculations
  const received = parseFloat(data.receivedAmount);
  const balance = parseFloat(data.balanceAmount);

  if (received > 0) {
    const payY = totalY + 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textLight);
    doc.text('Amount Received:', calcBoxX + 5, payY);
    doc.setTextColor(...text);
    doc.text(formatPakistaniCurrency(received), calcBoxX + calcBoxWidth - 5, payY, { align: 'right' });
  }

  if (balance > 0) {
    const balY = totalY + (received > 0 ? 17 : 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68); // Red for balance due
    doc.text('Balance Due:', calcBoxX + 5, balY);
    doc.text(formatPakistaniCurrency(balance), calcBoxX + calcBoxWidth - 5, balY, { align: 'right' });
  }

  y = Math.max(y + 60, calcY + 65);

  // ==================== FBR QR CODE ====================
  // Check if organization has STRN for FBR compliance
  if (isFBREligible({ ntn: data.orgNtn, strn: data.orgStrn })) {
    try {
      // Generate FBR QR code
      const qrData: FBRQRData = {
        ntn: data.orgNtn!,
        strn: data.orgStrn!,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.issueDate,
        totalAmount: parseFloat(data.netAmount),
        taxAmount: parseFloat(data.taxAmount),
      };

      const qrBuffer = await generateFBRQRCodeBuffer(qrData, {
        size: 100,
        margin: 1,
      });

      // QR code dimensions and position (bottom right corner, near totals)
      const qrSize = 30; // mm
      const qrX = pageWidth - margin - qrSize;
      const qrY = Math.max(y - 10, totalY + 25);

      // Add QR code background box
      doc.setFillColor(...white);
      doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 12, 2, 2, 'F');
      
      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 12, 2, 2, 'S');

      // Add QR code image
            const qrArray = new Uint8Array(qrBuffer);
      let binary = '';
      qrArray.forEach(byte => binary += String.fromCharCode(byte));
      const qrImageDataUrl = 'data:image/png;base64,' + btoa(binary);
      doc.addImage(qrImageDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Add label below QR code
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textLight);
      doc.text('Verify at FBR Portal', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
    } catch (error) {
      console.error('Failed to generate FBR QR code:', error);
      // Continue without QR code if generation fails
    }
  }

  // ==================== AMOUNT IN WORDS ====================
  if (y > pageHeight - 50) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(...highlight);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 15, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('Amount in Words:', margin + 5, y + 6);

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...text);
  doc.setFontSize(9);
  doc.text(formatAmountWords(parseFloat(data.netAmount)), margin + 35, y + 6);

  y += 20;

  // ==================== NOTES ====================
  if (data.notes) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('Notes:', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textLight);

    // Split long notes into multiple lines
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - (margin * 2));
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5;
  }

  // ==================== FOOTER ====================
  const footerY = pageHeight - 20;

  // Separator line
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...textLight);
  doc.text('This is a computer-generated invoice.', pageWidth / 2, footerY + 7, { align: 'center' });
  
  // Page number
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, footerY + 7, { align: 'right' });
  
  // Generated by
  doc.text('Generated by NexaBook', margin, footerY + 7);

  // Generate PDF as blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Download PDF directly in browser
 */
export async function downloadInvoicePDF(data: InvoicePDFData, filename?: string): Promise<void> {
  const blob = await generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Invoice-${data.invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(num: string): string {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return num;
  
  // Format with Pakistani numbering if it has decimals
  if (parsed % 1 !== 0) {
    return parsed.toFixed(2);
  }
  
  return parsed.toLocaleString('en-PK');
}
