/**
 * NexaBot Intent Detection Evaluation Suite
 *
 * Tests NexaBot's ability to correctly identify user intents
 * and select the appropriate data retrievers.
 */

import { EvalCase } from "../framework/runner";

export const intentDetectionCases: EvalCase[] = [
  // Revenue & Sales
  {
    id: "intent-revenue-1",
    input: "What's my revenue this month?",
    expected: ["revenue"],
    tags: ["intent", "revenue"],
    description: "English revenue query",
  },
  {
    id: "intent-revenue-2",
    input: "Is mahiney ki kamaai kitni hai?",
    expected: ["revenue"],
    tags: ["intent", "revenue", "roman-urdu"],
    description: "Roman Urdu revenue query",
  },
  {
    id: "intent-revenue-3",
    input: "How much did we sell last month?",
    expected: ["revenue"],
    tags: ["intent", "revenue"],
    description: "Sales query (revenue)",
  },

  // Pending Invoices
  {
    id: "intent-pending-1",
    input: "Kitne invoices pending hain?",
    expected: ["pendingInvoices"],
    tags: ["intent", "pending", "roman-urdu"],
    description: "Roman Urdu pending invoices query",
  },
  {
    id: "intent-pending-2",
    input: "Show me unpaid invoices",
    expected: ["pendingInvoices"],
    tags: ["intent", "pending"],
    description: "English unpaid invoices query",
  },
  {
    id: "intent-pending-3",
    input: "Outstanding balance check karo",
    expected: ["pendingInvoices"],
    tags: ["intent", "pending", "roman-urdu"],
    description: "Outstanding balance query",
  },

  // Overdue Invoices
  {
    id: "intent-overdue-1",
    input: "Which invoices are overdue?",
    expected: ["overdueInvoices"],
    tags: ["intent", "overdue"],
    description: "English overdue query",
  },
  {
    id: "intent-overdue-2",
    input: "Der se baqi invoices dikhao",
    expected: ["overdueInvoices"],
    tags: ["intent", "overdue", "roman-urdu"],
    description: "Roman Urdu overdue query",
  },

  // Top Products
  {
    id: "intent-top-products-1",
    input: "What are our best selling products?",
    expected: ["topProducts"],
    tags: ["intent", "products"],
    description: "English top products query",
  },
  {
    id: "intent-top-products-2",
    input: "Sab se zyada bikne wale products",
    expected: ["topProducts"],
    tags: ["intent", "products", "roman-urdu"],
    description: "Roman Urdu top products query",
  },

  // Customer Balances
  {
    id: "intent-customer-balances-1",
    input: "Show customer balances",
    expected: ["customerBalances"],
    tags: ["intent", "customers"],
    description: "English customer balances query",
  },
  {
    id: "intent-customer-balances-2",
    input: "Customers ka balance kitna hai?",
    expected: ["customerBalances"],
    tags: ["intent", "customers", "roman-urdu"],
    description: "Roman Urdu customer balance query",
  },

  // Cash Position
  {
    id: "intent-cash-1",
    input: "What's our cash position?",
    expected: ["cashPosition"],
    tags: ["intent", "cash"],
    description: "English cash position query",
  },
  {
    id: "intent-cash-2",
    input: "Hamare paas kitna cash hai?",
    expected: ["cashPosition"],
    tags: ["intent", "cash", "roman-urdu"],
    description: "Roman Urdu cash query",
  },
  {
    id: "intent-cash-3",
    input: "Bank balance check karo",
    expected: ["cashPosition"],
    tags: ["intent", "cash", "roman-urdu"],
    description: "Bank balance query",
  },

  // Profit & Loss
  {
    id: "intent-pnl-1",
    input: "Show me the profit and loss",
    expected: ["profitLoss"],
    tags: ["intent", "profit-loss"],
    description: "English P&L query",
  },
  {
    id: "intent-pnl-2",
    input: "Profit loss report dikhao",
    expected: ["profitLoss"],
    tags: ["intent", "profit-loss", "roman-urdu"],
    description: "Roman Urdu P&L query",
  },
  {
    id: "intent-pnl-3",
    input: "Kitna munafa hua is mahiney?",
    expected: ["profitLoss"],
    tags: ["intent", "profit-loss", "roman-urdu"],
    description: "Profit in Roman Urdu",
  },

  // Low Stock
  {
    id: "intent-low-stock-1",
    input: "Which products are low on stock?",
    expected: ["lowStock"],
    tags: ["intent", "inventory"],
    description: "English low stock query",
  },
  {
    id: "intent-low-stock-2",
    input: "Stock khatam ho raha hai kya?",
    expected: ["lowStock"],
    tags: ["intent", "inventory", "roman-urdu"],
    description: "Roman Urdu low stock query",
  },

  // Payroll
  {
    id: "intent-payroll-1",
    input: "Show payroll summary",
    expected: ["payroll"],
    tags: ["intent", "payroll"],
    description: "English payroll query",
  },
  {
    id: "intent-payroll-2",
    input: "Employees ki salary kitni hai?",
    expected: ["payroll"],
    tags: ["intent", "payroll", "roman-urdu"],
    description: "Roman Urdu payroll query",
  },

  // Tax
  {
    id: "intent-tax-1",
    input: "What's our tax summary?",
    expected: ["taxSummary"],
    tags: ["intent", "tax"],
    description: "English tax query",
  },
  {
    id: "intent-tax-2",
    input: "Tax return kitna banta hai?",
    expected: ["taxSummary"],
    tags: ["intent", "tax", "roman-urdu"],
    description: "Roman Urdu tax query",
  },

  // Recent Invoices
  {
    id: "intent-recent-invoices-1",
    input: "Show recent invoices",
    expected: ["recentInvoices"],
    tags: ["intent", "invoices"],
    description: "English recent invoices query",
  },
  {
    id: "intent-recent-invoices-2",
    input: "Recent invoices dikhao",
    expected: ["recentInvoices"],
    tags: ["intent", "invoices", "roman-urdu"],
    description: "Roman Urdu recent invoices query",
  },

  // Purchases
  {
    id: "intent-purchases-1",
    input: "Show purchase summary",
    expected: ["purchases"],
    tags: ["intent", "purchases"],
    description: "English purchase query",
  },
  {
    id: "intent-purchases-2",
    input: "Purchases ka data dikhao",
    expected: ["purchases"],
    tags: ["intent", "purchases", "roman-urdu"],
    description: "Roman Urdu purchase query",
  },

  // Multi-intent
  {
    id: "intent-multi-1",
    input: "Revenue aur expenses dono dikhao",
    expected: ["revenue", "profitLoss"],
    tags: ["intent", "multi"],
    description: "Multi-intent query (revenue + expenses)",
  },
  {
    id: "intent-multi-2",
    input: "Cash balance aur pending invoices",
    expected: ["cashPosition", "pendingInvoices"],
    tags: ["intent", "multi"],
    description: "Multi-intent query (cash + pending)",
  },
];
