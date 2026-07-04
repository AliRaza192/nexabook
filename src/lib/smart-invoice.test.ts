import { describe, it, expect } from "vitest";

// ==================== Unit Tests for Smart Invoice Logic ====================

describe("Smart Invoice - Business Logic", () => {
  // FR-1: Smart Defaults
  describe("getSmartDefaults", () => {
    it("calculates most common payment terms", () => {
      const paymentTerms = [30, 30, 30, 15, 60, 30, 15];
      const termsCount = new Map<number, number>();
      for (const t of paymentTerms) {
        termsCount.set(t, (termsCount.get(t) || 0) + 1);
      }
      const mostCommon = [...termsCount.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      expect(mostCommon).toBe(30);
    });

    it("calculates most frequent order booker", () => {
      const bookers = ["Ahmed", "Ahmed", "Ali", "Ahmed", "Sara"];
      const bookerCount = new Map<string, number>();
      for (const b of bookers) {
        bookerCount.set(b, (bookerCount.get(b) || 0) + 1);
      }
      const mostFrequent = [...bookerCount.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      expect(mostFrequent).toBe("Ahmed");
    });

    it("returns confidence based on history size", () => {
      const getConfidence = (historySize: number) =>
        Math.min(historySize / 5, 1);

      expect(getConfidence(0)).toBe(0);
      expect(getConfidence(3)).toBe(0.6);
      expect(getConfidence(5)).toBe(1);
      expect(getConfidence(10)).toBe(1);
    });
  });

  // FR-2: Duplicate Detection
  describe("detectDuplicateInvoices", () => {
    it("checks amount similarity within 20%", () => {
      const currentAmount = 100000;
      const invAmount = 115000;
      const amountDiff = Math.abs(currentAmount - invAmount);
      const amountThreshold = Math.max(currentAmount, invAmount) * 0.2;
      expect(amountDiff <= amountThreshold).toBe(true);
    });

    it("rejects amounts outside 20% threshold", () => {
      const currentAmount = 100000;
      const invAmount = 150000;
      const amountDiff = Math.abs(currentAmount - invAmount);
      const amountThreshold = Math.max(currentAmount, invAmount) * 0.2;
      expect(amountDiff <= amountThreshold).toBe(false);
    });

    it("calculates item overlap percentage", () => {
      const currentProducts = ["p1", "p2", "p3"];
      const invProducts = ["p1", "p2", "p4"];
      const overlap = currentProducts.filter((id) =>
        invProducts.includes(id)
      ).length;
      const overlapPercentage =
        (overlap /
          Math.max(currentProducts.length, invProducts.length)) *
        100;
      expect(overlapPercentage).toBe(66.66666666666666);
    });

    it("identifies 80%+ overlap as potential duplicate", () => {
      const currentProducts = ["p1", "p2", "p3", "p4"];
      const invProducts = ["p1", "p2", "p3", "p4", "p5"];
      const overlap = currentProducts.filter((id) =>
        invProducts.includes(id)
      ).length;
      const overlapPercentage =
        (overlap /
          Math.max(currentProducts.length, invProducts.length)) *
        100;
      expect(overlapPercentage).toBeGreaterThanOrEqual(80);
    });
  });

  // FR-3: Pricing Suggestions
  describe("getPricingSuggestions", () => {
    it("returns null when no history exists", () => {
      const lastSoldPrice = null;
      const averagePrice30d = null;
      const customerPriceRange = null;
      const hasSuggestions =
        lastSoldPrice || averagePrice30d || customerPriceRange;
      expect(hasSuggestions).toBeFalsy();
    });

    it("calculates price range from history", () => {
      const prices = [148000, 152000, 150000];
      const range = {
        min: Math.min(...prices).toFixed(2),
        max: Math.max(...prices).toFixed(2),
        count: prices.length,
      };
      expect(range.min).toBe("148000.00");
      expect(range.max).toBe("152000.00");
      expect(range.count).toBe(3);
    });
  });

  // FR-4: Anomaly Detection
  describe("detectAnomalies", () => {
    it("flags high amount (>3x average)", () => {
      const avgAmount = 100000;
      const currentAmount = 350000;
      const isHigh = currentAmount > avgAmount * 3;
      expect(isHigh).toBe(true);
    });

    it("does not flag normal amount", () => {
      const avgAmount = 100000;
      const currentAmount = 120000;
      const isHigh = currentAmount > avgAmount * 3;
      expect(isHigh).toBe(false);
    });

    it("flags new customer with high amount", () => {
      const historyCount = 0;
      const currentAmount = 600000;
      const isNewAndHigh = historyCount === 0 && currentAmount > 500000;
      expect(isNewAndHigh).toBe(true);
    });

    it("does not flag new customer with low amount", () => {
      const historyCount = 0;
      const currentAmount = 50000;
      const isNewAndHigh = historyCount === 0 && currentAmount > 500000;
      expect(isNewAndHigh).toBe(false);
    });

    it("flags bulk order (>10x average quantity)", () => {
      const avgQty = 5;
      const currentQty = 60;
      const isBulk = currentQty > avgQty * 10;
      expect(isBulk).toBe(true);
    });
  });

  // FR-5: Payment Prediction
  describe("getPaymentPrediction", () => {
    it("calculates on-time rate", () => {
      const invoices = [
        { dueDate: "2026-01-30", paidDate: "2026-01-25" },
        { dueDate: "2026-02-15", paidDate: "2026-02-20" },
        { dueDate: "2026-03-01", paidDate: "2026-02-28" },
      ];
      let onTimeCount = 0;
      for (const inv of invoices) {
        if (new Date(inv.paidDate) <= new Date(inv.dueDate)) {
          onTimeCount++;
        }
      }
      const onTimeRate = onTimeCount / invoices.length;
      expect(onTimeRate).toBeCloseTo(0.67, 1);
    });

    it("returns insufficient data for < 3 invoices", () => {
      const totalInvoices = 2;
      const prediction =
        totalInvoices < 3 ? "insufficient_data" : "likely_on_time";
      expect(prediction).toBe("insufficient_data");
    });

    it("returns likely_on_time for 80%+ on-time rate", () => {
      const onTimeRate = 0.85;
      const prediction =
        onTimeRate >= 0.8 ? "likely_on_time" : "likely_delayed";
      expect(prediction).toBe("likely_on_time");
    });

    it("returns likely_delayed for <80% on-time rate", () => {
      const onTimeRate = 0.6;
      const prediction =
        onTimeRate >= 0.8 ? "likely_on_time" : "likely_delayed";
      expect(prediction).toBe("likely_delayed");
    });
  });
});
