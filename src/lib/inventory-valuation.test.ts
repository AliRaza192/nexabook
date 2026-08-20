import { describe, it, expect } from "vitest";

/**
 * FIFO valuation: consume stock from oldest batches first.
 * Weighted average: value all stock at the average cost across all batches.
 *
 * These two methods MUST produce different results when batch costs differ.
 */

function fifoValue(
  batches: { qty: number; cost: number }[],
  currentStock: number
): { totalValue: number; unitCost: number } {
  let remaining = currentStock;
  let totalValue = 0;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const valuedQty = Math.min(batch.qty, remaining);
    totalValue += valuedQty * batch.cost;
    remaining -= valuedQty;
  }

  return {
    totalValue,
    unitCost: currentStock > 0 ? totalValue / currentStock : 0,
  };
}

function weightedAverageValue(
  batches: { qty: number; cost: number }[],
  currentStock: number
): { totalValue: number; unitCost: number } {
  let totalQty = 0;
  let totalCost = 0;

  for (const batch of batches) {
    totalQty += batch.qty;
    totalCost += batch.qty * batch.cost;
  }

  const unitCost = totalQty > 0 ? totalCost / totalQty : 0;
  return {
    totalValue: currentStock * unitCost,
    unitCost,
  };
}

describe("FIFO vs Weighted Average valuation", () => {
  it("produces different results when batch costs differ", () => {
    const batches = [
      { qty: 10, cost: 100 },  // Oldest batch
      { qty: 5, cost: 200 },   // Newer batch (more expensive)
    ];
    const currentStock = 8;

    const fifo = fifoValue(batches, currentStock);
    const wac = weightedAverageValue(batches, currentStock);

    // FIFO: consume 8 from oldest batch @ Rs. 100 = Rs. 800
    expect(fifo.totalValue).toBe(800);
    expect(fifo.unitCost).toBe(100);

    // WAC: (10*100 + 5*200) / 15 = Rs. 133.33/unit → 8 * 133.33 = Rs. 1,066.67
    expect(wac.totalValue).toBeCloseTo(1066.67, 2);
    expect(wac.unitCost).toBeCloseTo(133.33, 2);

    // They MUST differ
    expect(fifo.totalValue).not.toBe(wac.totalValue);
    expect(fifo.unitCost).not.toBe(wac.unitCost);
  });

  it("FIFO consumes from oldest batches first", () => {
    const batches = [
      { qty: 5, cost: 50 },   // Oldest: 5 units
      { qty: 10, cost: 100 }, // Newer: 10 units
      { qty: 3, cost: 200 },  // Newest: 3 units
    ];
    const currentStock = 12;

    const fifo = fifoValue(batches, currentStock);

    // Consume: 5 @ 50 + 7 @ 100 = 250 + 700 = 950
    expect(fifo.totalValue).toBe(950);
    expect(fifo.unitCost).toBeCloseTo(79.17, 2);
  });

  it("FIFO handles stock less than oldest batch", () => {
    const batches = [
      { qty: 20, cost: 150 },
      { qty: 10, cost: 250 },
    ];
    const currentStock = 8;

    const fifo = fifoValue(batches, currentStock);

    // All 8 come from oldest batch @ 150
    expect(fifo.totalValue).toBe(1200);
    expect(fifo.unitCost).toBe(150);
  });

  it("handles zero stock", () => {
    const batches = [{ qty: 10, cost: 100 }];
    const fifo = fifoValue(batches, 0);
    const wac = weightedAverageValue(batches, 0);

    expect(fifo.totalValue).toBe(0);
    expect(wac.totalValue).toBe(0);
  });

  it("handles single batch", () => {
    const batches = [{ qty: 10, cost: 100 }];
    const fifo = fifoValue(batches, 10);
    const wac = weightedAverageValue(batches, 10);

    // Both should produce same result for single batch
    expect(fifo.totalValue).toBe(wac.totalValue);
    expect(fifo.unitCost).toBe(wac.unitCost);
  });
});
