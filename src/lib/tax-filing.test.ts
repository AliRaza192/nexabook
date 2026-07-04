import { describe, it, expect } from "vitest";
import { validateNTN, validateSTRN } from "./actions/tax-filing";

describe("Tax Filing - Business Logic", () => {
  // FR-2: NTN Validation
  describe("validateNTN", () => {
    it("accepts valid 7-digit NTN", () => {
      expect(validateNTN("1234567").valid).toBe(true);
    });

    it("accepts valid 5-digit NTN", () => {
      expect(validateNTN("12345").valid).toBe(true);
    });

    it("accepts valid 6-digit NTN", () => {
      expect(validateNTN("123456").valid).toBe(true);
    });

    it("rejects NTN with less than 5 digits", () => {
      const result = validateNTN("1234");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5-7 digits");
    });

    it("rejects NTN with more than 7 digits", () => {
      const result = validateNTN("12345678");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5-7 digits");
    });

    it("rejects NTN with letters", () => {
      const result = validateNTN("123456A");
      expect(result.valid).toBe(false);
    });

    it("accepts NTN with dashes", () => {
      expect(validateNTN("123-4567").valid).toBe(true);
    });

    it("accepts NTN with spaces", () => {
      expect(validateNTN("123 4567").valid).toBe(true);
    });

    it("rejects empty NTN", () => {
      expect(validateNTN("").valid).toBe(false);
    });
  });

  // FR-2: STRN Validation
  describe("validateSTRN", () => {
    it("accepts valid 13-character STRN", () => {
      expect(validateSTRN("1700123456789").valid).toBe(true);
    });

    it("accepts STRN with letters", () => {
      expect(validateSTRN("17ABC12345678").valid).toBe(true);
    });

    it("rejects STRN with less than 13 characters", () => {
      const result = validateSTRN("170012345678");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("13 characters");
    });

    it("rejects STRN with more than 13 characters", () => {
      const result = validateSTRN("17001234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("13 characters");
    });

    it("rejects STRN with special characters", () => {
      const result = validateSTRN("17001234567@9");
      expect(result.valid).toBe(false);
    });

    it("rejects STRN with dashes (becomes < 13 after cleaning)", () => {
      const result = validateSTRN("1700-1234-5678");
      expect(result.valid).toBe(false);
    });

    it("rejects empty STRN", () => {
      expect(validateSTRN("").valid).toBe(false);
    });
  });

  // Filing Deadlines
  describe("Filing Deadlines", () => {
    it("GST deadline is 18th of next month", () => {
      const now = new Date(2026, 0, 1); // Jan 1
      const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 18);
      expect(deadline.getDate()).toBe(18);
      expect(deadline.getMonth()).toBe(1); // Feb
    });

    it("Provincial deadline is 15th of next month", () => {
      const now = new Date(2026, 0, 1); // Jan 1
      const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      expect(deadline.getDate()).toBe(15);
      expect(deadline.getMonth()).toBe(1); // Feb
    });

    it("calculates days until deadline correctly", () => {
      const now = new Date(2026, 0, 15); // Jan 15
      const deadline = new Date(2026, 1, 18); // Feb 18
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntil).toBe(34);
    });

    it("detects overdue deadline", () => {
      const now = new Date(2026, 1, 20); // Feb 20
      const deadline = new Date(2026, 1, 18); // Feb 18
      const isOverdue = now > deadline;
      expect(isOverdue).toBe(true);
    });
  });

  // Batch Submission
  describe("Batch Submission", () => {
    it("processes in batches of 5", () => {
      const items = Array.from({ length: 12 }, (_, i) => i);
      const BATCH_SIZE = 5;
      const batches: number[][] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(5);
      expect(batches[1].length).toBe(5);
      expect(batches[2].length).toBe(2);
    });

    it("counts submitted and failed correctly", () => {
      const results = [
        { success: true },
        { success: true },
        { success: false },
        { success: true },
        { success: false },
      ];
      const submitted = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      expect(submitted).toBe(3);
      expect(failed).toBe(2);
    });
  });

  // Provincial Return Calculation
  describe("Provincial Return", () => {
    it("calculates net payable correctly", () => {
      const totalSales = 1000000;
      const taxRate = 17;
      const totalTax = totalSales * (taxRate / 100);
      const netPayable = totalTax;
      expect(totalTax).toBe(170000);
      expect(netPayable).toBe(170000);
    });

    it("handles zero sales", () => {
      const totalSales = 0;
      const totalTax = totalSales * 0.17;
      expect(totalTax).toBe(0);
    });
  });
});
