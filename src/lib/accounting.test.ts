import { describe, it, expect } from "vitest";
import {
  roundCurrency,
  calculateLineTotal,
  validateJournalBalance,
} from "./accounting";
import { formatPakistaniNumber, formatPKR, formatAmountWords } from "./utils/number-format";
import { formatInvoiceMessage, generateWhatsAppLink } from "./utils/whatsapp";
import { formatCurrency, convertToPKR } from "./utils/currency";

// ─── accounting.ts ───────────────────────────────────────

describe("roundCurrency", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundCurrency(10.123)).toBe(10.12);
    expect(roundCurrency(10.125)).toBe(10.13);
    expect(roundCurrency(10)).toBe(10);
  });

  it("handles zero", () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(roundCurrency(-5.678)).toBe(-5.68);
  });
});

describe("calculateLineTotal", () => {
  it("calculates correctly with no discount or tax", () => {
    const result = calculateLineTotal(10, 100, 0, 0);
    expect(result.lineSubtotal).toBe(1000);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(0);
    expect(result.lineTotal).toBe(1000);
  });

  it("calculates with discount", () => {
    const result = calculateLineTotal(10, 100, 10, 0);
    expect(result.lineSubtotal).toBe(1000);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(0);
    expect(result.lineTotal).toBe(900);
  });

  it("calculates with tax", () => {
    const result = calculateLineTotal(5, 200, 0, 16);
    expect(result.lineSubtotal).toBe(1000);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(160);
    expect(result.lineTotal).toBe(1160);
  });

  it("calculates with both discount and tax", () => {
    const result = calculateLineTotal(10, 50, 20, 10);
    expect(result.lineSubtotal).toBe(500);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(400);
    expect(result.taxAmount).toBe(40);
    expect(result.lineTotal).toBe(440);
  });

  it("handles zero quantity", () => {
    const result = calculateLineTotal(0, 100, 10, 5);
    expect(result.lineSubtotal).toBe(0);
    expect(result.lineTotal).toBe(0);
  });
});

describe("validateJournalBalance", () => {
  it("returns true for balanced entry", () => {
    const lines = [
      { debitAmount: "100", creditAmount: "0" },
      { debitAmount: "0", creditAmount: "100" },
    ];
    expect(validateJournalBalance(lines)).toBe(true);
  });

  it("returns true for entry with small rounding difference", () => {
    const lines = [
      { debitAmount: "100.00", creditAmount: "0" },
      { debitAmount: "0", creditAmount: "100.005" },
    ];
    expect(validateJournalBalance(lines)).toBe(true);
  });

  it("returns false for unbalanced entry", () => {
    const lines = [
      { debitAmount: "200", creditAmount: "0" },
      { debitAmount: "0", creditAmount: "100" },
    ];
    expect(validateJournalBalance(lines)).toBe(false);
  });

  it("handles multiple lines", () => {
    const lines = [
      { debitAmount: "500", creditAmount: "0" },
      { debitAmount: "300", creditAmount: "0" },
      { debitAmount: "0", creditAmount: "800" },
    ];
    expect(validateJournalBalance(lines)).toBe(true);
  });
});

// ─── number-format.ts ────────────────────────────────────

describe("formatPakistaniNumber", () => {
  it("formats numbers in South Asian style", () => {
    expect(formatPakistaniNumber(1000)).toBe("1,000.00");
    expect(formatPakistaniNumber(10000)).toBe("10,000.00");
    expect(formatPakistaniNumber(100000)).toBe("1,00,000.00");
    expect(formatPakistaniNumber(1000000)).toBe("10,00,000.00");
    expect(formatPakistaniNumber(10000000)).toBe("1,00,00,000.00");
  });

  it("handles small numbers", () => {
    expect(formatPakistaniNumber(0)).toBe("0.00");
    expect(formatPakistaniNumber(5)).toBe("5.00");
    expect(formatPakistaniNumber(99)).toBe("99.00");
  });

  it("handles decimals", () => {
    expect(formatPakistaniNumber(1234.56)).toBe("1,234.56");
  });
});

describe("formatPKR", () => {
  it("prepends Rs. and formats", () => {
    expect(formatPKR(1000)).toBe("Rs. 1,000.00");
    expect(formatPKR(500000)).toBe("Rs. 5,00,000.00");
  });
});

describe("formatAmountWords", () => {
  it("converts amounts to words", () => {
    const result = formatAmountWords(1000);
    expect(result).toContain("One Thousand");
  });

  it("handles zero", () => {
    expect(formatAmountWords(0)).toBe("Zero");
  });
});

// ─── whatsapp.ts ─────────────────────────────────────────

describe("formatInvoiceMessage", () => {
  it("formats invoice message correctly", () => {
    const msg = formatInvoiceMessage({
      orgName: "Test Co",
      invoiceNumber: "INV-001",
      customerName: "John",
      amount: "1000",
      dueDate: "2024-01-15",
    });
    expect(msg).toContain("Test Co");
    expect(msg).toContain("INV-001");
    expect(msg).toContain("John");
    expect(msg).toContain("1000");
  });
});

describe("generateWhatsAppLink", () => {
  it("generates wa.me link", () => {
    const link = generateWhatsAppLink("+923001234567", "Hello");
    expect(link).toBe("https://wa.me/923001234567?text=Hello");
  });

  it("encodes message", () => {
    const link = generateWhatsAppLink("+92", "Hi there");
    expect(link).toContain("Hi%20there");
  });
});

// ─── currency.ts ─────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats PKR", () => {
    const result = formatCurrency(1000, "PKR");
    expect(result).toContain("1,000");
  });
});

describe("convertToPKR", () => {
  it("converts at given rate", () => {
    expect(convertToPKR(100, 280)).toBe(28000);
    expect(convertToPKR(0, 280)).toBe(0);
  });

  it("handles fractional rates", () => {
    expect(convertToPKR(50, 279.5)).toBe(13975);
  });
});
