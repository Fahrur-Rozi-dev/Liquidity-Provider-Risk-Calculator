import {
  computePricePathScenario,
  feeIncomeForStep,
  validateFeeAssumption,
  validatePricePath,
  type FeeAssumption,
} from "@/domain/scenario";
import type { CLMMConfig } from "@/domain/clmm";

/**
 * Forward price-path scenario tests (Phase 4, docs/06): the path composes the
 * existing exact CLMM engine — what-if projections with below/in/above-range
 * outcomes, composition changes, HODL benchmark, IL, LP delta, explicit fees.
 */

const CLMM: CLMMConfig = {
  entryPrice: 150,
  lowerPrice: 100,
  upperPrice: 225,
  initialValueStable: 3000,
};

const FEES: FeeAssumption = { feeApr: 0.4, stepHours: 24 };

describe("validatePricePath", () => {
  it("requires at least one positive finite price", () => {
    expect(validatePricePath([])).toEqual(["A price path requires at least one price point."]);
    expect(validatePricePath([0])).toEqual(["All path prices must be positive finite numbers."]);
    expect(validatePricePath([Number.NaN])).toEqual(["All path prices must be positive finite numbers."]);
    expect(validatePricePath([150])).toEqual([]);
  });
});

describe("validateFeeAssumption", () => {
  it("accepts null and non-negative values", () => {
    expect(validateFeeAssumption(null)).toEqual([]);
    expect(validateFeeAssumption(FEES)).toEqual([]);
  });

  it("rejects negative APR and non-positive hours", () => {
    expect(validateFeeAssumption({ feeApr: -0.1, stepHours: 24 }).length).toBe(1);
    expect(validateFeeAssumption({ feeApr: 0.4, stepHours: 0 }).length).toBe(1);
  });
});

describe("feeIncomeForStep", () => {
  it("prorates the APR to the step duration", () => {
    // 0.4 APR on 3000 for a 24h day = 3000 · 0.4/365 ≈ 3.2877
    expect(feeIncomeForStep(FEES, 3000)).toBeCloseTo(3000 * (0.4 / 365), 6);
  });

  it("is zero for zero APR or zero value", () => {
    expect(feeIncomeForStep({ feeApr: 0, stepHours: 24 }, 3000)).toBe(0);
    expect(feeIncomeForStep(FEES, 0)).toBe(0);
  });
});

describe("computePricePathScenario — baseline", () => {
  it("exposes the current-state baseline from the CLMM engine", () => {
    const result = computePricePathScenario(CLMM, [150]);
    expect(result.baseline.entryPrice).toBe(150);
    expect(result.baseline.initialLpValue).toBe(3000);
    expect(result.baseline.lowerPrice).toBe(100);
    expect(result.baseline.upperPrice).toBe(225);
    expect(result.baseline.initialAmountVolatile).toBeGreaterThan(0);
    expect(result.baseline.initialAmountStable).toBeGreaterThan(0);
    expect(result.baseline.lpDelta).toBeGreaterThan(0);
    // Volatile exposure value at entry < total value (in-range position).
    expect(result.baseline.volatileExposureValue).toBeLessThan(3000);
  });

  it("flags when fees are included", () => {
    expect(computePricePathScenario(CLMM, [150]).includesFees).toBe(false);
    expect(computePricePathScenario(CLMM, [150], FEES).includesFees).toBe(true);
  });
});

describe("computePricePathScenario — steps", () => {
  const path = [75, 120, 150, 200, 300];

  it("produces one step per path price with correct range statuses", () => {
    const result = computePricePathScenario(CLMM, path);
    expect(result.steps.map((s) => s.rangeStatus)).toEqual([
      "BELOW_RANGE",
      "IN_RANGE",
      "IN_RANGE",
      "IN_RANGE",
      "ABOVE_RANGE",
    ]);
  });

  it("returns pure-volatile composition below the range and pure stable above", () => {
    const result = computePricePathScenario(CLMM, path);
    const below = result.steps[0];
    expect(below.amountStable).toBe(0);
    expect(below.amountVolatile).toBeCloseTo(result.baseline.liquidityL * ((Math.sqrt(225) - Math.sqrt(100)) / (Math.sqrt(100) * Math.sqrt(225))), 6);
    const above = result.steps[4];
    expect(above.amountVolatile).toBe(0);
    expect(above.amountStable).toBeCloseTo(result.baseline.liquidityL * (Math.sqrt(225) - Math.sqrt(100)), 6);
  });

  it("values at entry equal to the initial value", () => {
    const result = computePricePathScenario(CLMM, [150]);
    expect(result.steps[0].lpValue).toBeCloseTo(3000, 6);
    expect(result.steps[0].lpPnl).toBeCloseTo(0, 6);
  });

  it("benchmarks HODL at the SAME path price and keeps IL = LP − HODL", () => {
    const result = computePricePathScenario(CLMM, path);
    for (const step of result.steps) {
      const expectedHodl =
        result.baseline.initialAmountVolatile * step.price + result.baseline.initialAmountStable;
      expect(step.hodlValue).toBeCloseTo(expectedHodl, 6);
      expect(step.il).toBeCloseTo(step.lpValue - step.hodlValue, 6);
      // IL is ≤ 0 for a fee-less CLMM position away from entry.
      if (step.price !== 150) {
        expect(step.il).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it("keeps LP delta positive below/in range and zero above", () => {
    const result = computePricePathScenario(CLMM, path);
    const deltas = result.steps.map((s) => s.lpDelta);
    expect(deltas[0]).toBeGreaterThan(0);
    expect(deltas[1]).toBeGreaterThan(0);
    expect(deltas[4]).toBe(0);
  });

  it("is fee-less by default (cumulative fees stay 0)", () => {
    const result = computePricePathScenario(CLMM, path);
    for (const step of result.steps) {
      expect(step.cumulativeFees).toBe(0);
      expect(step.totalValue).toBeCloseTo(step.lpValue, 9);
    }
  });
});

describe("computePricePathScenario — explicit fee assumption (simplified model)", () => {
  it("accrues fees only for in-range steps and compounds cumulatively", () => {
    const result = computePricePathScenario(CLMM, [75, 120, 150, 300], FEES);
    const [below, inRange, secondInRange, above] = result.steps;
    expect(below.cumulativeFees).toBe(0);
    expect(inRange.cumulativeFees).toBeCloseTo(feeIncomeForStep(FEES, inRange.lpValue), 6);
    expect(secondInRange.cumulativeFees).toBeCloseTo(
      inRange.cumulativeFees + feeIncomeForStep(FEES, secondInRange.lpValue),
      6,
    );
    // Above-range step does NOT accrue, but keeps the accumulated total.
    expect(above.cumulativeFees).toBeCloseTo(secondInRange.cumulativeFees, 6);
    expect(above.totalValue).toBeCloseTo(above.lpValue + above.cumulativeFees, 6);
  });

  it("does not mutate the shared CLMM config input", () => {
    const snapshot = { ...CLMM };
    computePricePathScenario(CLMM, [150], FEES);
    expect(CLMM).toEqual(snapshot);
  });

  it("rejects invalid configs, paths and fees with RangeError", () => {
    expect(() => computePricePathScenario({ ...CLMM, entryPrice: 50 }, [150])).toThrow(RangeError);
    expect(() => computePricePathScenario(CLMM, [])).toThrow(RangeError);
    expect(() => computePricePathScenario(CLMM, [150], { feeApr: -1, stepHours: 24 })).toThrow(RangeError);
  });
});
