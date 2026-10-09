/**
 * Forward scenario application service — Phase 4 (docs/06-roadmap.md
 * "Forward Scenario & Dynamic Hedge").
 *
 * Composition ONLY: it chains the existing exact CLMM engine, the price-path
 * scenario engine, and the tranche hedge simulator — it implements no
 * financial math itself (docs/02, docs/06: the domain layer calculates, the
 * application layer orchestrates). Pure and deterministic.
 *
 * Exposure link (the one place LP ↔ hedge states meet): at each path step the
 * LP's volatile-side exposure value (amountVolatile · price, from the existing
 * CLMM engine) is fed to the hedge simulator as its exposure input — so the
 * hedge tracks the position itself, not a fixed entry-only value.
 */

import type { CLMMConfig } from "@/domain/clmm";
import { validateCLMMConfig } from "@/domain/clmm";
import {
  computePricePathScenario,
  type FeeAssumption,
  type PathStep,
  validateFeeAssumption,
  validatePricePath,
} from "@/domain/scenario";
import {
  hedgeSimRealizedPnl,
  hedgeSimStep,
  hedgeSimUnrealizedPnl,
  initialHedgeSimState,
  residualDelta,
  validateHedgeSimulatorConfig,
  type HedgeSimEvent,
  type HedgeSimState,
  type HedgeSimulatorConfig,
} from "@/domain/hedge";

/** Explicit combined input for the forward workspace (docs/02 state design). */
export interface ForwardScenarioConfig {
  clmm: CLMMConfig;
  pathPrices: readonly number[];
  fees: FeeAssumption | null;
  hedge: HedgeSimulatorConfig;
  /** Funding per interval as a fraction; null = funding not modeled. */
  fundingRate: number | null;
  /** Funding interval hours per path step; null = funding not modeled. */
  fundingIntervalHours: number | null;
}

/** Validated combined config; returns human-readable errors (empty = valid). */
export function validateForwardScenarioConfig(config: ForwardScenarioConfig): string[] {
  const errors: string[] = [];
  // CLMM validation lives in the domain — surfaced, never duplicated here.
  errors.push(...validateCLMMConfig(config.clmm));
  errors.push(...validatePricePath(config.pathPrices));
  errors.push(...validateFeeAssumption(config.fees));
  errors.push(...validateHedgeSimulatorConfig(config.hedge));
  if (config.fundingRate !== null && (!Number.isFinite(config.fundingRate) || Math.abs(config.fundingRate) > 1)) {
    errors.push("Funding rate must be a finite fraction within -1..1.");
  }
  if (
    config.fundingIntervalHours !== null &&
    (!Number.isFinite(config.fundingIntervalHours) || config.fundingIntervalHours <= 0)
  ) {
    errors.push("Funding interval hours must be a positive number.");
  }
  return errors;
}

/** One forward path point: LP state, hedge state, combined results. */
export interface ForwardPathPoint {
  step: number;
  price: number;
  lp: PathStep;
  hedge: {
    shortQuantity: number;
    targetRatio: number;
    /** Unrealized mark-to-market PnL of the open short, stable units. */
    unrealizedPnl: number;
    /** Realized PnL booked through FIFO reductions, stable units. */
    realizedPnl: number;
    /** Cumulative funding paid, stable units (separate from price PnL). */
    funding: number;
  };
  /** LP value + cumulative fees + unrealized + realized hedge PnL − funding − costs. */
  combinedValue: number;
  /** Combined value minus the initial LP value (the what-if PnL). */
  combinedPnl: number;
  /** LP delta − open short quantity at this step (volatile units). */
  residualDelta: number;
}

export interface ForwardScenarioResult {
  /** True when a fee assumption was supplied (fees included, simplified model). */
  includesFees: boolean;
  /** True when funding was supplied (funding included, separate model). */
  includesFunding: boolean;
  points: ForwardPathPoint[];
  /** Final hedge state — full tranche list + complete event log. */
  hedgeState: HedgeSimState;
  /** Hedge events flattened for the UI event log (in order). */
  hedgeEvents: readonly HedgeSimEvent[];
}

/**
 * Runs the forward what-if: one pass over the path feeding LP exposure and
 * price into the hedge simulator step by step. No look-ahead: each hedge
 * decision sees only the exposure/quantities known at its step.
 */
export function computeForwardScenario(config: ForwardScenarioConfig): ForwardScenarioResult {
  const errors = validateForwardScenarioConfig(config);
  if (errors.length > 0) {
    throw new RangeError(errors.join(" "));
  }

  const path = computePricePathScenario(config.clmm, config.pathPrices, config.fees);
  let hedgeState = initialHedgeSimState(config.hedge);

  const points: ForwardPathPoint[] = path.steps.map((step, index) => {
    const exposureValue = step.amountVolatile * step.price;
    // First step opens from the empty state; later steps carry funding
    // intervals between path steps.
    const intervalHours =
      config.fundingIntervalHours !== null ? (index === 0 ? config.fundingIntervalHours : config.fundingIntervalHours) : null;
    hedgeState = hedgeSimStep(hedgeState, config.hedge, {
      tickIndex: index,
      price: step.price,
      exposureValueStable: exposureValue,
      fundingRate: config.fundingRate,
      intervalHours,
    });

    const unrealized = hedgeSimUnrealizedPnl(hedgeState, step.price);
    const realized = hedgeSimRealizedPnl(hedgeState);
    const combinedValue =
      step.lpValue + step.cumulativeFees + unrealized + realized - hedgeState.accumulatedFunding - hedgeState.accumulatedRebalanceCosts;

    return {
      step: index,
      price: step.price,
      lp: step,
      hedge: {
        shortQuantity: hedgeState.shortQuantity,
        targetRatio: hedgeState.targetRatio,
        unrealizedPnl: unrealized,
        realizedPnl: realized,
        funding: hedgeState.accumulatedFunding,
      },
      combinedValue,
      combinedPnl: combinedValue - config.clmm.initialValueStable,
      residualDelta: residualDelta(step.lpDelta, hedgeState),
    };
  });

  return {
    includesFees: path.includesFees,
    includesFunding: config.fundingRate !== null && config.fundingIntervalHours !== null,
    points,
    hedgeState,
    hedgeEvents: hedgeState.events,
  };
}
