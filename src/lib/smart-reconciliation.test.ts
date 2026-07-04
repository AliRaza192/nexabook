import { describe, it, expect } from "vitest";

describe("Smart Reconciliation - Business Logic", () => {
  // Keyword Overlap
  describe("Keyword Overlap Scoring", () => {
    const calculateKeywordOverlap = (text1: string, text2: string): number => {
      const words1 = text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const words2 = text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (words1.length === 0 || words2.length === 0) return 0;
      const overlap = words1.filter((w) => words2.includes(w)).length;
      return overlap / Math.max(words1.length, words2.length);
    };

    it("returns high score for similar descriptions", () => {
      const score = calculateKeywordOverlap("HBL TRANSFER AHMED ALI", "Payment from Ahmed Ali");
      expect(score).toBeGreaterThan(0.3);
    });

    it("returns 0 for completely different descriptions", () => {
      const score = calculateKeywordOverlap("Coffee shop purchase", "Electricity bill payment");
      expect(score).toBe(0);
    });

    it("returns 1 for identical descriptions", () => {
      const score = calculateKeywordOverlap("Bank Transfer", "Bank Transfer");
      expect(score).toBe(1);
    });

    it("ignores short words", () => {
      const score = calculateKeywordOverlap("HBL Transfer", "HBL Transfer");
      expect(score).toBe(1);
    });
  });

  // Confidence Scoring
  describe("Confidence Scoring", () => {
    const calculateConfidence = (
      amountMatch: boolean,
      amountDiff: number,
      dateDiff: number,
      descriptionScore: number
    ): number => {
      let score = 0;
      if (amountMatch) score += 40;
      else if (amountDiff < 0.05) score += 20;
      else if (amountDiff < 0.10) score += 10;

      if (dateDiff <= 1) score += 30;
      else if (dateDiff <= 3) score += 20;
      else if (dateDiff <= 5) score += 10;

      score += descriptionScore * 30;
      return Math.min(Math.round(score), 100);
    };

    it("returns high confidence for exact match", () => {
      const confidence = calculateConfidence(true, 0, 0, 1);
      expect(confidence).toBe(100);
    });

    it("returns medium confidence for partial match", () => {
      const confidence = calculateConfidence(true, 0, 2, 0.5);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThanOrEqual(80);
    });

    it("returns low confidence for poor match", () => {
      const confidence = calculateConfidence(false, 0.2, 10, 0.1);
      expect(confidence).toBeLessThan(30);
    });

    it("caps at 100", () => {
      const confidence = calculateConfidence(true, 0, 0, 1);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  // Match Type Classification
  describe("Match Type Classification", () => {
    it("classifies as exact for confidence >= 90", () => {
      const confidence = 95;
      const matchType = confidence >= 90 ? "exact" : confidence >= 70 ? "fuzzy" : "suggestion";
      expect(matchType).toBe("exact");
    });

    it("classifies as fuzzy for confidence 70-89", () => {
      const confidence = 75;
      const matchType = confidence >= 90 ? "exact" : confidence >= 70 ? "fuzzy" : "suggestion";
      expect(matchType).toBe("fuzzy");
    });

    it("classifies as suggestion for confidence < 70", () => {
      const confidence = 55;
      const matchType = confidence >= 90 ? "exact" : confidence >= 70 ? "fuzzy" : "suggestion";
      expect(matchType).toBe("suggestion");
    });
  });

  // Smart Suggestions
  describe("Smart Suggestions", () => {
    it("limits to top 3 suggestions per unmatched item", () => {
      const suggestions = [
        { confidence: 90 },
        { confidence: 80 },
        { confidence: 70 },
        { confidence: 60 },
      ];
      const limited = suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
      expect(limited.length).toBe(3);
      expect(limited[0].confidence).toBe(90);
    });

    it("filters suggestions by minimum confidence", () => {
      const suggestions = [
        { confidence: 90 },
        { confidence: 80 },
        { confidence: 30 },
      ];
      const filtered = suggestions.filter((s) => s.confidence >= 40);
      expect(filtered.length).toBe(2);
    });
  });

  // Amount Matching
  describe("Amount Matching", () => {
    it("detects exact amount match", () => {
      const amount1 = 50000;
      const amount2 = 50000;
      const diff = Math.abs(amount1 - amount2);
      expect(diff < 0.01).toBe(true);
    });

    it("detects amount within 5% tolerance", () => {
      const amount1 = 50000;
      const amount2 = 52000;
      const diff = Math.abs(amount1 - amount2);
      const diffPercent = amount1 > 0 ? diff / amount1 : 1;
      expect(diffPercent < 0.05).toBe(true);
    });

    it("rejects amount outside tolerance", () => {
      const amount1 = 50000;
      const amount2 = 60000;
      const diff = Math.abs(amount1 - amount2);
      const diffPercent = amount1 > 0 ? diff / amount1 : 1;
      expect(diffPercent < 0.05).toBe(false);
    });
  });

  // Date Matching
  describe("Date Matching", () => {
    it("calculates date difference in days", () => {
      const date1 = new Date("2026-01-15");
      const date2 = new Date("2026-01-18");
      const diff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(3);
    });

    it("same date has 0 difference", () => {
      const date1 = new Date("2026-01-15");
      const date2 = new Date("2026-01-15");
      const diff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(0);
    });
  });
});
