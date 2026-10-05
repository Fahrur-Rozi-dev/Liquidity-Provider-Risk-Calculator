import {
  clmmAmountsAtPrice,
  clmmDeltaAtPrice,
  clmmPnlAtPrice,
  clmmValueAtPrice,
  initialCLMMAmounts,
  liquidityFromInitialValue,
  rangeStatusAtPrice,
  validateCLMMConfig,
  type CLMMConfig,
} from "@/domain/clmm";

/**
 * Geometric default: Pa = 100, P0 = 150, Pb = 225 with sa·sb = s0² (√100·√225
 * = 150 = √150²), so the entry split is exactly 10 volatile / 1500 stable.
 */
const CONFIG: CLMMConfig = {
  entryPrice: 150,
  lowerPrice: 100,
  upperPrice: 225,
  initialValueStable: 3000,
};

describe("validateCLMMConfig", () => {
  it("accepts a valid in-range config", () => {
    expect(validateCLMMConfig(CONFIG)).toEqual([]);
  });

  it("rejects non-positive or non-finite values", () => {
    expect(validateCLMMConfig({ ...CONFIG, entryPrice: 0 }).length).toBe(1);
    expect(validateCLMMConfig({ ...CONFIG, lowerPrice: -1 }).length).toBe(1);
    expect(validateCLMMConfig({ ...CONFIG, upperPrice: Number.NaN }).length).toBe(1);
    expect(validateCLMMConfig({ ...CONFIG, initialValueStable: 0 }).length).toBe(1);
  });

  it("rejects an inverted range", () => {
    expect(validateCLMMConfig({ ...CONFIG, lowerPrice: 225, upperPrice: 100 }).length).toBe(1);
    expect(validateCLMMConfig({ ...CONFIG, lowerPrice: 150, upperPrice: 150 }).length).toBe(1);
  });

  it("requires in-range entry and says so explicitly (docs/04)", () => {
    const below = validateCLMMConfig({ ...CONFIG, entryPrice: 50 });
    expect(below.some((e) => e.includes("In-range entry"))).toBe(true);
    const above = validateCLMMConfig({ ...CONFIG, entryPrice: 300 });
    expect(above.some((e) => e.includes("In-range entry"))).toBe(true);
    // Boundary entry is out-of-range too: P0 must be strictly inside.
    expect(validateCLMMConfig({ ...CONFIG, entryPrice: 100 }).length).toBe(1);
    expect(validateCLMMConfig({ ...CONFIG, entryPrice: 225 }).length).toBe(1);
  });
});

describe("liquidityFromInitialValue", () => {
  it("derives liquidity so the entry value equals V0", () => {
    const L = liquidityFromInitialValue(CONFIG);
    expect(L).toBeGreaterThan(0);
    const amounts = initialCLMMAmounts(CONFIG);
    expect(amounts.amountVolatile * CONFIG.entryPrice + amounts.amountStable).toBeCloseTo(3000, 6);
  });

  it("splits 10 volatile / 1500 stable for the geometric default", () => {
    const amounts = initialCLMMAmounts(CONFIG);
    expect(amounts.amountVolatile).toBeCloseTo(10, 6);
    expect(amounts.amountStable).toBeCloseTo(1500, 6);
  });

  it("throws for out-of-range entry — the derivation formula does not apply", () => {
    expect(() => liquidityFromInitialValue({ ...CONFIG, entryPrice: 50 })).toThrow(RangeError);
    expect(() => liquidityFromInitialValue({ ...CONFIG, entryPrice: 300 })).toThrow(RangeError);
  });
});

describe("clmmAmountsAtPrice", () => {
  const L = liquidityFromInitialValue(CONFIG);

  it("holds only volatile below the range and only stable above it", () => {
    const below = clmmAmountsAtPrice(CONFIG, L, 80);
    expect(below.amountStable).toBe(0);
    // amount0 = L·(sb − sa)/(sa·sb) = L·5/150
    expect(below.amountVolatile).toBeCloseTo((L * 5) / 150, 6);

    const above = clmmAmountsAtPrice(CONFIG, L, 300);
    expect(above.amountVolatile).toBe(0);
    expect(above.amountStable).toBeCloseTo(L * 5, 6);
  });

  it("is continuous at the exact boundaries (docs/04 branch limits)", () => {
    const atLower = clmmAmountsAtPrice(CONFIG, L, 100);
    const justInsideLower = clmmAmountsAtPrice(CONFIG, L, 100 + 1e-6);
    expect(atLower.amountVolatile).toBeCloseTo(justInsideLower.amountVolatile, 4);
    expect(atLower.amountStable).toBeCloseTo(justInsideLower.amountStable, 4);

    const atUpper = clmmAmountsAtPrice(CONFIG, L, 225);
    const justInsideUpper = clmmAmountsAtPrice(CONFIG, L, 225 - 1e-6);
    expect(atUpper.amountVolatile).toBeCloseTo(justInsideUpper.amountVolatile, 4);
    expect(atUpper.amountStable).toBeCloseTo(justInsideUpper.amountStable, 4);
  });

  it("matches the docs/04 in-range formulas at a sample price", () => {
    const price = 180;
    const s = Math.sqrt(price);
    const sa = Math.sqrt(100);
    const sb = Math.sqrt(225);
    const amounts = clmmAmountsAtPrice(CONFIG, L, price);
    expect(amounts.amountVolatile).toBeCloseTo((L * (sb - s)) / (s * sb), 6);
    expect(amounts.amountStable).toBeCloseTo(L * (s - sa), 6);
  });

  it("accepts scenario prices far outside the range (docs/04 allows it)", () => {
    expect(() => clmmAmountsAtPrice(CONFIG, L, 10)).not.toThrow();
    expect(() => clmmAmountsAtPrice(CONFIG, L, 1000)).not.toThrow();
  });
});

