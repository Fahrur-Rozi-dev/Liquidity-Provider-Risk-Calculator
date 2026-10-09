/**
 * Dynamic hedge engine — Phase 4 (docs/06-roadmap.md "Dynamic Hedge",
 * docs/04-math-and-finance.md Hedge/Hedge Tranches/Funding/Rebalance Costs).
 *
 * ADDS to — never replaces — the Phase 1 fixed-short engine
 * (src/domain/hedge/short.ts), which stays available for the simplified
 * calculator (docs/07). All hedge modes consume the same normalized price
 * inputs (docs/06) and reuse the CLMM engine for LP exposure — no duplicated
 * CLMM math here.
 *
 * Read-only simulation only: this engine models what a hedge WOULD do. It
 * never executes, signs, or transacts anything (docs/09).
 *
 * Conventions (docs/04):
 * - price = stable per 1 volatile;
 * - short PnL for a tranche = quantity · (entryPrice − price), etc.;
 * - reductions use FIFO unless explicitly overridden;
 * - funding is modeled separately from price PnL and kept separate in output;
 * - rebalance costs (fee + slippage + optional fixed) are tracked separately
 *   and never silently folded into price PnL.
 */

import Decimal from "decimal.js";

import { requirePositive } from "@/utils/decimal";

/** How the short is adjusted when price moves (docs/06, docs/02). */
export type HedgeRebalanceMode = "fixed" | "dynamic" | "threshold";

/** Config for the tranche hedge simulator — explicit per docs/02 state design. */
export interface HedgeSimulatorConfig {
  mode: HedgeRebalanceMode;
  /** Target hedge ratio, fraction of volatile exposure, 0..1 (dynamic default 0.75). */
  targetRatio: number;
  /**
   * Threshold mode only: rebalance only when |actual − target| exceeds this
   * drift, as a fraction of exposure (0..1). Ignored in dynamic/fixed.
   */
  rebalanceThreshold: number;
  /** Minimum rebalance size, fraction of the volatile exposure (0..1). */
  minRebalanceRatio: number;
  /** Minimum seconds between rebalances (docs/06: cooldown). */
  cooldownSeconds: number;
  /** Trading fee fraction per rebalance notional (e.g. 0.0004). */
  rebalanceFeeRate: number;
  /** Slippage fraction per rebalance notional. */
  rebalanceSlippageRate: number;
  /** Optional fixed cost per rebalance, stable units (0 = none). */
  rebalanceFixedCost: number;
}

/** One short tranche (docs/04 Hedge Tranches). */
export interface HedgeSimTranche {
  id: string;
  direction: "short";
  entryPrice: number;
  /** Original quantity in volatile units. */
  quantity: number;
  /** Remaining (still-open) quantity in volatile units. */
  remainingQuantity: number;
  /** Sequence index of the opening event. */
  openedAt: number;
  /** Cumulative funding per unit accrued on the tranche since opening. */
  accumulatedFundingPerUnit: number;
  /** Realized PnL booked when this tranche was reduced. */
  realizedPnl: number;
}

/** Simulator events appended to the event log (docs/06: event log). */
export type HedgeSimEventType =
  | "open"
  | "increase"
  | "reduce"
  | "funding"
  | "skipped_cooldown"
  | "skipped_threshold"
  | "skipped_min_size"
  | "closed";

export interface HedgeSimEvent {
  index: number;
  /** Sequence index / simulated timestamp of the price tick that caused it. */
  atTick: number;
  type: HedgeSimEventType;
  /** Free-form, display-ready description. */
  message: string;
  /** Quantity delta in volatile units (signed: positive = more short). */
  quantityDelta: number;
  /** Price at the event. */
  price: number;
  /** Cost charged for the event, stable units (rebalance fee+slippage+fixed). */
  cost: number;
  /** Funding applied by the event, stable units (kept separate from costs). */
  funding: number;
}

