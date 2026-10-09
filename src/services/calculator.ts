/**
 * Calculator application service — composes the Phase 1 domain engines
 * (simplified LP + basic short hedge) into scenario results for the UI.
 *
 * Pure and deterministic. It owns no financial formulas itself: all math lives
 * in the domain engines (docs/02-structure.md, docs/07-do-and-donts.md).
 * All values are in stable units; price = stable per 1 volatile.
 */

import {
  lpAmountsAtPrice,
  lpPnlAtPrice,
  lpValueAtPrice,
  type LPPositionConfig,
} from "@/domain/lp";
import { hodlValueAtPrice, impermanentLoss } from "@/domain/lp";
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
  type RangeStatus,
} from "@/domain/clmm";
import {
  shortNotionalAtEntry,
  shortPnlAtPrice,
  shortQuantityAtEntry,
  shortPnlForQuantity,
  shortQuantityForExposure,
  type HedgeConfig,
} from "@/domain/hedge";

export interface ScenarioPoint {
  price: number;
  amountVolatile: number;
  amountStable: number;
  lpValue: number;
  lpPnl: number;
  hedgePnl: number;
  combinedPnl: number;
}

export interface ScenarioSummary {
  initialLpValue: number;
  hedgeQuantity: number;
  hedgeNotionalAtEntry: number;
}

export interface ScenarioSet {
  summary: ScenarioSummary;
  points: ScenarioPoint[];
}

/** Validates a scenario price ladder (all positive finite, at least one). */
export function validateScenarioPrices(prices: readonly number[]): string[] {
  if (prices.length === 0) {
    return ["At least one scenario price is required."];
  }
  if (!prices.every((price) => Number.isFinite(price) && price > 0)) {
    return ["All scenario prices must be positive finite numbers."];
  }
  return [];
}

/**
 * Computes per-price scenario results across the two engines and combines
 * PnL: combined = (LP value − initial) + short PnL. No fees, funding, or
 * rebalance costs are included at Phase 1 (documented simplification).
 */
export function computeScenarios(
  lp: LPPositionConfig,
  hedge: HedgeConfig,
  prices: readonly number[],
): ScenarioSet {
  const priceErrors = validateScenarioPrices(prices);
  if (priceErrors.length > 0) {
    throw new RangeError(priceErrors.join(" "));
  }

  const summary: ScenarioSummary = {
    initialLpValue: lp.initialValueStable,
    hedgeQuantity: shortQuantityAtEntry(hedge, lp),
    hedgeNotionalAtEntry: shortNotionalAtEntry(hedge, lp),
  };

  const points = prices.map((price) => {
    const amounts = lpAmountsAtPrice(lp, price);
    const lpPnl = lpPnlAtPrice(lp, price);
    const hedgePnl = shortPnlAtPrice(hedge, lp, price);
    return {
      price,
      amountVolatile: amounts.amountVolatile,
      amountStable: amounts.amountStable,
      lpValue: lpValueAtPrice(lp, price),
      lpPnl,
      hedgePnl,
      combinedPnl: lpPnl + hedgePnl,
    };
  });

  return { summary, points };
}

export interface ClmmScenarioSummary {
  initialLpValue: number;
  /** Derived liquidity L (exact CLMM) */
  liquidityL: number;
  initialAmountVolatile: number;
  initialAmountStable: number;
  hedgeQuantity: number;
  hedgeNotionalAtEntry: number;
  /** LP delta at entry, volatile units per 1 unit of price */
  lpDeltaAtEntry: number;
  /** LP delta − short quantity (residual volatile exposure) */
  netDeltaAtEntry: number;
}

export interface ClmmScenarioPoint {
  price: number;
  rangeStatus: RangeStatus;
  amountVolatile: number;
  amountStable: number;
  lpValue: number;
  /** HODL benchmark: initial quantities valued at P (LP domain, docs/02) */
  hodlValue: number;
  /** LP value − HODL value (negative = LP underperforms HODL) */
  il: number;
  lpPnl: number;
  hedgePnl: number;
  combinedPnl: number;
  lpDelta: number;
  netDelta: number;
}

export interface ClmmScenarioSet {
  summary: ClmmScenarioSummary;
  points: ClmmScenarioPoint[];
}

/** Range-sensitivity sweep result — Phase 4 ADDITION (docs/06 "range sensitivity"). */
export interface RangeSensitivityRow {
  /** Lower bound of the tested range (upper bound fixed). */
  lowerPrice: number;
  /** Upper bound of the tested range (lower bound fixed). */
  upperPrice: number;
  /** Final LP value at the terminal scenario price for this range. */
  finalLpValue: number;
  /** Final combined (LP + hedge) PnL at the terminal price for this range. */
  finalCombinedPnl: number;
  /** Fraction of scenario prices landing inside this range (0..1). */
  inRangeShare: number;
}

