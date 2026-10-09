import {
  fifoReduce,
  fundingPayment,
  hedgeSimRealizedPnl,
  hedgeSimStep,
  hedgeSimUnrealizedPnl,
  initialHedgeSimState,
  rebalanceCost,
  residualDelta,
  runHedgeSimulation,
  targetShortQuantity,
  validateHedgeSimulatorConfig,
  type HedgeSimTranche,
  type HedgeSimulatorConfig,
} from "@/domain/hedge";

/**
 * Dynamic tranche hedge engine tests (Phase 4, docs/06 "Dynamic Hedge"):
 * fixed/dynamic/threshold modes, target ratio, tranches with FIFO reductions,
 * funding modeled separately, costs, cooldown/minimum rebalance guards, an
 * append-only event log, and residual delta. Read-only simulation only.
 */

const DYNAMIC: HedgeSimulatorConfig = {
  mode: "dynamic",
  targetRatio: 0.75,
  rebalanceThreshold: 0,
  minRebalanceRatio: 0,
  cooldownSeconds: 0,
  rebalanceFeeRate: 0.0004,
  rebalanceSlippageRate: 0.0006,
  rebalanceFixedCost: 0,
};

const FIXED: HedgeSimulatorConfig = {
  ...DYNAMIC,
  mode: "fixed",
};

function tranche(quantity: number, entryPrice: number, id = "t1"): HedgeSimTranche {
  return {
    id,
    direction: "short",
    entryPrice,
    quantity,
    remainingQuantity: quantity,
    openedAt: 0,
    accumulatedFundingPerUnit: 0,
    realizedPnl: 0,
  };
}

describe("validateHedgeSimulatorConfig", () => {
  it("accepts the three supported modes with in-range values", () => {
    for (const mode of ["fixed", "dynamic", "threshold"] as const) {
      expect(validateHedgeSimulatorConfig({ ...DYNAMIC, mode })).toEqual([]);
    }
  });

  it("rejects unknown modes and out-of-range values", () => {
    const errors = validateHedgeSimulatorConfig({ ...DYNAMIC, mode: "letter" as unknown as "fixed" });
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(validateHedgeSimulatorConfig({ ...DYNAMIC, targetRatio: 1.5 }).length).toBe(1);
    expect(validateHedgeSimulatorConfig({ ...DYNAMIC, minRebalanceRatio: -1 }).length).toBe(1);
    expect(validateHedgeSimulatorConfig({ ...DYNAMIC, cooldownSeconds: -5 }).length).toBe(1);
    expect(validateHedgeSimulatorConfig({ ...DYNAMIC, rebalanceFeeRate: -0.01 }).length).toBe(1);
    expect(
      validateHedgeSimulatorConfig({ ...DYNAMIC, mode: "threshold", rebalanceThreshold: 2 }).length,
    ).toBe(1);
  });
});

describe("targetShortQuantity", () => {
  it("is ratio · exposure / price", () => {
    expect(targetShortQuantity(0.75, 1500, 150)).toBeCloseTo(7.5, 9);
    expect(targetShortQuantity(1, 1500, 150)).toBeCloseTo(10, 9);
    expect(targetShortQuantity(0, 1500, 150)).toBe(0);
  });

  it("throws on out-of-range ratio or invalid inputs", () => {
    expect(() => targetShortQuantity(1.5, 1500, 150)).toThrow(RangeError);
    expect(() => targetShortQuantity(0.5, 0, 150)).toThrow(RangeError);
    expect(() => targetShortQuantity(0.5, 1500, 0)).toThrow(RangeError);
  });
});

describe("fundingPayment", () => {
  it("is quantity · rate · hours, kept separate from price PnL", () => {
    expect(fundingPayment(7.5, 0.0001, 8).toNumber()).toBeCloseTo(7.5 * 0.0008, 12);
    expect(fundingPayment(0, 0.0001, 8).toNumber()).toBe(0);
  });
});

