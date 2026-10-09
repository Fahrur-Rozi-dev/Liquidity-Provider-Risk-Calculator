import type { CLMMConfig } from "@/domain/clmm";
import type { FeeAssumption } from "@/domain/scenario";
import type { HedgeSimulatorConfig } from "@/domain/hedge";
import {
  computeForwardScenario,
  validateForwardScenarioConfig,
  type ForwardScenarioConfig,
} from "@/services/forwardScenario";

/**
 * Forward scenario composition tests (Phase 4, docs/06): the service chains
 * the exact CLMM engine, the price-path engine and the tranche hedge
 * simulator without implementing any math of its own (docs/02).
 */

const CLMM: CLMMConfig = {
  entryPrice: 150,
  lowerPrice: 100,
  upperPrice: 225,
  initialValueStable: 3000,
};

const FEES: FeeAssumption = { feeApr: 0.4, stepHours: 24 };

const HEDGE: HedgeSimulatorConfig = {
  mode: "dynamic",
  targetRatio: 0.75,
  rebalanceThreshold: 0,
  minRebalanceRatio: 0,
  cooldownSeconds: 0,
  rebalanceFeeRate: 0.0004,
  rebalanceSlippageRate: 0.0006,
  rebalanceFixedCost: 0,
};

function makeConfig(overrides: Partial<ForwardScenarioConfig> = {}): ForwardScenarioConfig {
  return {
    clmm: CLMM,
    pathPrices: [150, 120, 200],
    fees: FEES,
    hedge: HEDGE,
    fundingRate: null,
    fundingIntervalHours: null,
    ...overrides,
  };
}

describe("validateForwardScenarioConfig", () => {
  it("accepts a valid combined config", () => {
    expect(validateForwardScenarioConfig(makeConfig())).toEqual([]);
  });

  it("aggregates domain validation errors (CLMM + path + fees + hedge)", () => {
    const errors = validateForwardScenarioConfig(
      makeConfig({
        clmm: { ...CLMM, upperPrice: 50 },
        pathPrices: [],
        fees: { feeApr: -1, stepHours: 24 },
        hedge: { ...HEDGE, targetRatio: 1.5 },
      }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects funding inputs that are incomplete or out of range", () => {
    expect(
      validateForwardScenarioConfig(makeConfig({ fundingRate: 2, fundingIntervalHours: 24 })).length,
    ).toBe(1);
    expect(
      validateForwardScenarioConfig(makeConfig({ fundingRate: 0.0001, fundingIntervalHours: 0 })).length,
    ).toBe(1);
    expect(
      validateForwardScenarioConfig(makeConfig({ fundingRate: null, fundingIntervalHours: null })),
    ).toEqual([]);
  });
});

describe("computeForwardScenario", () => {
  it("produces one point per path step", () => {
    const result = computeForwardScenario(makeConfig());
    expect(result.points).toHaveLength(3);
    expect(result.points.map((p) => p.price)).toEqual([150, 120, 200]);
  });

  it("reuses the exact CLMM engine for the LP leg (no independent model)", () => {
    const result = computeForwardScenario(makeConfig({ pathPrices: [150], fees: null }));
    const entry = result.points[0];
    expect(entry.lp.lpValue).toBeCloseTo(3000, 6);
    expect(entry.lp.lpPnl).toBeCloseTo(0, 6);
    // HODL benchmark and IL remain the LP-domain definitions.
    expect(entry.lp.hodlValue).toBeCloseTo(
      entry.lp.amountVolatile * 150 + entry.lp.amountStable,
      6,
    );
    expect(entry.lp.il).toBeCloseTo(entry.lp.lpValue - entry.lp.hodlValue, 6);
  });

  it("feeds the hedge sim the LP's live volatile exposure at each step", () => {
    const result = computeForwardScenario(makeConfig({ pathPrices: [150] }));
    const entry = result.points[0];
    // Short target = 0.75 · exposure/price = 0.75 · amountVolatile.
    expect(entry.hedge.shortQuantity).toBeCloseTo(0.75 * entry.lp.amountVolatile, 9);
  });

  it("flags fee and funding inclusion explicitly", () => {
    const without = computeForwardScenario(makeConfig({ fees: null }));
    expect(without.includesFees).toBe(false);
    expect(without.includesFunding).toBe(false);
    const withFees = computeForwardScenario(makeConfig());
    expect(withFees.includesFees).toBe(true);
    const withFunding = computeForwardScenario(
      makeConfig({ fundingRate: 0.0001, fundingIntervalHours: 24 }),
    );
    expect(withFunding.includesFunding).toBe(true);
  });

  it("keeps funding and rebalance costs separate from price PnL in combinedValue", () => {
    const result = computeForwardScenario(
      makeConfig({
        pathPrices: [150, 150],
        fundingRate: 0.0001,
        fundingIntervalHours: 24,
      }),
    );
    const first = result.points[0];
    const last = result.points[1];
    // Same price at both steps: LP value identical; the ONLY differences are
    // fees (in-range, both steps), funding accrual, and (no) rebalance.
    const feePerStep = FEES.feeApr / 365 * first.lp.lpValue;
    expect(first.combinedValue).toBeCloseTo(3000 + feePerStep - first.hedge.funding - result.hedgeState.accumulatedRebalanceCosts + first.hedge.unrealizedPnl + first.hedge.realizedPnl, 4);
    expect(last.hedge.funding).toBeGreaterThan(first.hedge.funding);
    expect(last.lp.lpValue).toBeCloseTo(first.lp.lpValue, 6);
  });

  it("returns the full hedge state and an ordered event log", () => {
    const result = computeForwardScenario(makeConfig({ pathPrices: [150, 120] }));
    expect(result.hedgeEvents).toEqual(result.hedgeState.events);
    const indexes = result.hedgeEvents.map((e) => e.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(result.hedgeState.shortQuantity).toBeCloseTo(
      result.points[result.points.length - 1].hedge.shortQuantity,
      9,
    );
  });

  it("computes residual delta from the LP delta and open short", () => {
    const result = computeForwardScenario(makeConfig({ pathPrices: [150] }));
    const entry = result.points[0];
    expect(entry.residualDelta).toBeCloseTo(entry.lp.lpDelta - entry.hedge.shortQuantity, 9);
  });

  it("throws a RangeError aggregating all validation failures", () => {
    expect(() => computeForwardScenario(makeConfig({ pathPrices: [0] }))).toThrow(RangeError);
  });
});