/**
 * Range sensitivity: sweeps candidate ranges around the SAME entry price and
 * scenario ladder to show how range width changes the outcome distribution —
 * explicitly a what-if comparison, never a claim of an optimal range
 * (docs/06 Phase 6). Pure and deterministic; no new domain math: rows reuse
 * the exact CLMM engine.
 */
export function computeRangeSensitivity(
  clmm: CLMMConfig,
  hedge: HedgeConfig,
  prices: readonly number[],
  options: { lower: readonly number[]; upper: readonly number[] },
): RangeSensitivityRow[] {
  const configErrors = validateCLMMConfig(clmm);
  if (configErrors.length > 0) {
    throw new RangeError(configErrors.join(" "));
  }
  const priceErrors = validateScenarioPrices(prices);
  if (priceErrors.length > 0) {
    throw new RangeError(priceErrors.join(" "));
  }
  if (options.lower.length !== options.upper.length) {
    throw new RangeError("lower and upper sweep arrays must have the same length");
  }

  return options.lower.map((lowerPrice, index) => {
    const upperPrice = options.upper[index];
    const candidate: CLMMConfig = { ...clmm, lowerPrice, upperPrice };
    // Reuse the existing exact scenario engine unchanged for each candidate.
    const scenario = computeClmmScenarios(candidate, hedge, prices);
    const last = scenario.points[scenario.points.length - 1];
    const inRangeCount = scenario.points.filter((p) => p.rangeStatus === "IN_RANGE").length;
    return {
      lowerPrice,
      upperPrice,
      finalLpValue: last.lpValue,
      finalCombinedPnl: last.combinedPnl,
      inRangeShare: prices.length > 0 ? inRangeCount / prices.length : 0,
    };
  });
}

/**
 * Phase 2 scenario engine over the EXACT CLMM model + the basic short hedge.
 * Adds to (never replaces) the simplified computeScenarios above.
 *
 * Hedge sizing: quantity = ratio × (initial volatile amount · entry price) /
 * entry price = ratio × initial volatile amount — it offsets the exact
 * volatile-side exposure at entry. combinedPnl = LP PnL + hedge PnL; no fees,
 * funding, or rebalance costs (documented simplification, Phase 3+).
 */
export function computeClmmScenarios(
  clmm: CLMMConfig,
  hedge: HedgeConfig,
  prices: readonly number[],
): ClmmScenarioSet {
  const configErrors = validateCLMMConfig(clmm);
  if (configErrors.length > 0) {
    throw new RangeError(configErrors.join(" "));
  }
  const priceErrors = validateScenarioPrices(prices);
  if (priceErrors.length > 0) {
    throw new RangeError(priceErrors.join(" "));
  }

  const liquidity = liquidityFromInitialValue(clmm);
  const initial = initialCLMMAmounts(clmm);
  // Volatile-side exposure at entry, in stable units.
  const exposureAtEntry = initial.amountVolatile * clmm.entryPrice;
  const hedgeQuantity = shortQuantityForExposure(hedge, exposureAtEntry, clmm.entryPrice);
  const lpDeltaAtEntry = clmmDeltaAtPrice(clmm, liquidity, clmm.entryPrice);

  const summary: ClmmScenarioSummary = {
    initialLpValue: clmm.initialValueStable,
    liquidityL: liquidity,
    initialAmountVolatile: initial.amountVolatile,
    initialAmountStable: initial.amountStable,
    hedgeQuantity,
    hedgeNotionalAtEntry: hedgeQuantity * clmm.entryPrice,
    lpDeltaAtEntry,
    netDeltaAtEntry: lpDeltaAtEntry - hedgeQuantity,
  };

  const points = prices.map((price) => {
    const amounts = clmmAmountsAtPrice(clmm, liquidity, price);
    const lpValue = clmmValueAtPrice(clmm, liquidity, price);
    const lpPnl = clmmPnlAtPrice(clmm, liquidity, price);
    const hedgePnl = shortPnlForQuantity(hedgeQuantity, clmm.entryPrice, price);
    const hodlValue = hodlValueAtPrice(initial, price);
    const lpDelta = clmmDeltaAtPrice(clmm, liquidity, price);
    return {
      price,
      rangeStatus: rangeStatusAtPrice(clmm, price),
      amountVolatile: amounts.amountVolatile,
      amountStable: amounts.amountStable,
      lpValue,
      hodlValue,
      il: impermanentLoss(lpValue, hodlValue),
      lpPnl,
      hedgePnl,
      combinedPnl: lpPnl + hedgePnl,
      lpDelta,
      netDelta: lpDelta - hedgeQuantity,
    };
  });

  return { summary, points };
}
