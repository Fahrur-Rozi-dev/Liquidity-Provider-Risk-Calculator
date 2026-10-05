import {
  shortNotionalAtEntry,
  shortPnlAtPrice,
  shortPnlForQuantity,
  shortQuantityAtEntry,
  shortQuantityForExposure,
  validateHedgeConfig,
  type HedgeConfig,
} from "@/domain/hedge";
import type { LPPositionConfig } from "@/domain/lp";

const LP: LPPositionConfig = { entryPrice: 150, initialValueStable: 3000 };

const FIXED: HedgeConfig = { mode: "fixed", ratio: 0.5 };

describe("shortQuantityAtEntry", () => {
  it("scales the volatile-side exposure by the ratio", () => {
    // volatile side = 3000/2 = 1500; quantity = 0.5 · 1500/150 = 5
    expect(shortQuantityAtEntry(FIXED, LP)).toBeCloseTo(5, 9);
    expect(shortQuantityAtEntry({ mode: "fixed", ratio: 1 }, LP)).toBeCloseTo(10, 9);
  });

  it("is zero for mode none and for ratio zero", () => {
    expect(shortQuantityAtEntry({ mode: "none", ratio: 0.5 }, LP)).toBe(0);
    expect(shortQuantityAtEntry({ mode: "fixed", ratio: 0 }, LP)).toBe(0);
  });

  it("throws when the ratio is out of range", () => {
    expect(() => shortQuantityAtEntry({ mode: "fixed", ratio: 1.5 }, LP)).toThrow(RangeError);
    expect(() => shortQuantityAtEntry({ mode: "fixed", ratio: -0.1 }, LP)).toThrow(RangeError);
  });
});

describe("shortNotionalAtEntry", () => {
  it("values the short at the entry price", () => {
    expect(shortNotionalAtEntry(FIXED, LP)).toBeCloseTo(750, 9);
    expect(shortNotionalAtEntry({ mode: "none", ratio: 0.5 }, LP)).toBe(0);
  });
});

describe("shortPnlAtPrice", () => {
  it("is zero at the entry price", () => {
    expect(shortPnlAtPrice(FIXED, LP, 150)).toBeCloseTo(0, 9);
  });

  it("profits when price falls and loses when it rises", () => {
    expect(shortPnlAtPrice(FIXED, LP, 100)).toBeCloseTo(250, 9);
    expect(shortPnlAtPrice(FIXED, LP, 200)).toBeCloseTo(-250, 9);
  });

  it("is zero for mode none at any price", () => {
    expect(shortPnlAtPrice({ mode: "none", ratio: 0.5 }, LP, 100)).toBe(0);
  });

  it("throws on non-positive prices", () => {
    expect(() => shortPnlAtPrice(FIXED, LP, 0)).toThrow(RangeError);
  });
});

describe("validateHedgeConfig", () => {
  it("accepts none/fixed modes with ratio in 0..1", () => {
    expect(validateHedgeConfig(FIXED)).toEqual([]);
    expect(validateHedgeConfig({ mode: "none", ratio: 0 })).toEqual([]);
  });

  it("rejects out-of-range ratios and unknown modes", () => {
    expect(validateHedgeConfig({ mode: "fixed", ratio: 1.5 }).length).toBe(1);
    expect(validateHedgeConfig({ mode: "fixed", ratio: -0.1 }).length).toBe(1);
    expect(validateHedgeConfig({ mode: "dynamic" as HedgeConfig["mode"], ratio: 0.5 }).length).toBe(
      1,
    );
  });
});

describe("shortNotionalAtEntry with ratio zero (Phase 2 regression)", () => {
  it("returns 0 — a zero-size hedge is valid, not an error", () => {
    expect(shortNotionalAtEntry({ mode: "fixed", ratio: 0 }, LP)).toBe(0);
  });
});

describe("shortQuantityForExposure (Phase 2: quantity from explicit exposure)", () => {
  it("sizes the short from the volatile-side exposure at entry", () => {
    // exposure = 10 SOL · 150 = 1500 stable; q = 0.5 · 1500 / 150 = 5
    expect(shortQuantityForExposure(FIXED, 1500, 150)).toBeCloseTo(5, 9);
    expect(shortQuantityForExposure({ mode: "fixed", ratio: 1 }, 1500, 150)).toBeCloseTo(10, 9);
  });

  it("is zero for mode none", () => {
    expect(shortQuantityForExposure({ mode: "none", ratio: 0.5 }, 1500, 150)).toBe(0);
  });

  it("throws on out-of-range ratio or non-positive exposure/price", () => {
    expect(() => shortQuantityForExposure({ mode: "fixed", ratio: 1.5 }, 1500, 150)).toThrow(
      RangeError,
    );
    expect(() => shortQuantityForExposure(FIXED, 0, 150)).toThrow(RangeError);
    expect(() => shortQuantityForExposure(FIXED, 1500, 0)).toThrow(RangeError);
  });
});

describe("shortPnlForQuantity (Phase 2: quantity-based PnL)", () => {
  it("is q · (P0 − P)", () => {
    expect(shortPnlForQuantity(5, 150, 100)).toBeCloseTo(250, 9);
    expect(shortPnlForQuantity(5, 150, 200)).toBeCloseTo(-250, 9);
    expect(shortPnlForQuantity(0, 150, 100)).toBe(0);
  });

  it("agrees with shortPnlAtPrice for the same effective quantity", () => {
    // Phase 1 path: q = 0.5 · (3000/2)/150 = 5 — same as quantity 5.
    expect(shortPnlForQuantity(5, 150, 120)).toBeCloseTo(shortPnlAtPrice(FIXED, LP, 120), 9);
  });

  it("throws on negative quantity or non-positive prices", () => {
    expect(() => shortPnlForQuantity(-1, 150, 100)).toThrow(RangeError);
    expect(() => shortPnlForQuantity(5, 0, 100)).toThrow(RangeError);
    expect(() => shortPnlForQuantity(5, 150, 0)).toThrow(RangeError);
  });
});
