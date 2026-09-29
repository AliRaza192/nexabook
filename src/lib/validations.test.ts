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

    // NB: the invoice form UI (and InvoiceFormData) sends money/qty as strings.
    // This exact payload shape was rejected before coerce was added — invoice
    // creation failed on its own valid input.
    it("accepts the string-typed payload the invoice form actually submits", () => {
      const result = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        invoiceNumber: "INV-0001",
        issueDate: new Date("2026-01-15"),
        grossAmount: "1000.00",
        discountPercentage: "0.00",
        discountAmount: "0.00",
        taxAmount: "100.00",
        shippingCharges: "0.00",
        roundOff: "0.00",
        netAmount: "1100.00",
        receivedAmount: "0.00",
        balanceAmount: "1100.00",
        terms: "",
        items: [
          {
            productId: "550e8400-e29b-41d4-a716-446655440099",
            description: "Widget",
            quantity: "10",
            unitPrice: "100",
            discountPercentage: "0",
            taxRate: "10",
            lineTotal: "1000.00",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("still rejects non-numeric quantity and negative amounts", () => {
      const bad = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        issueDate: "2026-01-15",
        items: [{ description: "Item", quantity: "abc", unitPrice: "100" }],
      });
      expect(bad.success).toBe(false);

      const negative = validate(createInvoiceSchema, {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        issueDate: "2026-01-15",
        items: [{ description: "Item", quantity: "-2", unitPrice: "100" }],
      });
      expect(negative.success).toBe(false);
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
