import jsPDF from 'jspdf';
import autoTable, { type FontStyle } from 'jspdf-autotable';
import { formatPKR, formatAmountWords } from '@/lib/utils/number-format';

export interface PayslipData {
  companyName: string;
  companyAddress: string;
  companyLogo?: string;
  period: string; // e.g., "April 2026"
  generatedDate: string;
  
  // Employee Info
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  cnic: string;
  employeeId: string;
  bankName?: string;
  accountNumber?: string;
  
  // Earnings
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  bonus: number;
  
  // Deductions
  eobiDeduction: number;
  incomeTax: number;
  providentFund: number;
  otherDeductions: number;
  unpaidLeaveDeduction: number;
  
  // Totals
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  
  // Attendance
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  totalWorkingDays: number;
}

/**
 * Generate a professional payslip PDF
 */
export function generatePayslipPDF(data: PayslipData, fileName?: string): void {
  const doc = new jsPDF();
  
  // Colors - NexaBook theme
  const nexaBlue: [number, number, number] = [15, 23, 42]; // #0F172A
  const darkGray: [number, number, number] = [51, 65, 85]; // #334155
  const mediumGray: [number, number, number] = [100, 116, 139]; // #64748B
  const lightGray: [number, number, number] = [241, 245, 249]; // #F1F5F9
  const white: [number, number, number] = [255, 255, 255];
  const green: [number, number, number] = [22, 101, 52]; // #166534
  
  let yPos = 15;
  
  // ==========================================
  // HEADER SECTION
  // ==========================================
  
  // Company Name (Large, Bold)
  doc.setFontSize(22);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, 105, yPos, { align: 'center' });
  yPos += 8;
  
  // Company Address
  doc.setFontSize(10);
  doc.setTextColor(...mediumGray);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyAddress, 105, yPos, { align: 'center' });
  yPos += 6;
  
  // Divider Line
  doc.setDrawColor(...nexaBlue);
  doc.setLineWidth(1.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 10;
  
  // ==========================================
  // PAYSLIP TITLE & PERIOD
  // ==========================================
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, yPos, { align: 'center' });
  yPos += 7;
  
  // Period
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay Period: ${data.period}`, 105, yPos, { align: 'center' });
  yPos += 6;
  
  // Generated Date
  doc.setFontSize(9);
  doc.setTextColor(...mediumGray);
  doc.text(`Generated on: ${data.generatedDate}`, 105, yPos, { align: 'center' });
  yPos += 10;
  
  // ==========================================
  // EMPLOYEE INFORMATION
  // ==========================================
  
  doc.setFontSize(12);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 15, yPos);
  yPos += 2;
  
  doc.setDrawColor(...nexaBlue);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;
  
  // Employee Details Table
  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: darkGray,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: nexaBlue,
      textColor: white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 },
    },
    body: [
      ['Employee Name', data.employeeName],
      ['Employee ID', data.employeeCode],
      ['Designation', data.designation],
      ['Department', data.department],
      ['CNIC', data.cnic],
      ['Bank', data.bankName || 'N/A'],
      ['Account Number', data.accountNumber || 'N/A'],
    ],
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ==========================================
  // ATTENDANCE SUMMARY
  // ==========================================
  
  doc.setFontSize(12);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', 15, yPos);
  yPos += 2;
  doc.setDrawColor(...nexaBlue);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      textColor: darkGray,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: nexaBlue,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    body: [
      [
        { content: 'Total Days', styles: { fontStyle: 'bold' } },
        { content: 'Present', styles: { fontStyle: 'bold' } },
        { content: 'Absent', styles: { fontStyle: 'bold' } },
        { content: 'Leave', styles: { fontStyle: 'bold' } },
        { content: 'Unpaid Leave', styles: { fontStyle: 'bold' } },
      ],
      [
        data.totalWorkingDays.toString(),
        data.presentDays.toString(),
        data.absentDays.toString(),
        data.leaveDays.toString(),
        data.unpaidLeaveDays.toString(),
      ],
    ],
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ==========================================
  // EARNINGS TABLE
  // ==========================================
  
  doc.setFontSize(12);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', 15, yPos);
  yPos += 2;
  doc.setDrawColor(...nexaBlue);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;
  
  type PdfCell = string | number | { content: string; styles: { fontStyle: FontStyle; textColor: [number, number, number] } };
  const earningsBody: PdfCell[][] = [
    ['Basic Salary', formatPKR(data.basicSalary, 'south-asian')],
    ['House Rent', formatPKR(data.houseRent, 'south-asian')],
    ['Medical Allowance', formatPKR(data.medicalAllowance, 'south-asian')],
    ['Conveyance Allowance', formatPKR(data.conveyanceAllowance, 'south-asian')],
  ];
  
  if (data.otherAllowances > 0) {
    earningsBody.push(['Other Allowances', formatPKR(data.otherAllowances, 'south-asian')]);
  }
  if (data.overtimePay > 0) {
    earningsBody.push(['Overtime Pay', formatPKR(data.overtimePay, 'south-asian')]);
  }
  if (data.bonus > 0) {
    earningsBody.push(['Bonus', formatPKR(data.bonus, 'south-asian')]);
  }
  
  // Total Earnings Row
  earningsBody.push([
    { content: 'Total Earnings', styles: { fontStyle: 'bold', textColor: nexaBlue } },
    { content: formatPKR(data.totalEarnings, 'south-asian'), styles: { fontStyle: 'bold', textColor: nexaBlue } },
  ]);
  
  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: darkGray,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: nexaBlue,
      textColor: white,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    body: earningsBody,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ==========================================
  // DEDUCTIONS TABLE
  // ==========================================
  
  doc.setFontSize(12);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', 15, yPos);
  yPos += 2;
  doc.setDrawColor(...nexaBlue);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;
  
  const deductionsBody: PdfCell[][] = [
    ['EOBI Deduction', formatPKR(data.eobiDeduction, 'south-asian')],
    ['Income Tax', formatPKR(data.incomeTax, 'south-asian')],
  ];
  
  if (data.providentFund > 0) {
    deductionsBody.push(['Provident Fund', formatPKR(data.providentFund, 'south-asian')]);
  }
  if (data.otherDeductions > 0) {
    deductionsBody.push(['Other Deductions', formatPKR(data.otherDeductions, 'south-asian')]);
  }
  if (data.unpaidLeaveDeduction > 0) {
    deductionsBody.push([
      'Unpaid Leave Deduction',
      formatPKR(data.unpaidLeaveDeduction, 'south-asian')
    ]);
  }
  
  // Total Deductions Row
  deductionsBody.push([
    { content: 'Total Deductions', styles: { fontStyle: 'bold', textColor: nexaBlue } },
    { content: formatPKR(data.totalDeductions, 'south-asian'), styles: { fontStyle: 'bold', textColor: nexaBlue } },
  ]);
  
  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: darkGray,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: nexaBlue,
      textColor: white,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    body: deductionsBody,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // ==========================================
  // NET PAYABLE (Prominent Display)
  // ==========================================
  
  // Background Box
  doc.setFillColor(...nexaBlue);
  doc.roundedRect(15, yPos, 180, 25, 2, 2, 'F');
  
  // NET PAYABLE Text
  doc.setFontSize(11);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAYABLE', 105, yPos + 9, { align: 'center' });
  
  // Amount
  doc.setFontSize(20);
  doc.text(formatPKR(data.netSalary, 'south-asian'), 105, yPos + 20, { align: 'center' });
  
  yPos += 32;
  
  // ==========================================
  // AMOUNT IN WORDS
  // ==========================================
  
  doc.setFontSize(10);
  doc.setTextColor(...nexaBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', 15, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  const amountInWords = formatAmountWords(data.netSalary);
  doc.text(amountInWords, 15, yPos);
  
  yPos += 15;
  
  // ==========================================
  // FOOTER - SIGNATURES
  // ==========================================
  
  // Divider Line
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 15;
  
  // Signature Lines
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  
  // Employer Signature
  doc.text('_________________________', 30, yPos);
  yPos += 6;
  doc.text('Employer Signature', 30, yPos);
  
  // Employee Signature
  doc.text('_________________________', 130, yPos - 6);
  yPos += 6;
  doc.text('Employee Signature', 130, yPos);
  
  yPos += 15;
  
  // ==========================================
  // PAGE FOOTER
  // ==========================================
  
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(...mediumGray);
  doc.text('This is a system-generated payslip. No signature required.', 105, pageHeight - 10, { align: 'center' });
  
  // ==========================================
  // SAVE PDF
  // ==========================================
  
  const defaultFileName = `Payslip-${data.employeeCode}-${data.period.replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName || defaultFileName);
}