describe("rebalanceCost", () => {
  it("sums fee + slippage on the notional plus the fixed cost", () => {
    const cost = rebalanceCost(1500, DYNAMIC);
    expect(cost.toNumber()).toBeCloseTo(1500 * 0.001, 9);
    const withFixed = rebalanceCost(1500, { ...DYNAMIC, rebalanceFixedCost: 2 });
    expect(withFixed.toNumber()).toBeCloseTo(1500 * 0.001 + 2, 9);
  });

  it("is zero for zero rates and zero notional", () => {
    expect(rebalanceCost(0, DYNAMIC).toNumber()).toBe(0);
  });
});

describe("fifoReduce", () => {
  it("reduces the OLDEST tranche first until the quantity is covered", () => {
    const tranches = [tranche(5, 150, "old"), tranche(5, 120, "new")];
    const reduced = fifoReduce(tranches, 6, 140);
    expect(reduced.tranches[0].remainingQuantity).toBe(0);
    expect(reduced.tranches[1].remainingQuantity).toBeCloseTo(4, 9);
    // Old tranche closed 5 at entry 150 → +50; new tranche closed 1 at 120 → +(-20)
    expect(reduced.realizedPnl).toBeCloseTo(5 * (150 - 140) + 1 * (120 - 140), 9);
  });

  it("books realized PnL per tranche cumulatively across multiple reductions", () => {
    const tranches = [tranche(5, 150, "old")];
    const first = fifoReduce(tranches, 2, 140);
    expect(first.tranches[0].realizedPnl).toBeCloseTo(2 * 10, 9);
    const second = fifoReduce(first.tranches, 3, 130);
    expect(second.tranches[0].realizedPnl).toBeCloseTo(2 * 10 + 3 * 20, 9);
    expect(second.tranches[0].remainingQuantity).toBe(0);
  });

  it("does not mutate the input tranches", () => {
    const tranches = [tranche(5, 150)];
    const snapshot = tranches.map((t) => ({ ...t }));
    fifoReduce(tranches, 1, 140);
    expect(tranches).toEqual(snapshot);
  });

  it("refuses to reduce more than the open quantity", () => {
    expect(() => fifoReduce([tranche(5, 150)], 6, 140)).toThrow(RangeError);
  });
});

describe("initialHedgeSimState", () => {
  it("starts empty with no tranches, no costs, no funding", () => {
    const state = initialHedgeSimState(DYNAMIC);
    expect(state.shortQuantity).toBe(0);
    expect(state.tranches).toEqual([]);
    expect(state.accumulatedRebalanceCosts).toBe(0);
    expect(state.accumulatedFunding).toBe(0);
    expect(state.events).toEqual([]);
  });
});

