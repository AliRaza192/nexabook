import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createAccountingMcpServer(): McpServer {
  const server = new McpServer({
    name: "nexabook-accounting",
    version: "1.0.0",
  });

  // Tool 1: Query Account Balance
  server.tool(
    "query-account-balance",
    "Get the current balance of a specific account by account code. Useful for checking how much is in any account.",
    { accountCode: z.string().describe("The account code, e.g., '1001' for Cash") },
    async ({ accountCode }) => {
      return {
        content: [{ type: "text", text: `Account balance query for ${accountCode} — use with orgId context` }],
      };
    }
  );

  // Tool 2: Query Customer Balance
  server.tool(
    "query-customer-balance",
    "Get outstanding balance for a specific customer. Shows how much a customer owes.",
    { customerName: z.string().describe("Customer name to search") },
    async ({ customerName }) => {
      return {
        content: [{ type: "text", text: `Customer balance query for ${customerName}` }],
      };
    }
  );

  // Tool 3: Query Revenue
  server.tool(
    "query-revenue",
    "Get total revenue for a date range. Shows sales/income for the period.",
    {
      monthsBack: z.number().default(1).describe("Number of months to look back"),
    },
    async ({ monthsBack }) => {
      return {
        content: [{ type: "text", text: `Revenue query for last ${monthsBack} months` }],
      };
    }
  );

  // Tool 4: Query Profit & Loss
  server.tool(
    "query-profit-loss",
    "Generate a Profit & Loss summary for a date range. Shows revenue minus expenses.",
    {
      startDate: z.string().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ startDate, endDate }) => {
      return {
        content: [{ type: "text", text: `P&L query from ${startDate} to ${endDate}` }],
      };
    }
  );

  // Tool 5: Query Cash Position
  server.tool(
    "query-cash-position",
    "Get current cash and bank balances. Shows how much cash the business has.",
    async () => {
      return {
        content: [{ type: "text", text: "Cash position query" }],
      };
    }
  );

  // Tool 6: Query Low Stock
  server.tool(
    "query-low-stock",
    "Get products below reorder level. Shows items that need restocking.",
    async () => {
      return {
        content: [{ type: "text", text: "Low stock query" }],
      };
    }
  );

  // Tool 7: Query Top Products
  server.tool(
    "query-top-products",
    "Get best-selling products by revenue or quantity.",
    {
      limit: z.number().default(10).describe("Number of products to return"),
    },
    async ({ limit }) => {
      return {
        content: [{ type: "text", text: `Top ${limit} products query` }],
      };
    }
  );

  // Tool 8: Query Tax Summary
  server.tool(
    "query-tax-summary",
    "Get tax collected and paid for a period. Shows GST, WHT, and provincial tax.",
    {
      monthsBack: z.number().default(1).describe("Number of months to look back"),
    },
    async ({ monthsBack }) => {
      return {
        content: [{ type: "text", text: `Tax summary for last ${monthsBack} months` }],
      };
    }
  );

  // Tool 9: Validate NTN
  server.tool(
    "validate-ntn",
    "Validate a Pakistani NTN (National Tax Number). Must be exactly 8 digits.",
    { ntn: z.string().describe("NTN to validate") },
    async ({ ntn }) => {
      const isValid = /^\d{8}$/.test(ntn);
      return {
        content: [{
          type: "text",
          text: isValid
            ? `NTN ${ntn} is valid (8 digits)`
            : `NTN ${ntn} is invalid. Must be exactly 8 digits.`
        }],
      };
    }
  );

  // Tool 10: Validate STRN
  server.tool(
    "validate-strn",
    "Validate a Pakistani STRN (Sales Tax Registration Number). Format: 7 digits + dash + 1 digit.",
    { strn: z.string().describe("STRN to validate") },
    async ({ strn }) => {
      const isValid = /^\d{7}-\d$/.test(strn);
      return {
        content: [{
          type: "text",
          text: isValid
            ? `STRN ${strn} is valid (format: XXXXXXX-X)`
            : `STRN ${strn} is invalid. Must be 7 digits + dash + 1 digit (e.g., 1234567-1).`
        }],
      };
    }
  );

  // Tool 11: Calculate Tax
  server.tool(
    "calculate-tax",
    "Calculate tax for a given amount based on Pakistani tax rates.",
    {
      amount: z.number().describe("Base amount to calculate tax on"),
      taxRate: z.number().default(17).describe("Tax rate percentage (default 17% GST)"),
    },
    async ({ amount, taxRate }) => {
      const taxAmount = amount * (taxRate / 100);
      const totalAmount = amount + taxAmount;
      return {
        content: [{
          type: "text",
          text: [
            `Tax Calculation:`,
            `Base Amount: Rs. ${amount.toLocaleString("en-PK")}`,
            `Tax Rate: ${taxRate}%`,
            `Tax Amount: Rs. ${taxAmount.toLocaleString("en-PK")}`,
            `Total Amount: Rs. ${totalAmount.toLocaleString("en-PK")}`,
          ].join("\n")
        }],
      };
    }
  );

  // Tool 12: Query Pending Invoices
  server.tool(
    "query-pending-invoices",
    "Get all unpaid or partially paid invoices. Shows outstanding customer invoices.",
    async () => {
      return {
        content: [{ type: "text", text: "Pending invoices query" }],
      };
    }
  );

  // Tool 13: Query Payroll Summary
  server.tool(
    "query-payroll-summary",
    "Get latest payroll run summary. Shows total gross, deductions, and net pay.",
    async () => {
      return {
        content: [{ type: "text", text: "Payroll summary query" }],
      };
    }
  );

  // Tool 14: Query Overdue Invoices
  server.tool(
    "query-overdue-invoices",
    "Get invoices past their due date. Shows overdue amounts and days overdue.",
    async () => {
      return {
        content: [{ type: "text", text: "Overdue invoices query" }],
      };
    }
  );

  return server;
}