describe("clmmValueAtPrice", () => {
  const L = liquidityFromInitialValue(CONFIG);

  it("equals V0 at the entry price", () => {
    expect(clmmValueAtPrice(CONFIG, L, 150)).toBeCloseTo(3000, 6);
  });

  it("is linear (pure volatile) below the range and constant above it", () => {
    const xBelow = clmmAmountsAtPrice(CONFIG, L, 80).amountVolatile;
    expect(clmmValueAtPrice(CONFIG, L, 80)).toBeCloseTo(xBelow * 80, 6);
    expect(clmmValueAtPrice(CONFIG, L, 300)).toBeCloseTo(L * 5, 6);
    expect(clmmValueAtPrice(CONFIG, L, 1000)).toBeCloseTo(L * 5, 6);
  });

  it("is continuous across both boundaries", () => {
    const atLower = clmmValueAtPrice(CONFIG, L, 100);
    const justInsideLower = clmmValueAtPrice(CONFIG, L, 100 + 1e-6);
    expect(atLower).toBeCloseTo(justInsideLower, 4);

    const atUpper = clmmValueAtPrice(CONFIG, L, 225);
    const justInsideUpper = clmmValueAtPrice(CONFIG, L, 225 - 1e-6);
    expect(atUpper).toBeCloseTo(justInsideUpper, 4);
  });
});

describe("clmmPnlAtPrice", () => {
  const L = liquidityFromInitialValue(CONFIG);

  it("is zero at entry", () => {
    expect(clmmPnlAtPrice(CONFIG, L, 150)).toBeCloseTo(0, 9);
  });

  it("underperforms HODL on both sides of the range (concentrated liquidity)", () => {
    expect(clmmPnlAtPrice(CONFIG, L, 80)).toBeLessThan(0);
    // Vs the initial value, the above-range outcome can be positive; the
    // defining IL property is that LP always trails the HODL benchmark.
    const above = clmmPnlAtPrice(CONFIG, L, 300);
    const initial = initialCLMMAmounts(CONFIG);
    const hodlGain = initial.amountVolatile * 300 + initial.amountStable - 3000;
    expect(above).toBeLessThan(hodlGain);
  });
});

describe("clmmDeltaAtPrice", () => {
  const L = liquidityFromInitialValue(CONFIG);

  it("is constant (amount0) below the range and zero above it", () => {
    expect(clmmDeltaAtPrice(CONFIG, L, 50)).toBeCloseTo((L * 5) / 150, 6);
    expect(clmmDeltaAtPrice(CONFIG, L, 100)).toBeCloseTo((L * 5) / 150, 6);
    expect(clmmDeltaAtPrice(CONFIG, L, 225)).toBe(0);
    expect(clmmDeltaAtPrice(CONFIG, L, 400)).toBe(0);
  });

  it("is continuous at both boundaries (docs/04 boundary test)", () => {
    const belowDelta = (L * 5) / 150;
    const justInsideLower = clmmDeltaAtPrice(CONFIG, L, 100 + 1e-6);
    expect(justInsideLower).toBeCloseTo(belowDelta, 4);

    // In-range delta L·(1/s − 1/sb) → 0 as s → sb.
    expect(clmmDeltaAtPrice(CONFIG, L, 225 - 1e-6)).toBeCloseTo(0, 4);
  });

  it("matches the in-range spec formula L·(1/s − 1/sb)", () => {
    const price = 180;
    const expected = L * (1 / Math.sqrt(price) - 1 / Math.sqrt(225));
    expect(clmmDeltaAtPrice(CONFIG, L, price)).toBeCloseTo(expected, 6);
  });

  it("decreases monotonically in price inside the range", () => {
    const at120 = clmmDeltaAtPrice(CONFIG, L, 120);
    const at150 = clmmDeltaAtPrice(CONFIG, L, 150);
    const at200 = clmmDeltaAtPrice(CONFIG, L, 200);
    expect(at120).toBeGreaterThan(at150);
    expect(at150).toBeGreaterThan(at200);
  });
});

describe("rangeStatusAtPrice", () => {
  it("classifies per docs/04, with boundaries closed on the outside", () => {
    expect(rangeStatusAtPrice(CONFIG, 99.99)).toBe("BELOW_RANGE");
    expect(rangeStatusAtPrice(CONFIG, 100)).toBe("BELOW_RANGE"); // P <= Pa
    expect(rangeStatusAtPrice(CONFIG, 100.01)).toBe("IN_RANGE");
    expect(rangeStatusAtPrice(CONFIG, 150)).toBe("IN_RANGE");
    expect(rangeStatusAtPrice(CONFIG, 224.99)).toBe("IN_RANGE");
    expect(rangeStatusAtPrice(CONFIG, 225)).toBe("ABOVE_RANGE"); // P >= Pb
    expect(rangeStatusAtPrice(CONFIG, 300)).toBe("ABOVE_RANGE");
  });

  it("throws on non-positive scenario prices", () => {
    expect(() => rangeStatusAtPrice(CONFIG, 0)).toThrow(RangeError);
    expect(() => rangeStatusAtPrice(CONFIG, -5)).toThrow(RangeError);
  });
});
