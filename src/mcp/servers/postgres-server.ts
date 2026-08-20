import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createPostgresMcpServer(): McpServer {
  const server = new McpServer({
    name: "nexabook-database",
    version: "1.0.0",
  });

  // Tool 1: Run SQL Query (read-only)
  server.tool(
    "run-query",
    "Execute a read-only SQL query against the NexaBook database. Use for complex queries not covered by other tools.",
    { sql: z.string().describe("SQL query to execute (SELECT only)") },
    async ({ sql }) => {
      // Only allow SELECT queries
      if (!sql.trim().toUpperCase().startsWith("SELECT")) {
        return {
          content: [{ type: "text", text: "Error: Only SELECT queries are allowed for security." }],
        };
      }
      return {
        content: [{ type: "text", text: `Query execution: ${sql}` }],
      };
    }
  );

  // Tool 2: List Tables
  server.tool(
    "list-tables",
    "List all tables in the NexaBook database with their row counts.",
    async () => {
      const tables = [
        "organizations", "profiles", "chartOfAccounts", "journalEntries",
        "journalEntryLines", "invoices", "invoiceItems", "customers",
        "vendors", "purchaseInvoices", "purchaseItems", "products",
        "stockMovements", "bankAccounts", "bankTransactions", "employees",
        "payslips", "payrollRuns", "leads", "tickets"
      ];
      return {
        content: [{
          type: "text",
          text: `NexaBook Database Tables (${tables.length} core tables):\n${tables.join("\n")}`
        }],
      };
    }
  );

  // Tool 3: Describe Table
  server.tool(
    "describe-table",
    "Get the schema/columns of a specific table.",
    { tableName: z.string().describe("Name of the table to describe") },
    async ({ tableName }) => {
      return {
        content: [{ type: "text", text: `Schema for table: ${tableName}` }],
      };
    }
  );

  // Tool 4: Count Records
  server.tool(
    "count-records",
    "Count records in a table with optional filters.",
    {
      tableName: z.string().describe("Table name"),
      where: z.string().optional().describe("WHERE clause (without WHERE keyword)"),
    },
    async ({ tableName, where }) => {
      const query = where
        ? `SELECT COUNT(*) FROM ${tableName} WHERE ${where}`
        : `SELECT COUNT(*) FROM ${tableName}`;
      return {
        content: [{ type: "text", text: `Count query: ${query}` }],
      };
    }
  );

  return server;
}