/** Immutable simulator state after a tick (docs/02: explicit configs, no giant global state). */
export interface HedgeSimState {
  mode: HedgeRebalanceMode;
  targetRatio: number;
  /** Total remaining short quantity across tranches, volatile units. */
  shortQuantity: number;
  /** Tranches, oldest first; never erased (docs/04). */
  tranches: readonly HedgeSimTranche[];
  /** Cumulative rebalance costs (fee + slippage + fixed), stable units. */
  accumulatedRebalanceCosts: number;
  /** Cumulative funding paid, stable units (separate model, docs/04). */
  accumulatedFunding: number;
  /** Sequence index of the last accepted rebalance (for cooldown). */
  lastRebalanceTick: number;
  /** UI-element log of open/increase/reduce/fund/skip/close events. */
  events: readonly HedgeSimEvent[];
}

/** Validated hedge-simulator config; returns human-readable errors (empty = valid). */
export function validateHedgeSimulatorConfig(config: HedgeSimulatorConfig): string[] {
  const errors: string[] = [];
  if (config.mode !== "fixed" && config.mode !== "dynamic" && config.mode !== "threshold") {
    errors.push("Unsupported hedge mode (fixed/dynamic/threshold).");
  }
  if (!Number.isFinite(config.targetRatio) || config.targetRatio < 0 || config.targetRatio > 1) {
    errors.push("Target hedge ratio must be between 0 and 1.");
  }
  if (
    config.mode === "threshold" &&
    (!Number.isFinite(config.rebalanceThreshold) || config.rebalanceThreshold < 0 || config.rebalanceThreshold > 1)
  ) {
    errors.push("Rebalance threshold must be between 0 and 1.");
  }
  if (
    !Number.isFinite(config.minRebalanceRatio) ||
    config.minRebalanceRatio < 0 ||
    config.minRebalanceRatio > 1
  ) {
    errors.push("Minimum rebalance ratio must be between 0 and 1.");
  }
  if (!Number.isFinite(config.cooldownSeconds) || config.cooldownSeconds < 0) {
    errors.push("Cooldown seconds must be non-negative.");
  }
  if (!Number.isFinite(config.rebalanceFeeRate) || config.rebalanceFeeRate < 0) {
    errors.push("Rebalance fee rate must be non-negative.");
  }
  if (!Number.isFinite(config.rebalanceSlippageRate) || config.rebalanceSlippageRate < 0) {
    errors.push("Rebalance slippage rate must be non-negative.");
  }
  if (!Number.isFinite(config.rebalanceFixedCost) || config.rebalanceFixedCost < 0) {
    errors.push("Rebalance fixed cost must be non-negative.");
  }
  return errors;
}

/** Initial empty simulator state. */
export function initialHedgeSimState(config: HedgeSimulatorConfig): HedgeSimState {
  return {
    mode: config.mode,
    targetRatio: config.targetRatio,
    shortQuantity: 0,
    tranches: [],
    accumulatedRebalanceCosts: 0,
    accumulatedFunding: 0,
    lastRebalanceTick: Number.NEGATIVE_INFINITY,
    events: [],
  };
}

/** Unrealized mark-to-market PnL of the open short at price P (stable units). */
export function hedgeSimUnrealizedPnl(state: HedgeSimState, price: number): number {
  let total = new Decimal(0);
  for (const tranche of state.tranches) {
    if (tranche.remainingQuantity === 0) continue;
    const pnl = new Decimal(tranche.remainingQuantity).mul(tranche.entryPrice - price);
    total = total.plus(pnl);
  }
  return total.isZero() ? 0 : total.toNumber();
}

/** Realized PnL booked from closed parts of tranches (stable units). */
export function hedgeSimRealizedPnl(state: HedgeSimState): number {
  let total = new Decimal(0);
  for (const tranche of state.tranches) {
    total = total.plus(tranche.realizedPnl);
  }
  return total.isZero() ? 0 : total.toNumber();
}

/** Cumulative funding per remaining short unit (volatile units). */
export function hedgeSimFundingPerUnit(state: HedgeSimState): number {
  const perUnit = state.tranches.reduce(
    (sum, tranche) => sum + tranche.accumulatedFundingPerUnit * tranche.remainingQuantity,
    0,
  );
  let shortQuantitySum = 0;
  for (const tranche of state.tranches) {
    shortQuantitySum += tranche.remainingQuantity;
  }
  if (!Number.isFinite(shortQuantitySum) || shortQuantitySum < 0) {
    throw new RangeError("short quantity must be a non-negative finite number");
  }
  if (shortQuantitySum === 0) return 0;
  return perUnit / shortQuantitySum;
}