describe("hedgeSimStep — dynamic mode", () => {
  const stepInput = (price: number, exposure: number, tick = 0) => ({
    tickIndex: tick,
    price,
    exposureValueStable: exposure,
    fundingRate: null,
    intervalHours: null,
  });

  it("opens the short toward the target ratio on the first tick", () => {
    let state = initialHedgeSimState(DYNAMIC);
    // LP exposure 1000 stable at price 100 → target q = 0.75 · 1000/100 = 7.5
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 1000));
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe("open");
    expect(state.lastRebalanceTick).toBe(0);
    // Cost = notional · (fee + slippage) = 750 · 0.001
    expect(state.accumulatedRebalanceCosts).toBeCloseTo(750 * 0.001, 9);
  });

  it("tracks the LIVE exposure: target rises when exposure grows", () => {
    let state = initialHedgeSimState(DYNAMIC);
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 1000, 0));
    // Exposure doubles at the same price → target 15, drift exceeds no guards.
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 2000, 1));
    expect(state.shortQuantity).toBeCloseTo(15, 9);
    expect(state.events.filter((e) => e.type === "increase")).toHaveLength(1);
  });

  it("reduces FIFO when the target falls below the open quantity", () => {
    let state = initialHedgeSimState(DYNAMIC);
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 1000, 0));
    // Exposure collapses at the same price → target 1.5, reduce 6 FIFO.
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 200, 1));
    expect(state.shortQuantity).toBeCloseTo(1.5, 9);
    expect(state.events.filter((e) => e.type === "reduce")).toHaveLength(1);
    // Realized PnL: closed 6 units opened at 100 → price still 100 → 0 PnL.
    expect(hedgeSimRealizedPnl(state)).toBeCloseTo(0, 9);
  });

  it("respects cooldown seconds between accepted rebalances", () => {
    const config = { ...DYNAMIC, cooldownSeconds: 3600 };
    let state = initialHedgeSimState(config);
    state = hedgeSimStep(state, config, { ...stepInput(100, 1000), tickIndex: 0 });
    state = hedgeSimStep(state, config, { ...stepInput(100, 2000), tickIndex: 600 });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9); // second step skipped
    expect(state.events.filter((e) => e.type === "skipped_cooldown")).toHaveLength(1);
    state = hedgeSimStep(state, config, { ...stepInput(100, 2000), tickIndex: 4600 });
    expect(state.shortQuantity).toBeCloseTo(15, 9); // cooldown elapsed → accepted
  });

  it("respects the minimum rebalance size guard", () => {
    const config = { ...DYNAMIC, minRebalanceRatio: 0.5 };
    let state = initialHedgeSimState(config);
    // Target 7.5 vs 0 open → delta 7.5 = 50% of the 15-unit exposure quantity → accepted.
    state = hedgeSimStep(state, config, stepInput(100, 1000, 0));
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    // Small drift: target 7.55 → delta 0.05 < 50% minimum → skipped.
    state = hedgeSimStep(state, config, stepInput(99.3, 1000, 1));
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    expect(state.events.filter((e) => e.type === "skipped_min_size")).toHaveLength(1);
  });

  it("applies funding per tranche and tracks it separately from costs", () => {
    let state = initialHedgeSimState(DYNAMIC);
    state = hedgeSimStep(state, DYNAMIC, stepInput(100, 1000, 0));
    const before = state.accumulatedFunding;
    // 0.0001 rate over 8h on 7.5 units = 0.006 funding.
    state = hedgeSimStep(state, DYNAMIC, { ...stepInput(100, 1000, 1), fundingRate: 0.0001, intervalHours: 8 });
    expect(state.accumulatedFunding).toBeCloseTo(before + 7.5 * 0.0008, 12);
    expect(state.accumulatedRebalanceCosts).toBeCloseTo(750 * 0.001, 9);
    expect(state.tranches[0].accumulatedFundingPerUnit).toBeCloseTo(0.0008, 12);
    expect(state.events.some((e) => e.type === "funding")).toBe(true);
  });

  it("never mutates the previous state (pure step)", () => {
    const state = initialHedgeSimState(DYNAMIC);
    const before = state;
    hedgeSimStep(state, DYNAMIC, stepInput(100, 1000));
    expect(state).toBe(before);
    expect(state.shortQuantity).toBe(0);
  });
});

