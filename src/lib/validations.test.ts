import { describe, it, expect } from "vitest";
import { validate, createInvoiceSchema, createCustomerSchema, createJournalEntrySchema } from "./validations";

describe("validations", () => {
  describe("createInvoiceSchema", () => {
    it("accepts valid invoice data", () => {
      const result = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        issueDate: "2026-01-15",
        items: [
          { description: "Laptop", quantity: 2, unitPrice: 150000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invoice with no items", () => {
      const result = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        issueDate: "2026-01-15",
        items: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("items");
    });

    it("rejects invoice with negative quantity", () => {
      const result = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        issueDate: "2026-01-15",
        items: [
          { description: "Laptop", quantity: -1, unitPrice: 150000 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invoice with invalid customer ID", () => {
      const result = validate(createInvoiceSchema, {
        customerId: "not-a-uuid",
        issueDate: "2026-01-15",
        items: [{ description: "Item", quantity: 1, unitPrice: 100 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createCustomerSchema", () => {
    it("accepts valid customer data", () => {
      const result = validate(createCustomerSchema, {
        name: "ABC Corp",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = validate(createCustomerSchema, {
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional fields", () => {
      const result = validate(createCustomerSchema, {
        name: "ABC Corp",
        email: "test@example.com",
        phone: "+923001234567",
        city: "Karachi",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createJournalEntrySchema", () => {
    it("accepts balanced journal entry", () => {
      const result = validate(createJournalEntrySchema, {
        entryDate: "2026-01-15",
        lines: [
          { accountId: "550e8400-e29b-41d4-a716-446655440000", debitAmount: 1000, creditAmount: 0 },
          { accountId: "550e8400-e29b-41d4-a716-446655440001", debitAmount: 0, creditAmount: 1000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects unbalanced journal entry", () => {
      const result = validate(createJournalEntrySchema, {
        entryDate: "2026-01-15",
        lines: [
          { accountId: "550e8400-e29b-41d4-a716-446655440000", debitAmount: 1000, creditAmount: 0 },
          { accountId: "550e8400-e29b-41d4-a716-446655440001", debitAmount: 0, creditAmount: 500 },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("debits must equal");
    });

    it("rejects entry with less than 2 lines", () => {
      const result = validate(createJournalEntrySchema, {
        entryDate: "2026-01-15",
        lines: [
          { accountId: "550e8400-e29b-41d4-a716-446655440000", debitAmount: 1000, creditAmount: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
