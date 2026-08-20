/**
 * Invoice OCR Accuracy Evaluation Suite
 *
 * Tests the OCR system's ability to correctly extract data
 * from invoice images.
 */

import { EvalCase } from "../framework/runner";

interface OcrExpected {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  lineItemCount?: number;
}

export const ocrExtractionCases: EvalCase[] = [
  // Standard Pakistani Invoice
  {
    id: "ocr-standard-1",
    input: {
      imagePath: "test-data/invoices/standard-pakistani-invoice.jpg",
    },
    expected: {
      vendorName: "ABC Trading Co.",
      invoiceNumber: "INV-2026-001",
      subtotal: 100000,
      taxAmount: 17000,
      totalAmount: 117000,
    } as OcrExpected,
    tags: ["ocr", "standard"],
    description: "Standard Pakistani invoice with GST",
  },

  // Invoice without tax
  {
    id: "ocr-no-tax-1",
    input: {
      imagePath: "test-data/invoices/exempt-invoice.jpg",
    },
    expected: {
      subtotal: 50000,
      taxAmount: 0,
      totalAmount: 50000,
    } as OcrExpected,
    tags: ["ocr", "exempt"],
    description: "Tax-exempt invoice",
  },

  // Multi-line Invoice
  {
    id: "ocr-multi-line-1",
    input: {
      imagePath: "test-data/invoices/multi-line-invoice.jpg",
    },
    expected: {
      lineItemCount: 5,
      subtotal: 250000,
      taxAmount: 42500,
      totalAmount: 292500,
    } as OcrExpected,
    tags: ["ocr", "multi-line"],
    description: "Invoice with 5 line items",
  },

  // Handwritten Amount
  {
    id: "ocr-handwritten-1",
    input: {
      imagePath: "test-data/invoices/handwritten-amount.jpg",
    },
    expected: {
      totalAmount: 75000,
    } as OcrExpected,
    tags: ["ocr", "handwritten"],
    description: "Invoice with handwritten amount (edge case)",
  },

  // Faded Receipt
  {
    id: "ocr-faded-1",
    input: {
      imagePath: "test-data/invoices/faded-receipt.jpg",
    },
    expected: {
      vendorName: "XYZ Supplies",
      totalAmount: 35000,
    } as OcrExpected,
    tags: ["ocr", "faded", "edge-case"],
    description: "Faded receipt (low quality image)",
  },

  // Urdu/Arabic Text
  {
    id: "ocr-urdu-1",
    input: {
      imagePath: "test-data/invoices/urdu-invoice.jpg",
    },
    expected: {
      totalAmount: 125000,
    } as OcrExpected,
    tags: ["ocr", "urdu"],
    description: "Invoice with Urdu text",
  },

  // Multiple Invoices in One Image
  {
    id: "ocr-multiple-1",
    input: {
      imagePath: "test-data/invoices/two-invoices.jpg",
    },
    expected: {
      lineItemCount: 2, // Should detect 2 invoices
    } as OcrExpected,
    tags: ["ocr", "multiple", "edge-case"],
    description: "Two invoices in one image",
  },

  // Amount with Commas
  {
    id: "ocr-commas-1",
    input: {
      imagePath: "test-data/invoices/comma-amounts.jpg",
    },
    expected: {
      subtotal: 1234567,
      taxAmount: 209876,
      totalAmount: 1444443,
    } as OcrExpected,
    tags: ["ocr", "formatting"],
    description: "Invoice with comma-separated amounts",
  },
];
