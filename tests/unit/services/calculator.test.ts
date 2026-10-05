import { computeClmmScenarios, computeScenarios, validateScenarioPrices } from "@/services/calculator";
import { liquidityFromInitialValue, type CLMMConfig } from "@/domain/clmm";
import {
  lpAmountsAtPrice,
  lpPnlAtPrice,
  lpValueAtPrice,
  type LPPositionConfig,
} from "@/domain/lp";
import {
  shortNotionalAtEntry,
  shortPnlAtPrice,
  shortQuantityAtEntry,
  type HedgeConfig,
} from "@/domain/hedge";

const LP: LPPositionConfig = { entryPrice: 150, initialValueStable: 3000 };
const FIXED: HedgeConfig = { mode: "fixed", ratio: 0.5 };

describe("validateScenarioPrices", () => {
  it("accepts a non-empty ladder of positive finite prices", () => {
    expect(validateScenarioPrices([75, 150, 225])).toEqual([]);
    expect(validateScenarioPrices([1])).toEqual([]);
  });

  it("rejects an empty ladder", () => {
    expect(validateScenarioPrices([]).length).toBe(1);
  });

  it("rejects zero, negative, and non-finite prices", () => {
    expect(validateScenarioPrices([0, 150]).length).toBe(1);
    expect(validateScenarioPrices([-1, 150]).length).toBe(1);
    expect(validateScenarioPrices([Number.NaN, 150]).length).toBe(1);
    expect(validateScenarioPrices([Number.POSITIVE_INFINITY]).length).toBe(1);
  });
});

describe("computeScenarios", () => {
  it("produces one point per price, in the same order", () => {
    const prices = [75, 100, 150, 225, 300];
    const result = computeScenarios(LP, FIXED, prices);
    expect(result.points.map((p) => p.price)).toEqual(prices);
    expect(result.points).toHaveLength(prices.length);
  });

  it("reports the entry summary: initial value, hedge quantity, and notional", () => {
    const result = computeScenarios(LP, FIXED, [150]);
    expect(result.summary.initialLpValue).toBeCloseTo(3000, 9);
    // quantity = 0.5 · (3000/2)/150 = 5; notional = 5 · 150 = 750
    expect(result.summary.hedgeQuantity).toBeCloseTo(5, 9);
    expect(result.summary.hedgeNotionalAtEntry).toBeCloseTo(750, 9);
  });

  it("is flat at the entry price: no LP PnL, no hedge PnL, no combined PnL", () => {
    const point = computeScenarios(LP, FIXED, [150]).points[0];
    expect(point.lpPnl).toBeCloseTo(0, 9);
    expect(point.hedgePnl).toBeCloseTo(0, 9);
    expect(point.combinedPnl).toBeCloseTo(0, 9);
    expect(point.lpValue).toBeCloseTo(3000, 9);
    expect(point.amountVolatile).toBeCloseTo(10, 9);
    expect(point.amountStable).toBeCloseTo(1500, 9);
  });

  it("matches the domain engines exactly at each price", () => {
    const prices = [75, 100, 150, 225, 300];
    const result = computeScenarios(LP, FIXED, prices);
    for (const point of result.points) {
      const amounts = lpAmountsAtPrice(LP, point.price);
      expect(point.amountVolatile).toBeCloseTo(amounts.amountVolatile, 9);
      expect(point.amountStable).toBeCloseTo(amounts.amountStable, 9);
      expect(point.lpValue).toBeCloseTo(lpValueAtPrice(LP, point.price), 9);
      expect(point.lpPnl).toBeCloseTo(lpPnlAtPrice(LP, point.price), 9);
      expect(point.hedgePnl).toBeCloseTo(shortPnlAtPrice(FIXED, LP, point.price), 9);
    }
    expect(result.summary.hedgeQuantity).toBeCloseTo(shortQuantityAtEntry(FIXED, LP), 9);
    expect(result.summary.hedgeNotionalAtEntry).toBeCloseTo(shortNotionalAtEntry(FIXED, LP), 9);
  });

  it("combines PnL as lpPnl + hedgePnl", () => {
    const result = computeScenarios(LP, FIXED, [75, 100, 150, 225, 300]);
    for (const point of result.points) {
      expect(point.combinedPnl).toBeCloseTo(point.lpPnl + point.hedgePnl, 9);
    }
  });

  it("short hedge softens losses below entry and caps gains above it", () => {
    const [low, high] = computeScenarios(LP, FIXED, [100, 300]).points;
    // Below entry: hedge gains, so combined PnL is better than LP-only.
    expect(low.hedgePnl).toBeGreaterThan(0);
    expect(low.combinedPnl).toBeGreaterThan(low.lpPnl);
    // Above entry: hedge loses, so combined PnL is worse than LP-only.
    expect(high.hedgePnl).toBeLessThan(0);
    expect(high.combinedPnl).toBeLessThan(high.lpPnl);
  });

  it("treats mode none as unhedged: combined equals LP PnL", () => {
    const result = computeScenarios(LP, { mode: "none", ratio: 0.5 }, [100, 150, 300]);
    expect(result.summary.hedgeQuantity).toBe(0);
    expect(result.summary.hedgeNotionalAtEntry).toBe(0);
    for (const point of result.points) {
      expect(point.hedgePnl).toBe(0);
      expect(point.combinedPnl).toBeCloseTo(point.lpPnl, 9);
    }
  });

  it("throws on an invalid price ladder", () => {
    expect(() => computeScenarios(LP, FIXED, [])).toThrow(RangeError);
    expect(() => computeScenarios(LP, FIXED, [0])).toThrow(RangeError);
    expect(() => computeScenarios(LP, FIXED, [-1, 150])).toThrow(RangeError);
    expect(() => computeScenarios(LP, FIXED, [Number.NaN])).toThrow(RangeError);
  });
});