describe("hedgeSimStep — fixed mode", () => {
  it("holds the initial short and never rebalances afterwards", () => {
    let state = initialHedgeSimState(FIXED);
    state = hedgeSimStep(state, FIXED, { tickIndex: 0, price: 100, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    state = hedgeSimStep(state, FIXED, { tickIndex: 1, price: 200, exposureValueStable: 4000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    expect(state.events).toHaveLength(1);
  });

  it("opens only at the first tick in fixed mode and holds afterwards", () => {
    // Fixed mode opens at the FIRST step (documented behavior) and then holds
    // regardless of later exposure changes.
    let state = hedgeSimStep(initialHedgeSimState(FIXED), FIXED, {
      tickIndex: 0,
      price: 100,
      exposureValueStable: 1000,
      fundingRate: null,
      intervalHours: null,
    });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    state = hedgeSimStep(state, FIXED, { tickIndex: 1, price: 200, exposureValueStable: 4000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    expect(state.events).toHaveLength(1);
  });
});

describe("hedgeSimStep — threshold mode", () => {
  const THRESHOLD: HedgeSimulatorConfig = { ...DYNAMIC, mode: "threshold", rebalanceThreshold: 0.05 };

  it("skips small drift and rebalances when drift exceeds the threshold", () => {
    let state = initialHedgeSimState(THRESHOLD);
    state = hedgeSimStep(state, THRESHOLD, { tickIndex: 0, price: 100, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    // Drift to target 7.6 → |0.1|/7.6 ≈ 1.3% < 5% → skipped.
    state = hedgeSimStep(state, THRESHOLD, { tickIndex: 1, price: 98.7, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeCloseTo(7.5, 9);
    expect(state.events.filter((e) => e.type === "skipped_threshold")).toHaveLength(1);
    // Drift to target 9 → |1.5|/9 ≈ 16.7% > 5% → accepted.
    state = hedgeSimStep(state, THRESHOLD, { tickIndex: 2, price: 83.3, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    expect(state.shortQuantity).toBeGreaterThan(8);
    expect(state.events.filter((e) => e.type === "increase")).toHaveLength(1);
  });
});

describe("runHedgeSimulation", () => {
  it("runs a full tick sequence and preserves the event order", () => {
    const ticks = [
      { tickIndex: 0, price: 100, exposureValueStable: 1000, fundingRate: null, intervalHours: null },
      { tickIndex: 1, price: 120, exposureValueStable: 1000, fundingRate: 0.0001, intervalHours: 24 },
      { tickIndex: 2, price: 140, exposureValueStable: 1000, fundingRate: 0.0001, intervalHours: 24 },
    ];
    const state = runHedgeSimulation(DYNAMIC, ticks);
    // Tick 0: exposure 1000 @ 100 → target 7.5 → open 7.5.
    // Tick 1: exposure 1000 @ 120 → target 1000·0.75/120 = 6.25 → FIFO reduce 1.25.
    // Tick 2: exposure 1000 @ 140 → target 1000·0.75/140 ≈ 5.357 → FIFO reduce ≈0.893.
    expect(state.shortQuantity).toBeCloseTo(1000 * 0.75 / 140, 9);
    expect(state.events.map((e) => e.index)).toEqual(state.events.map((_, i) => i));
    expect(state.events[0].type).toBe("open");
    expect(state.events.filter((e) => e.type === "reduce")).toHaveLength(2);
    expect(state.accumulatedFunding).toBeGreaterThan(0);
  });

  it("throws on an invalid config", () => {
    expect(() => runHedgeSimulation({ ...DYNAMIC, targetRatio: 2 }, [])).toThrow(RangeError);
  });
});

describe("hedgeSimUnrealizedPnl / hedgeSimRealizedPnl / residualDelta", () => {
  it("values the open short at mark price and separates realized PnL", () => {
    let state = initialHedgeSimState(DYNAMIC);
    state = hedgeSimStep(state, DYNAMIC, { tickIndex: 0, price: 100, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    // Mark at 120: unrealized = 7.5 · (100 − 120) = −150.
    expect(hedgeSimUnrealizedPnl(state, 120)).toBeCloseTo(-150, 9);
    // Reduce half at 120 → realized +60 on the closed 3.75 units.
    state = hedgeSimStep(state, DYNAMIC, { tickIndex: 1, price: 120, exposureValueStable: 250, fundingRate: null, intervalHours: null });
    // Target at 250 exposure @ 120 = 0.75 · 250/120 = 1.5625 → FIFO reduce.
    expect(state.shortQuantity).toBeCloseTo(1.5625, 9);
    const closedQuantity = 7.5 - 1.5625;
    expect(hedgeSimRealizedPnl(state)).toBeCloseTo(closedQuantity * (100 - 120) * -1 * -1, 9);
    expect(hedgeSimUnrealizedPnl(state, 120)).toBeCloseTo(1.5625 * (100 - 120), 9);
  });

  it("computes residual delta as LP delta − short quantity", () => {
    let state = initialHedgeSimState(DYNAMIC);
    state = hedgeSimStep(state, DYNAMIC, { tickIndex: 0, price: 100, exposureValueStable: 1000, fundingRate: null, intervalHours: null });
    expect(residualDelta(5, state)).toBeCloseTo(5 - 7.5, 9);
  });
});
