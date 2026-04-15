import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  
  const earningsBody: any[][] = [
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
  
  const deductionsBody: any[][] = [
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
export function downloadPayslip(payslip: any, employee: any, companyName: string, companyAddress: string, period: string) {
  const data: PayslipData = {
    companyName,
    companyAddress,
    period,
    generatedDate: new Date().toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    
    employeeName: employee?.fullName || payslip.employeeName || '',
    employeeCode: employee?.employeeCode || payslip.employeeCode || '',
    designation: employee?.designation || payslip.designation || '',
    department: employee?.department || payslip.department || '',
    cnic: employee?.cnic || payslip.cnic || '',
    employeeId: payslip.id || '',
    bankName: employee?.bankName || payslip.bankName || '',
    accountNumber: employee?.accountNumber || payslip.accountNumber || '',
    
    basicSalary: parseFloat(payslip.basicSalary || '0'),
    houseRent: parseFloat(payslip.houseRent || '0'),
    medicalAllowance: parseFloat(payslip.medicalAllowance || '0'),
    conveyanceAllowance: parseFloat(payslip.conveyanceAllowance || '0'),
    otherAllowances: parseFloat(payslip.otherAllowances || '0'),
    overtimePay: parseFloat(payslip.overtimePay || '0'),
    bonus: parseFloat(payslip.bonus || '0'),
    
    eobiDeduction: parseFloat(payslip.eobiDeduction || '0'),
    incomeTax: parseFloat(payslip.incomeTax || '0'),
    providentFund: parseFloat(payslip.providentFund || '0'),
    otherDeductions: parseFloat(payslip.otherDeductions || '0'),
    unpaidLeaveDeduction: parseFloat(payslip.unpaidLeaveDeduction || '0'),
    
    totalEarnings: parseFloat(payslip.totalEarnings || '0'),
    totalDeductions: parseFloat(payslip.totalDeductions || '0'),
    netSalary: parseFloat(payslip.netSalary || '0'),
    
    presentDays: parseInt(payslip.presentDays || '0'),
    absentDays: parseInt(payslip.absentDays || '0'),
    leaveDays: parseInt(payslip.leaveDays || '0'),
    unpaidLeaveDays: parseInt(payslip.unpaidLeaveDays || '0'),
    totalWorkingDays: parseInt(payslip.totalWorkingDays || '0'),
  };
  
  const fileName = `Payslip-${data.employeeCode}-${period.replace(/\s+/g, '-')}.pdf`;
  generatePayslipPDF(data, fileName);
}
