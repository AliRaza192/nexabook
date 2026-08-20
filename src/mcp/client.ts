/**
 * MCP Client for NexaBot
 *
 * This module provides a simplified MCP client interface that NexaBot
 * can use to call accounting tools. It wraps the retriever functions
 * in an MCP-compatible format.
 */

import { retrievers, RetrievalResult } from "@/lib/ai/retriever";

export interface McpToolResult {
  content: string;
  isError?: boolean;
}

/**
 * Execute an MCP tool by name with arguments
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<McpToolResult> {
  try {
    const result = await callTool(toolName, args, orgId);
    return {
      content: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      isError: false,
    };
  } catch (error) {
    return {
      content: `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      isError: true,
    };
  }
}

/**
 * Call a specific tool with arguments
 */
async function callTool(
  toolName: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  switch (toolName) {
    // Database Query Tools
    case "query-revenue": {
      const monthsBack = (args.monthsBack as number) || 1;
      const result = await retrievers.revenue(orgId, monthsBack);
      return formatRetrievalResult(result);
    }

    case "query-pending-invoices": {
      const result = await retrievers.pendingInvoices(orgId);
      return formatRetrievalResult(result);
    }

    case "query-overdue-invoices": {
      const result = await retrievers.overdueInvoices(orgId);
      return formatRetrievalResult(result);
    }

    case "query-top-products": {
      const limit = (args.limit as number) || 10;
      const result = await retrievers.topProducts(orgId, limit);
      return formatRetrievalResult(result);
    }

    case "query-customer-balances": {
      const result = await retrievers.customerBalances(orgId);
      return formatRetrievalResult(result);
    }

    case "query-top-customers": {
      const result = await retrievers.topCustomers(orgId);
      return formatRetrievalResult(result);
    }

    case "query-cash-position": {
      const result = await retrievers.cashPosition(orgId);
      return formatRetrievalResult(result);
    }

    case "query-profit-loss": {
      const result = await retrievers.profitLoss(orgId);
      return formatRetrievalResult(result);
    }

    case "query-low-stock": {
      const result = await retrievers.lowStock(orgId);
      return formatRetrievalResult(result);
    }

    case "query-inventory-value": {
      const result = await retrievers.inventoryValue(orgId);
      return formatRetrievalResult(result);
    }

    case "query-payroll-summary": {
      const result = await retrievers.payroll(orgId);
      return formatRetrievalResult(result);
    }

    case "query-tax-summary": {
      const result = await retrievers.taxSummary(orgId);
      return formatRetrievalResult(result);
    }

    case "query-recent-invoices": {
      const result = await retrievers.recentInvoices(orgId);
      return formatRetrievalResult(result);
    }

    case "query-purchases": {
      const result = await retrievers.purchases(orgId);
      return formatRetrievalResult(result);
    }

    // Accounting Calculation Tools
    case "calculate-tax": {
      const amount = (args.amount as number) || 0;
      const taxRate = (args.taxRate as number) || 17;
      const taxAmount = amount * (taxRate / 100);
      const totalAmount = amount + taxAmount;
      return [
        `Tax Calculation:`,
        `Base Amount: Rs. ${amount.toLocaleString("en-PK")}`,
        `Tax Rate: ${taxRate}%`,
        `Tax Amount: Rs. ${taxAmount.toLocaleString("en-PK")}`,
        `Total Amount: Rs. ${totalAmount.toLocaleString("en-PK")}`,
      ].join("\n");
    }

    case "validate-ntn": {
      const ntn = (args.ntn as string) || "";
      const isValid = /^\d{8}$/.test(ntn);
      return isValid
        ? `NTN ${ntn} is valid (8 digits)`
        : `NTN ${ntn} is invalid. Must be exactly 8 digits.`;
    }

    case "validate-strn": {
      const strn = (args.strn as string) || "";
      const isValid = /^\d{7}-\d$/.test(strn);
      return isValid
        ? `STRN ${strn} is valid (format: XXXXXXX-X)`
        : `STRN ${strn} is invalid. Must be 7 digits + dash + 1 digit.`;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Format a RetrievalResult into a readable string
 */
function formatRetrievalResult(result: RetrievalResult): string {
  if (result.summary) {
    return result.summary;
  }

  if (!result.data || result.data.length === 0) {
    return `${result.label}: No data available`;
  }

  const lines = [result.label + ":"];
  for (const row of result.data) {
    const entries = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    lines.push(`- ${entries}`);
  }
  return lines.join("\n");
}

/**
 * Get list of all available MCP tools with descriptions
 */
export function getAvailableTools(): Array<{ name: string; description: string }> {
  return [
    // Data Query Tools (from retrievers)
    { name: "query-revenue", description: "Get total revenue for a date range" },
    { name: "query-pending-invoices", description: "Get all unpaid invoices" },
    { name: "query-overdue-invoices", description: "Get invoices past due date" },
    { name: "query-top-products", description: "Get best-selling products" },
    { name: "query-customer-balances", description: "Get customer outstanding balances" },
    { name: "query-top-customers", description: "Get top customers by revenue" },
    { name: "query-cash-position", description: "Get current cash and bank balances" },
    { name: "query-profit-loss", description: "Get profit and loss summary" },
    { name: "query-low-stock", description: "Get products below reorder level" },
    { name: "query-inventory-value", description: "Get total inventory value" },
    { name: "query-payroll-summary", description: "Get latest payroll summary" },
    { name: "query-tax-summary", description: "Get tax collected summary" },
    { name: "query-recent-invoices", description: "Get recent invoices" },
    { name: "query-purchases", description: "Get purchase summary" },

    // Accounting Calculation Tools
    { name: "calculate-tax", description: "Calculate tax for a given amount" },
    { name: "validate-ntn", description: "Validate Pakistani NTN number" },
    { name: "validate-strn", description: "Validate Pakistani STRN number" },
  ];
}
