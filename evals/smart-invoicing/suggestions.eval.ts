/**
 * Smart Invoicing Suggestions Evaluation Suite
 *
 * Tests the AI-powered invoice suggestion features:
 * duplicate detection, pricing suggestions, and anomaly detection.
 */

import { EvalCase } from "../framework/runner";

// Duplicate Detection Tests
export const duplicateDetectionCases: EvalCase[] = [
  {
    id: "dup-exact-1",
    input: {
      customerId: "cust-001",
      items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
      recentInvoices: [
        {
          items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
          date: "2026-07-03",
        },
      ],
    },
    expected: { isDuplicate: true, confidence: 0.9 },
    tags: ["duplicate", "exact"],
    description: "Exact same items within 3 days",
  },
  {
    id: "dup-partial-1",
    input: {
      customerId: "cust-001",
      items: [
        { productId: "prod-001", quantity: 10, unitPrice: 1000 },
        { productId: "prod-002", quantity: 5, unitPrice: 500 },
      ],
      recentInvoices: [
        {
          items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
          date: "2026-07-02",
        },
      ],
    },
    expected: { isDuplicate: false, confidence: 0.3 },
    tags: ["duplicate", "partial"],
    description: "Partial overlap (not duplicate)",
  },
  {
    id: "dup-different-customer-1",
    input: {
      customerId: "cust-002",
      items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
      recentInvoices: [
        {
          customerId: "cust-001",
          items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
          date: "2026-07-03",
        },
      ],
    },
    expected: { isDuplicate: false, confidence: 0.1 },
    tags: ["duplicate", "different-customer"],
    description: "Same items but different customer (not duplicate)",
  },
  {
    id: "dup-old-1",
    input: {
      customerId: "cust-001",
      items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
      recentInvoices: [
        {
          items: [{ productId: "prod-001", quantity: 10, unitPrice: 1000 }],
          date: "2026-06-01",
        },
      ],
    },
    expected: { isDuplicate: false, confidence: 0.2 },
    tags: ["duplicate", "old"],
    description: "Same items but old invoice (not duplicate)",
  },
];

// Pricing Suggestion Tests
export const pricingSuggestionCases: EvalCase[] = [
  {
    id: "price-last-sold-1",
    input: {
      productId: "prod-001",
      customerId: "cust-001",
      lastSoldPrice: 500,
      averagePrice: 520,
      customerPriceRange: { min: 480, max: 550 },
    },
    expected: {
      suggestedPrice: 500,
      reason: "Last sold price to this customer",
    },
    tags: ["pricing", "last-sold"],
    description: "Suggest last sold price",
  },
  {
    id: "price-new-customer-1",
    input: {
      productId: "prod-001",
      customerId: "cust-new",
      lastSoldPrice: null,
      averagePrice: 520,
      customerPriceRange: null,
    },
    expected: {
      suggestedPrice: 520,
      reason: "Average selling price",
    },
    tags: ["pricing", "new-customer"],
    description: "New customer - suggest average price",
  },
  {
    id: "price-discount-1",
    input: {
      productId: "prod-001",
      customerId: "cust-vip",
      lastSoldPrice: 500,
      averagePrice: 520,
      customerPriceRange: { min: 450, max: 500 },
      isVip: true,
    },
    expected: {
      suggestedPrice: 450,
      reason: "VIP customer minimum price",
    },
    tags: ["pricing", "vip"],
    description: "VIP customer gets minimum price",
  },
];

// Anomaly Detection Tests
export const anomalyDetectionCases: EvalCase[] = [
  {
    id: "anomaly-high-amount-1",
    input: {
      invoiceAmount: 500000,
      averageInvoiceAmount: 50000,
      customerAverageAmount: 60000,
    },
    expected: {
      isAnomaly: true,
      reason: "Amount is 10x average",
    },
    tags: ["anomaly", "high-amount"],
    description: "Invoice amount is 10x average",
  },
  {
    id: "anomaly-normal-1",
    input: {
      invoiceAmount: 55000,
      averageInvoiceAmount: 50000,
      customerAverageAmount: 60000,
    },
    expected: {
      isAnomaly: false,
      reason: "Within normal range",
    },
    tags: ["anomaly", "normal"],
    description: "Normal invoice amount",
  },
  {
    id: "anomaly-new-customer-1",
    input: {
      invoiceAmount: 100000,
      averageInvoiceAmount: 50000,
      customerAverageAmount: null,
      isNewCustomer: true,
    },
    expected: {
      isAnomaly: true,
      reason: "New customer with high first invoice",
    },
    tags: ["anomaly", "new-customer"],
    description: "New customer with high first invoice",
  },
  {
    id: "anomaly-bulk-1",
    input: {
      invoiceAmount: 200000,
      averageInvoiceAmount: 50000,
      customerAverageAmount: 190000,
      itemQuantity: 500,
      averageItemQuantity: 10,
    },
    expected: {
      isAnomaly: true,
      reason: "Bulk order - high quantity",
    },
    tags: ["anomaly", "bulk"],
    description: "Bulk order with high quantity",
  },
];