/**
 * Funding payment for one interval on the current short quantity:
 * payment = q · rate · intervalHours. Positive = hedge pays (short pays when
 * rate > 0 in the usual perp convention). Kept separate from price PnL.
 */
export function fundingPayment(quantity: number, rate: number, intervalHours: number): Decimal {
  return new Decimal(quantity).mul(new Decimal(rate).mul(intervalHours));
}

/** Cost charge for a rebalance of the given notional (fee + slippage + fixed). */
export function rebalanceCost(notional: number, config: HedgeSimulatorConfig): Decimal {
  const rate = new Decimal(config.rebalanceFeeRate).plus(config.rebalanceSlippageRate);
  const proportional = rate.mul(notional);
  const fixed = new Decimal(config.rebalanceFixedCost);
  const total = proportional.plus(fixed);
  return total.isZero() ? new Decimal(0) : total;
}

/** Target short quantity for the volatile exposure at price P: ratio · exposure. */
export function targetShortQuantity(ratio: number, exposureValueStable: number, price: number): number {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new RangeError("target ratio must be within 0..1");
  }
  const exposure = requirePositive(exposureValueStable, "exposureValueStable").toNumber();
  const p = requirePositive(price, "price").toNumber();
  const quantity = new Decimal(ratio).mul(exposure).div(p).toNumber();
  return quantity === 0 ? 0 : quantity;
}

/**
 * FIFO: reduce the oldest tranches first until `reduceQuantity` is covered.
 * Returns new tranche array plus realized PnL; never mutates the input.
 */
export function fifoReduce(
  tranches: readonly HedgeSimTranche[],
  reduceQuantity: number,
  price: number,
): { tranches: HedgeSimTranche[]; realizedPnl: number; fullyClosed: boolean } {
  if (!Number.isFinite(reduceQuantity) || reduceQuantity < 0) {
    throw new RangeError("reduceQuantity must be non-negative");
  }
  const p = requirePositive(price, "price").toNumber();
  let remaining = new Decimal(reduceQuantity);
  let realized = new Decimal(0);
  const result: HedgeSimTranche[] = [];
  for (const tranche of tranches) {
    if (tranche.remainingQuantity === 0 || remaining.isZero()) {
      result.push(tranche);
      continue;
    }
    const remainingDec = new Decimal(tranche.remainingQuantity);
    const take = Decimal.min(remaining, remainingDec);
    // Tranche PnL on the closed part: quantity · (entry − price).
    const pnl = take.mul(tranche.entryPrice - p);
    realized = realized.plus(pnl);
    remaining = remaining.minus(take);
    const remainingAfter = remainingDec.minus(take);
    result.push(
      remainingAfter.isZero()
        ? { ...tranche, remainingQuantity: 0, realizedPnl: tranche.realizedPnl + pnl.toNumber() }
        : { ...tranche, remainingQuantity: remainingAfter.toNumber(), realizedPnl: tranche.realizedPnl + pnl.toNumber() },
    );
  }
  if (!remaining.isZero()) {
    throw new RangeError("reduceQuantity exceeds open short quantity");
  }
  return { tranches: result, realizedPnl: realized.isZero() ? 0 : realized.toNumber(), fullyClosed: remaining.isZero() };
}

/**
 * Processes one price tick: applies funding for the elapsed interval, then
 * evaluates the mode's rebalance rule and executes it (with cooldown,
 * threshold and minimum-size guards). Pure: returns the next state.
 *
 * @param tickIndex sequence index of this tick (timestamp or event index)
 * @param price stable per 1 volatile at this tick
 * @param exposureValueStable volatile-side LP exposure value at this price
 * @param fundingRate funding per interval as a fraction (null = not modeled)
 * @param intervalHours hours of funding time since the previous tick
 */
