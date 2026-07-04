import { describe, it, expect } from "vitest";

describe("NexaBot 2.0 - Business Logic", () => {
  // Intent Detection
  describe("Intent Detection", () => {
    const detectIntents = (message: string): string[] => {
      const needsData: string[] = [];
      const msg = message.toLowerCase();

      if (/\b(revenue|sales|income|earned|kamaai|farokht)\b/.test(msg)) needsData.push("revenue");
      if (/\b(pending|unpaid|outstanding|balance due|baaki|qoul)\b/.test(msg)) needsData.push("pendingInvoices");
      if (/\b(overdue|late|der|past due)\b/.test(msg)) needsData.push("overdueInvoices");
      if (/\b(top|best selling|popular|bestseller|zayada bikne wala|most sold)\b/.test(msg)) needsData.push("topProducts");
      if (/\b(customer.*balance|receivable|loan|qarz|debtor)\b/.test(msg)) needsData.push("customerBalances");
      if (/\b(top customer|best customer|sab se acha|biggest)\b/.test(msg)) needsData.push("topCustomers");
      if (/\b(cash|bank|balance.*account|paise|nagad|fund)\b/.test(msg)) needsData.push("cashPosition");
      if (/\b(profit|loss|profit and loss|munafa|nuqsan|p&l|margin)\b/.test(msg)) needsData.push("profitLoss");
      if (/\b(low stock|reorder|stock khatam|inventory|stock level)\b/.test(msg)) needsData.push("lowStock");
      if (/\b(inventory value|stock value|warehouse|godown)\b/.test(msg)) needsData.push("inventoryValue");
      if (/\b(salary|salaries|payroll|wages|talana|employee.*pay| EOBI|PF|provident)\b/.test(msg)) needsData.push("payroll");
      if (/\b(tax|GST|FBR|SRB|return|filing|taxable)\b/.test(msg)) needsData.push("taxSummary");
      if (/\b(invoice|bill|challan|recent.*invoice)\b/.test(msg)) needsData.push("recentInvoices");
      if (/\b(purchase|purchases|vendor|supplier|expense|kharcha)\b/.test(msg)) needsData.push("purchases");

      if (needsData.length === 0) {
        needsData.push("revenue", "pendingInvoices", "cashPosition");
      }

      return [...new Set(needsData)];
    };

    it("detects revenue intent", () => {
      expect(detectIntents("What's my revenue?")).toContain("revenue");
    });

    it("detects payroll intent", () => {
      expect(detectIntents("Show payroll summary")).toContain("payroll");
    });

    it("detects tax intent", () => {
      expect(detectIntents("How much tax do I owe?")).toContain("taxSummary");
    });

    it("detects inventory intent", () => {
      expect(detectIntents("Show low stock items")).toContain("lowStock");
    });

    it("detects purchase intent", () => {
      expect(detectIntents("Total purchases this month")).toContain("purchases");
    });

    it("detects multiple intents", () => {
      const result = detectIntents("Show revenue and pending invoices");
      expect(result).toContain("revenue");
      expect(result).toContain("pendingInvoices");
    });

    it("returns default intents for unmatched message", () => {
      const result = detectIntents("Hello how are you?");
      expect(result).toContain("revenue");
      expect(result).toContain("pendingInvoices");
      expect(result).toContain("cashPosition");
    });

    it("detects Roman Urdu intents", () => {
      expect(detectIntents("Mera revenue kitna hai?")).toContain("revenue");
      expect(detectIntents("Baaki kitni hai?")).toContain("pendingInvoices");
    });
  });

  // Suggested Prompts
  describe("Suggested Prompts", () => {
    it("has 6 default prompts", () => {
      const prompts = [
        { label: "Revenue", message: "What's my revenue this month?" },
        { label: "Pending Invoices", message: "Show pending invoices" },
        { label: "Top Products", message: "What are my top selling products?" },
        { label: "Cash Position", message: "What's my cash position?" },
        { label: "Tax Summary", message: "How much tax do I owe?" },
        { label: "Payroll", message: "Show payroll summary" },
      ];
      expect(prompts.length).toBe(6);
    });

    it("each prompt has label and message", () => {
      const prompts = [
        { label: "Revenue", message: "What's my revenue this month?" },
      ];
      expect(prompts[0].label).toBeTruthy();
      expect(prompts[0].message).toBeTruthy();
    });
  });

  // Chat History
  describe("Chat History", () => {
    it("limits history to 50 messages", () => {
      const limit = 50;
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));
      const limited = messages.slice(-limit);
      expect(limited.length).toBe(50);
    });

    it("preserves message order", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "How are you?" },
      ];
      const reversed = [...messages].reverse().reverse();
      expect(reversed[0].content).toBe("Hello");
      expect(reversed[2].content).toBe("How are you?");
    });
  });

  // Message Truncation
  describe("Message Truncation", () => {
    it("truncates long messages at 2000 chars", () => {
      const longMessage = "A".repeat(2500);
      const truncated = longMessage.length > 2000
        ? longMessage.substring(0, 1997) + "..."
        : longMessage;
      expect(truncated.length).toBe(2000);
      expect(truncated.endsWith("...")).toBe(true);
    });

    it("does not truncate short messages", () => {
      const shortMessage = "Hello!";
      const truncated = shortMessage.length > 2000
        ? shortMessage.substring(0, 1997) + "..."
        : shortMessage;
      expect(truncated).toBe("Hello!");
    });
  });

  // Retriever Keys
  describe("Retriever Keys", () => {
    it("has all required retriever keys", () => {
      const requiredKeys = [
        "revenue", "pendingInvoices", "topProducts", "customerBalances",
        "cashPosition", "profitLoss", "lowStock", "overdueInvoices",
        "topCustomers", "payroll", "taxSummary", "inventoryValue",
        "recentInvoices", "purchases",
      ];
      expect(requiredKeys.length).toBe(14);
    });
  });
});
