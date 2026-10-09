/**
 * Forward price-path scenario engine — Phase 4 (docs/06-roadmap.md
 * "Forward Scenario", docs/02-structure.md Scenario domain).
 *
 * Answers "if price moves from here along a user-defined path, what happens
 * to this LP position?" — WHAT-IF projections, never predictions (docs/06
 * cross-phase rule 11). Pure, deterministic composition of the existing
 * exact CLMM engine (src/domain/clmm) — NO duplicated CLMM math (docs/06).
 *
 * Per docs/04:
 *  - price convention P = stable per 1 volatile throughout;
 *  - HODL benchmarks the initial token quantities at each path price;
 *  - IL = LP value − HODL value at the SAME scenario price;
 *  - fee income is included ONLY where explicitly provided and is labeled
 *    a simplified model (docs/04 assumptions).
 */

import Decimal from "decimal.js";

import {
  clmmAmountsAtPrice,
  clmmDeltaAtPrice,
  clmmValueAtPrice,
  initialCLMMAmounts,
  liquidityFromInitialValue,
  rangeStatusAtPrice,
  validateCLMMConfig,
  type CLMMConfig,
  type RangeStatus,
} from "@/domain/clmm";
import { hodlValueAtPrice, impermanentLoss } from "@/domain/lp";
import { requirePositive } from "@/utils/decimal";

/**
 * Explicit fee assumption (docs/06: "fee assumptions where explicitly
 * provided"). Fees accrue only while the position is IN_RANGE, proportionally
 * to the fee APR and the elapsed hours per step.
 *
 * Simplified model: a flat APR applied to in-range LP value — real CLMM fee
 * income depends on pool volume, tick activity and position share, none of
 * which a price path alone can supply. Always labeled "Simplified model".
 */
export interface FeeAssumption {
  /** Annualized fee APR as a fraction (e.g. 0.4 = 40%/year). */
  feeApr: number;
  /** Hours of pool time each path step represents (e.g. 24 = daily steps). */
  stepHours: number;
}

/** Current-state baseline before the path unfolds (docs/06: "current-state baseline"). */
export interface PathBaseline {
  entryPrice: number;
  lowerPrice: number;
  upperPrice: number;
  initialLpValue: number;
  liquidityL: number;
  initialAmountVolatile: number;
  initialAmountStable: number;
  /** LP delta at the current price, volatile units per unit of price. */
  lpDelta: number;
  /** Volatile-side exposure value at the current price, stable units. */
  volatileExposureValue: number;
}

/** One path step: full LP state at that path price (docs/06 deliverables). */
export interface PathStep {
  /** Step index (0 = baseline arrival at prices[0]). */
  step: number;
  price: number;
  rangeStatus: RangeStatus;
  amountVolatile: number;
  amountStable: number;
  lpValue: number;
  hodlValue: number;
  /** LP value − HODL value at this price (≤ 0 without fees). */
  il: number;
  lpPnl: number;
  lpDelta: number;
  /** Cumulative fee income when a fee assumption was provided; else 0. */
  cumulativeFees: number;
  /** LP value + cumulative fee income — the position's total value. */
  totalValue: number;
}

export interface PricePathScenario {
  baseline: PathBaseline;
  /** True when a FeeAssumption was supplied (fees included, simplified model). */
  includesFees: boolean;
  steps: PathStep[];
}

/** Validates a fee assumption; empty array = valid. */
export function validateFeeAssumption(fees: FeeAssumption | null): string[] {
  if (!fees) return [];
  const errors: string[] = [];
  if (!Number.isFinite(fees.feeApr) || fees.feeApr < 0) {
    errors.push("Fee APR must be a non-negative number.");
  }
  if (!Number.isFinite(fees.stepHours) || fees.stepHours <= 0) {
    errors.push("Fee step hours must be a positive number.");
  }
  return errors;
}

/** Fee income for one in-range step, in stable units (simplified model). */
export function feeIncomeForStep(
  fees: FeeAssumption,
  lpValue: number,
): number {
  const apr = requireNonNegative(fees.feeApr, "feeApr");
  const hours = requirePositive(fees.stepHours, "stepHours");
  const value = requireNonNegative(lpValue, "lpValue");
  // APR prorated to the step duration on the in-range LP value.
  return apr.mul(hours).div(24 * 365).mul(value).toNumber();
}

function requireNonNegative(value: number, name: string): Decimal {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
  // 0 is a valid non-negative input here; only negatives/non-finite reject.
  return value === 0 ? new Decimal(0) : requirePositive(value, name);
}

/** Validates a price path: non-empty, all positive finite. */
export function validatePricePath(prices: readonly number[]): string[] {
  if (prices.length === 0) {
    return ["A price path requires at least one price point."];
  }
  if (!prices.every((price) => Number.isFinite(price) && price > 0)) {
    return ["All path prices must be positive finite numbers."];
  }
  return [];
}

/**
 * Computes the forward scenario for a user-defined price path over the exact
 * CLMM engine. The path is a sequence of hypothetical future prices — steps
 * are independent LP revaluations (no hidden path dependence beyond the
 * explicit, cumulative fee income).
 */
export function computePricePathScenario(
  clmm: CLMMConfig,
  prices: readonly number[],
  fees: FeeAssumption | null = null,
): PricePathScenario {
  const configErrors = validateCLMMConfig(clmm);
  if (configErrors.length > 0) {
    throw new RangeError(configErrors.join(" "));
  }
  const feeErrors = validateFeeAssumption(fees);
  if (feeErrors.length > 0) {
    throw new RangeError(feeErrors.join(" "));
  }
  const pathErrors = validatePricePath(prices);
  if (pathErrors.length > 0) {
    throw new RangeError(pathErrors.join(" "));
  }

  const liquidity = liquidityFromInitialValue(clmm);
  const initial = initialCLMMAmounts(clmm);

  const baseline: PathBaseline = {
    entryPrice: clmm.entryPrice,
    lowerPrice: clmm.lowerPrice,
    upperPrice: clmm.upperPrice,
    initialLpValue: clmm.initialValueStable,
    liquidityL: liquidity,
    initialAmountVolatile: initial.amountVolatile,
    initialAmountStable: initial.amountStable,
    lpDelta: clmmDeltaAtPrice(clmm, liquidity, clmm.entryPrice),
    volatileExposureValue: initial.amountVolatile * clmm.entryPrice,
  };

  let cumulativeFees = 0;
  const steps = prices.map((price, index) => {
    const amounts = clmmAmountsAtPrice(clmm, liquidity, price);
    const lpValue = clmmValueAtPrice(clmm, liquidity, price);
    const hodlValue = hodlValueAtPrice(initial, price);
    const status = rangeStatusAtPrice(clmm, price);
    if (fees && status === "IN_RANGE") {
      cumulativeFees += feeIncomeForStep(fees, lpValue);
    }
    return {
      step: index,
      price,
      rangeStatus: status,
      amountVolatile: amounts.amountVolatile,
      amountStable: amounts.amountStable,
      lpValue,
      hodlValue,
      il: impermanentLoss(lpValue, hodlValue),
      lpPnl: lpValue - clmm.initialValueStable,
      lpDelta: clmmDeltaAtPrice(clmm, liquidity, price),
      cumulativeFees,
      totalValue: lpValue + cumulativeFees,
    };
  });

  return { baseline, includesFees: fees !== null, steps };
}