/** Geometric default — entry split is exactly 10 volatile / 1500 stable. */
const CLMM: CLMMConfig = {
  entryPrice: 150,
  lowerPrice: 100,
  upperPrice: 225,
  initialValueStable: 3000,
};

describe("computeClmmScenarios (Phase 2, exact model)", () => {
  it("reports the entry summary: value, liquidity, amounts, hedge, deltas", () => {
    const { summary } = computeClmmScenarios(CLMM, FIXED, [150]);
    expect(summary.initialLpValue).toBeCloseTo(3000, 9);
    expect(summary.liquidityL).toBeCloseTo(liquidityFromInitialValue(CLMM), 9);
    expect(summary.initialAmountVolatile).toBeCloseTo(10, 6);
    expect(summary.initialAmountStable).toBeCloseTo(1500, 6);
    // q = ratio · initial volatile = 0.5 · 10 = 5; notional = 750
    expect(summary.hedgeQuantity).toBeCloseTo(5, 9);
    expect(summary.hedgeNotionalAtEntry).toBeCloseTo(750, 9);
    expect(summary.netDeltaAtEntry).toBeCloseTo(summary.lpDeltaAtEntry - 5, 9);
  });

  it("is flat at entry: zero PnL, zero IL, HODL parity, in range", () => {
    const point = computeClmmScenarios(CLMM, FIXED, [150]).points[0];
    expect(point.rangeStatus).toBe("IN_RANGE");
    expect(point.lpPnl).toBeCloseTo(0, 9);
    expect(point.hedgePnl).toBeCloseTo(0, 9);
    expect(point.combinedPnl).toBeCloseTo(0, 9);
    expect(point.hodlValue).toBeCloseTo(3000, 9);
    expect(point.il).toBeCloseTo(0, 9);
  });

  it("produces one point per price with combined = lpPnl + hedgePnl", () => {
    const prices = [50, 80, 100, 150, 225, 300, 1000];
    const result = computeClmmScenarios(CLMM, FIXED, prices);
    expect(result.points.map((p) => p.price)).toEqual(prices);
    for (const point of result.points) {
      expect(point.combinedPnl).toBeCloseTo(point.lpPnl + point.hedgePnl, 9);
    }
  });

  it("keeps the IL identity il = lpValue − hodlValue everywhere", () => {
    const result = computeClmmScenarios(CLMM, FIXED, [50, 120, 150, 200, 300]);
    for (const point of result.points) {
      expect(point.il).toBeCloseTo(point.lpValue - point.hodlValue, 9);
      expect(point.il).toBeLessThanOrEqual(1e-9); // LP never beats HODL here
    }
  });

  it("classifies range status, including boundary prices", () => {
    const result = computeClmmScenarios(CLMM, FIXED, [99.99, 100, 150, 225, 225.01]);
    const statuses = result.points.map((p) => p.rangeStatus);
    expect(statuses).toEqual([
      "BELOW_RANGE",
      "BELOW_RANGE",
      "IN_RANGE",
      "ABOVE_RANGE",
      "ABOVE_RANGE",
    ]);
  });

  it("holds pure volatile below the range and pure stable above it", () => {
    const [below, above] = computeClmmScenarios(CLMM, FIXED, [80, 300]).points;
    expect(below.amountStable).toBe(0);
    expect(below.amountVolatile).toBeCloseTo((liquidityFromInitialValue(CLMM) * 5) / 150, 6);
    expect(above.amountVolatile).toBe(0);
    expect(above.amountStable).toBeCloseTo(liquidityFromInitialValue(CLMM) * 5, 6);
  });

  it("net delta = LP delta − hedge quantity at every price", () => {
    const result = computeClmmScenarios(CLMM, FIXED, [80, 120, 150, 200, 300]);
    for (const point of result.points) {
      expect(point.netDelta).toBeCloseTo(point.lpDelta - 5, 9);
    }
  });

  it("hedge softens losses below entry and caps gains above it", () => {
    const [below, above] = computeClmmScenarios(CLMM, FIXED, [120, 200]).points;
    expect(below.hedgePnl).toBeGreaterThan(0);
    expect(below.combinedPnl).toBeGreaterThan(below.lpPnl);
    expect(above.hedgePnl).toBeLessThan(0);
    expect(above.combinedPnl).toBeLessThan(above.lpPnl);
  });

  it("treats mode none as unhedged", () => {
    const { summary, points } = computeClmmScenarios(CLMM, { mode: "none", ratio: 0.5 }, [120, 200]);
    expect(summary.hedgeQuantity).toBe(0);
    expect(summary.netDeltaAtEntry).toBeCloseTo(summary.lpDeltaAtEntry, 9);
    for (const point of points) {
      expect(point.hedgePnl).toBe(0);
      expect(point.combinedPnl).toBeCloseTo(point.lpPnl, 9);
    }
  });

  it("throws on an invalid CLMM config or price ladder", () => {
    expect(() =>
      computeClmmScenarios({ ...CLMM, lowerPrice: 200, upperPrice: 100 }, FIXED, [150]),
    ).toThrow(RangeError);
    expect(() => computeClmmScenarios(CLMM, FIXED, [])).toThrow(RangeError);
    expect(() => computeClmmScenarios(CLMM, FIXED, [0])).toThrow(RangeError);
  });
});
