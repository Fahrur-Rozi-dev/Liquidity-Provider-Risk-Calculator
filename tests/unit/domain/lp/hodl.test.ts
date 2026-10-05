import { hodlValueAtPrice, impermanentLoss } from "@/domain/lp";

const INITIAL = { amountVolatile: 10, amountStable: 1500 };

describe("hodlValueAtPrice", () => {
  it("values the unchanged initial quantities at any price", () => {
    expect(hodlValueAtPrice(INITIAL, 150)).toBeCloseTo(10 * 150 + 1500, 9);
    expect(hodlValueAtPrice(INITIAL, 100)).toBeCloseTo(2500, 9);
    expect(hodlValueAtPrice(INITIAL, 300)).toBeCloseTo(4500, 9);
  });

  it("is linear in price with slope = initial volatile quantity", () => {
    const up = hodlValueAtPrice(INITIAL, 200);
    const down = hodlValueAtPrice(INITIAL, 100);
    expect((up - down) / 100).toBeCloseTo(10, 9);
  });

  it("throws on non-positive prices", () => {
    expect(() => hodlValueAtPrice(INITIAL, 0)).toThrow(RangeError);
    expect(() => hodlValueAtPrice(INITIAL, -1)).toThrow(RangeError);
  });
});

describe("impermanentLoss", () => {
  it("is LP value minus HODL value (negative = LP underperforms)", () => {
    expect(impermanentLoss(2900, 3000)).toBeCloseTo(-100, 9);
    expect(impermanentLoss(3100, 3000)).toBeCloseTo(100, 9);
    expect(impermanentLoss(3000, 3000)).toBe(0);
  });

  it("throws on non-finite inputs", () => {
    expect(() => impermanentLoss(Number.NaN, 3000)).toThrow(RangeError);
    expect(() => impermanentLoss(3000, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