export function hedgeSimStep(
  state: HedgeSimState,
  config: HedgeSimulatorConfig,
  input: {
    tickIndex: number;
    price: number;
    exposureValueStable: number;
    fundingRate: number | null;
    intervalHours: number | null;
  },
): HedgeSimState {
  const price = requirePositive(input.price, "price").toNumber();
  const exposure = requirePositive(input.exposureValueStable, "exposureValueStable").toNumber();
  const tick = input.tickIndex;

  // 1. Funding (separate model, docs/04) — accrues on the quantity open during
  //    the elapsed interval, attributed per tranche for the event display.
  let nextTranches = [...state.tranches];
  let fundingPaid = 0;
  if (input.fundingRate !== null && input.intervalHours !== null && input.intervalHours > 0) {
    if (!Number.isFinite(input.fundingRate) || !Number.isFinite(input.intervalHours)) {
      throw new RangeError("funding inputs must be finite numbers");
    }
    const perUnit = new Decimal(input.fundingRate).mul(input.intervalHours);
    let total = new Decimal(0);
    nextTranches = nextTranches.map((tranche) => {
      if (tranche.remainingQuantity === 0) return tranche;
      const payment = perUnit.mul(tranche.remainingQuantity).toNumber();
      total = total.plus(payment);
      return {
        ...tranche,
        accumulatedFundingPerUnit: tranche.accumulatedFundingPerUnit + perUnit.toNumber(),
      };
    });
    fundingPaid = total.toNumber();
  }

  const fundingEvent: HedgeSimEvent | null =
    fundingPaid !== 0
      ? {
          index: state.events.length,
          atTick: tick,
          type: "funding",
          message: `Funding applied: ${fundingPaid.toFixed(6)} stable units over the elapsed interval.`,
          quantityDelta: 0,
          price,
          cost: 0,
          funding: fundingPaid,
        }
      : null;

  // 2. Rebalance evaluation per mode against the CURRENT open quantity.
  const shortQuantity = nextTranches.reduce((sum, t) => sum + t.remainingQuantity, 0);
  const targetQuantity = targetShortQuantity(config.targetRatio, exposure, price);
  const desiredDelta = targetQuantity - shortQuantity;

  let rebalanceEvent: HedgeSimEvent | null = null;
  let rebalanceCostValue = 0;

  // Fixed mode opens ONCE at the first tick (target ratio at that price) and
  // then never rebalances — that is the documented Phase 1/4 fixed behavior
  // (docs/04: quantity fixed at entry). Dynamic/threshold tracks the target.
  const fixedShouldOpen =
    config.mode === "fixed" && shortQuantity === 0 && state.lastRebalanceTick === Number.NEGATIVE_INFINITY;

  if ((fixedShouldOpen || (config.mode !== "fixed" && desiredDelta !== 0))) {
    const modeAllowed =
      config.mode !== "threshold" ||
      fixedShouldOpen ||
      Math.abs(desiredDelta) / Math.max(targetQuantity, shortQuantity) > config.rebalanceThreshold;

    if (!modeAllowed) {
      // Only log a threshold skip from an actually-moving configuration.
      if (config.mode === "threshold" && desiredDelta !== 0) {
        rebalanceEvent = {
          index: (fundingEvent?.index ?? state.events.length - 1) + 1,
          atTick: tick,
          type: "skipped_threshold",
          message: `Rebalance skipped: drift ${(Math.abs(desiredDelta) / Math.max(targetQuantity, shortQuantity) * 100).toFixed(2)}% is within the ${(config.rebalanceThreshold * 100).toFixed(2)}% threshold.`,
          quantityDelta: 0,
          price,
          cost: 0,
          funding: 0,
        };
      }
    } else if (tick - state.lastRebalanceTick < config.cooldownSeconds) {
      rebalanceEvent = {
        index: (fundingEvent?.index ?? state.events.length - 1) + 1,
        atTick: tick,
        type: "skipped_cooldown",
        message: `Rebalance skipped: cooldown (${config.cooldownSeconds}s) not elapsed since the last rebalance.`,
        quantityDelta: 0,
        price,
        cost: 0,
        funding: 0,
      };
    } else {
      const absDelta = Math.abs(desiredDelta);
      const minRatioQuantity = config.minRebalanceRatio * (exposure / price);
      if (absDelta < minRatioQuantity) {
        rebalanceEvent = {
          index: (fundingEvent?.index ?? state.events.length - 1) + 1,
          atTick: tick,
          type: "skipped_min_size",
          message: `Rebalance skipped: size ${absDelta.toFixed(6)} is below the minimum (${minRatioQuantity.toFixed(6)} volatile units).`,
          quantityDelta: 0,
          price,
          cost: 0,
          funding: 0,
        };
      } else {
        // Execute: open/increase (desiredDelta > 0) or FIFO-reduce (< 0).
        const notional = absDelta * price;
        rebalanceCostValue = rebalanceCost(notional, config).toNumber();
        if (desiredDelta > 0) {
          const opening = shortQuantity === 0 ? "open" : "increase";
          nextTranches = [
            ...nextTranches,
            {
              id: `t${tick}-${nextTranches.length}`,
              direction: "short" as const,
              entryPrice: price,
              quantity: desiredDelta,
              remainingQuantity: desiredDelta,
              openedAt: tick,
              accumulatedFundingPerUnit: 0,
              realizedPnl: 0,
            },
          ];
          rebalanceEvent = {
            index: (fundingEvent?.index ?? state.events.length - 1) + 1,
            atTick: tick,
            type: opening as "open" | "increase",
            message: `${opening === "open" ? "Opened" : "Increased"} short by ${desiredDelta.toFixed(6)} at ${price} (target ${config.targetRatio * 100}% of exposure). Cost ${rebalanceCostValue.toFixed(4)}.`,
            quantityDelta: desiredDelta,
            price,
            cost: rebalanceCostValue,
            funding: 0,
          };
        } else {
          const reduce = -desiredDelta;
          const reduced = fifoReduce(nextTranches, reduce, price);
          nextTranches = reduced.tranches;
          const allClosed = nextTranches.every((t) => t.remainingQuantity === 0);
          rebalanceEvent = {
            index: (fundingEvent?.index ?? state.events.length - 1) + 1,
            atTick: tick,
            type: allClosed ? "closed" : "reduce",
            message: `${allClosed ? "Closed" : "Reduced"} short by ${reduce.toFixed(6)} at ${price} via FIFO (realized +${reduced.realizedPnl.toFixed(4)}). Cost ${rebalanceCostValue.toFixed(4)}.`,
            quantityDelta: desiredDelta,
            price,
            cost: rebalanceCostValue,
            funding: 0,
          };
        }
      }
    }
  }

  const events = [
    ...state.events,
    ...(fundingEvent ? [fundingEvent] : []),
    ...(rebalanceEvent ? [rebalanceEvent] : []),
  ];

  const acceptedRebalance = rebalanceEvent?.type === "open" || rebalanceEvent?.type === "increase" || rebalanceEvent?.type === "reduce" || rebalanceEvent?.type === "closed";

  return {
    mode: config.mode,
    targetRatio: config.targetRatio,
    shortQuantity: nextTranches.reduce((sum, t) => sum + t.remainingQuantity, 0),
    tranches: nextTranches,
    accumulatedRebalanceCosts: state.accumulatedRebalanceCosts + rebalanceCostValue,
    accumulatedFunding: state.accumulatedFunding + fundingPaid,
    lastRebalanceTick: acceptedRebalance ? tick : state.lastRebalanceTick,
    events,
  };
}

/**
 * Runs the full tick sequence through hedgeSimStep. Pure: builds the state
 * step by step from the initial state.
 */
export function runHedgeSimulation(
  config: HedgeSimulatorConfig,
  ticks: readonly {
    tickIndex: number;
    price: number;
    exposureValueStable: number;
    fundingRate: number | null;
    intervalHours: number | null;
  }[],
): HedgeSimState {
  const configErrors = validateHedgeSimulatorConfig(config);
  if (configErrors.length > 0) {
    throw new RangeError(configErrors.join(" "));
  }
  let state = initialHedgeSimState(config);
  for (const tick of ticks) {
    state = hedgeSimStep(state, config, tick);
  }
  return state;
}

/**
 * Residual delta after the hedge: LP delta − open short quantity, in volatile
 * units per unit of price (docs/06 "residual delta").
 */
export function residualDelta(lpDelta: number, state: HedgeSimState): number {
  return lpDelta - state.shortQuantity;
}
