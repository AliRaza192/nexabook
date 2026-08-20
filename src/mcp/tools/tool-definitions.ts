/**
 * MCP Integration for NexaBot
 *
 * This module provides tool definitions that can be used with
 * Gemini/OpenAI function calling. It wraps the retriever functions
 * in a format compatible with AI model tool calling.
 */

export const mcpToolDefinitions = [
  // Data Query Tools
  {
    name: "query_revenue",
    description: "Get total revenue for a specified number of months. Returns total sales, invoice count, and paid amount.",
    parameters: {
      type: "object",
      properties: {
        months_back: {
          type: "number",
          description: "Number of months to look back (default: 1)",
        },
      },
      required: [],
    },
  },
  {
    name: "query_pending_invoices",
    description: "Get all unpaid or partially paid invoices. Returns invoice details, customer names, and outstanding amounts.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_overdue_invoices",
    description: "Get invoices that are past their due date. Returns overdue amounts and days overdue.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_top_products",
    description: "Get best-selling products ranked by revenue or quantity sold.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of products to return (default: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "query_customer_balances",
    description: "Get outstanding balances for all customers. Shows how much each customer owes.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_top_customers",
    description: "Get top customers by total invoice amount.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_cash_position",
    description: "Get current cash and bank account balances. Shows how much liquid cash the business has.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_profit_loss",
    description: "Get profit and loss summary. Shows revenue, expenses, and net profit.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_low_stock",
    description: "Get products that are below their reorder level and need restocking.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_inventory_value",
    description: "Get total inventory value across all warehouses.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_payroll_summary",
    description: "Get latest payroll run summary with total gross, deductions, and net pay.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_tax_summary",
    description: "Get tax collected summary including GST and WHT.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_recent_invoices",
    description: "Get the most recent invoices with customer names and amounts.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_purchases",
    description: "Get purchase summary for a date range.",
    parameters: { type: "object", properties: {} },
  },

  // Accounting Calculation Tools
  {
    name: "calculate_tax",
    description: "Calculate tax for a given amount. Returns base amount, tax amount, and total.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Base amount to calculate tax on",
        },
        tax_rate: {
          type: "number",
          description: "Tax rate percentage (default: 17 for GST)",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "validate_ntn",
    description: "Validate a Pakistani NTN (National Tax Number). Must be exactly 8 digits.",
    parameters: {
      type: "object",
      properties: {
        ntn: {
          type: "string",
          description: "NTN number to validate",
        },
      },
      required: ["ntn"],
    },
  },
  {
    name: "validate_strn",
    description: "Validate a Pakistani STRN (Sales Tax Registration Number). Format: 7 digits + dash + 1 digit.",
    parameters: {
      type: "object",
      properties: {
        strn: {
          type: "string",
          description: "STRN number to validate",
        },
      },
      required: ["strn"],
    },
  },
];
