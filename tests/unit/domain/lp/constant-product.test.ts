import {
  initialReserves,
  lpAmountsAtPrice,
  lpPnlAtPrice,
  lpValueAtPrice,
  validateLPPositionConfig,
  type LPPositionConfig,
} from "@/domain/lp";

const CONFIG: LPPositionConfig = { entryPrice: 150, initialValueStable: 3000 };

describe("initialReserves", () => {
  it("splits the initial value 50/50 at the entry price", () => {
    const reserves = initialReserves(CONFIG);
    expect(reserves.amountStable).toBeCloseTo(1500, 9);
    expect(reserves.amountVolatile).toBeCloseTo(10, 9);
  });

  it("throws on non-positive inputs", () => {
    expect(() => initialReserves({ entryPrice: 0, initialValueStable: 3000 })).toThrow(RangeError);
    expect(() => initialReserves({ entryPrice: 150, initialValueStable: -1 })).toThrow(RangeError);
  });
});

describe("lpValueAtPrice", () => {
  it("returns the initial value at the entry price", () => {
    expect(lpValueAtPrice(CONFIG, 150)).toBeCloseTo(3000, 9);
  });

  it("scales with sqrt(P/P0): 4x price doubles value, quarter price halves it", () => {
    expect(lpValueAtPrice(CONFIG, 600)).toBeCloseTo(6000, 9);
    expect(lpValueAtPrice(CONFIG, 37.5)).toBeCloseTo(1500, 9);
  });

  it("is multiplicatively symmetric around the entry price", () => {
    // V(P) = V0·sqrt(P/P0): a 2x price move up gains sqrt(2)-1, a 2x move
    // down loses 1-sqrt(1/2). The value ratios multiply to exactly 1.
    const up = lpValueAtPrice(CONFIG, 300);
    const down = lpValueAtPrice(CONFIG, 75);
    expect((up / 3000) * (down / 3000)).toBeCloseTo(1, 9);
    expect(up / 3000).toBeCloseTo(Math.SQRT2, 9);
    expect(down / 3000).toBeCloseTo(1 / Math.SQRT2, 9);
  });

  it("throws on non-positive scenario prices", () => {
    expect(() => lpValueAtPrice(CONFIG, 0)).toThrow(RangeError);
    expect(() => lpValueAtPrice(CONFIG, -5)).toThrow(RangeError);
  });
});

describe("lpAmountsAtPrice", () => {
  it("returns the entry reserves at the entry price", () => {
    const amounts = lpAmountsAtPrice(CONFIG, 150);
    expect(amounts.amountVolatile).toBeCloseTo(10, 9);
    expect(amounts.amountStable).toBeCloseTo(1500, 9);
  });

  it("sells volatile as price rises and buys as it falls", () => {
    const high = lpAmountsAtPrice(CONFIG, 600);
    expect(high.amountVolatile).toBeCloseTo(5, 9);
    expect(high.amountStable).toBeCloseTo(3000, 9);

    const low = lpAmountsAtPrice(CONFIG, 37.5);
    expect(low.amountVolatile).toBeCloseTo(20, 9);
    expect(low.amountStable).toBeCloseTo(750, 9);
  });

  it("preserves the x·y = k invariant across prices", () => {
    const k = 10 * 1500;
    for (const price of [10, 37.5, 75, 150, 300, 600, 1200]) {
      const amounts = lpAmountsAtPrice(CONFIG, price);
      expect(amounts.amountVolatile * amounts.amountStable).toBeCloseTo(k, 6);
    }
  });
});

describe("lpPnlAtPrice", () => {
  it("is zero at the entry price", () => {
    expect(lpPnlAtPrice(CONFIG, 150)).toBeCloseTo(0, 9);
  });

  it("is positive above and negative below entry", () => {
    expect(lpPnlAtPrice(CONFIG, 600)).toBeCloseTo(3000, 9);
    expect(lpPnlAtPrice(CONFIG, 37.5)).toBeCloseTo(-1500, 9);
  });
});

describe("validateLPPositionConfig", () => {
  it("accepts a valid config", () => {
    expect(validateLPPositionConfig(CONFIG)).toEqual([]);
  });

  it("rejects non-positive or non-finite values", () => {
    expect(validateLPPositionConfig({ entryPrice: 0, initialValueStable: 3000 }).length).toBe(1);
    expect(validateLPPositionConfig({ entryPrice: 150, initialValueStable: Number.NaN }).length).toBe(1);
    expect(
      validateLPPositionConfig({ entryPrice: -150, initialValueStable: -3000 }).length,
    ).toBe(2);
  });
});