/**
 * Helper: Convert payslip data to PDF format
 */
export function downloadPayslip(payslip: Record<string, unknown>, employee: Record<string, unknown>, companyName: string, companyAddress: string, period: string) {
  const s = (v: unknown): string => String(v ?? '');
  const n = (v: unknown): number => parseFloat(String(v ?? '0'));
  const i = (v: unknown): number => parseInt(String(v ?? '0'), 10);

  const data: PayslipData = {
    companyName,
    companyAddress,
    period,
    generatedDate: new Date().toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    
    employeeName: s(employee?.fullName) || s(payslip.employeeName) || '',
    employeeCode: s(employee?.employeeCode) || s(payslip.employeeCode) || '',
    designation: s(employee?.designation) || s(payslip.designation) || '',
    department: s(employee?.department) || s(payslip.department) || '',
    cnic: s(employee?.cnic) || s(payslip.cnic) || '',
    employeeId: s(payslip.id) || '',
    bankName: s(employee?.bankName) || s(payslip.bankName) || '',
    accountNumber: s(employee?.accountNumber) || s(payslip.accountNumber) || '',
    
    basicSalary: n(payslip.basicSalary),
    houseRent: n(payslip.houseRent),
    medicalAllowance: n(payslip.medicalAllowance),
    conveyanceAllowance: n(payslip.conveyanceAllowance),
    otherAllowances: n(payslip.otherAllowances),
    overtimePay: n(payslip.overtimePay),
    bonus: n(payslip.bonus),
    
    eobiDeduction: n(payslip.eobiDeduction),
    incomeTax: n(payslip.incomeTax),
    providentFund: n(payslip.providentFund),
    otherDeductions: n(payslip.otherDeductions),
    unpaidLeaveDeduction: n(payslip.unpaidLeaveDeduction),
    
    totalEarnings: n(payslip.totalEarnings),
    totalDeductions: n(payslip.totalDeductions),
    netSalary: n(payslip.netSalary),
    
    presentDays: i(payslip.presentDays),
    absentDays: i(payslip.absentDays),
    leaveDays: i(payslip.leaveDays),
    unpaidLeaveDays: i(payslip.unpaidLeaveDays),
    totalWorkingDays: i(payslip.totalWorkingDays),
  };
  
  const fileName = `Payslip-${data.employeeCode}-${period.replace(/\s+/g, '-')}.pdf`;
  generatePayslipPDF(data, fileName);
}
