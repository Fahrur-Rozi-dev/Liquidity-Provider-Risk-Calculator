/**
 * Basic short hedge — Phase 1 (docs/06-roadmap.md).
 *
 * A fixed short position opened at entry against the volatile-side exposure.
 * Short PnL = quantity · (entryPrice − price): profitable when price falls.
 *
 * Explicit assumptions:
 * - Quantity is fixed at entry: q = ratio · V0 / (2·P0) — a configurable
 *   fraction of the volatile-side value at entry
 * - No funding, borrow costs, rebalancing, or margin/liquidation modeling
 *   (Phase 3 adds dynamic targets, tranches, funding, and costs)
 * - Read-only analysis only — this engine never executes anything
 *
 * Price convention (docs/04): P = stable value per 1 volatile token.
 */

import Decimal from "decimal.js";

import type { LPPositionConfig } from "@/domain/lp";
import { requirePositive } from "@/utils/decimal";

export interface HedgeConfig {
  mode: "none" | "fixed";
  /** Fraction of the volatile-side exposure hedged, 0..1 */
  ratio: number;
}

/** Form-level validation. Returns human-readable errors (empty array = valid). */
export function validateHedgeConfig(config: HedgeConfig): string[] {
  const errors: string[] = [];
  if (config.mode !== "none" && config.mode !== "fixed") {
    errors.push("Unsupported hedge mode (Phase 1 supports none/fixed only).");
  }
  if (!Number.isFinite(config.ratio) || config.ratio < 0 || config.ratio > 1) {
    errors.push("Hedge ratio must be between 0 and 1.");
  }
  return errors;
}

function assertRatio(ratio: number): Decimal {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new RangeError("hedge ratio must be a finite number within 0..1");
  }
  return new Decimal(ratio);
}

/** Short quantity in volatile units: q = ratio · V0 / (2·P0); 0 when mode is none. */
export function shortQuantityAtEntry(hedge: HedgeConfig, lp: LPPositionConfig): number {
  if (hedge.mode === "none") return 0;
  const ratio = assertRatio(hedge.ratio);
  const p0 = requirePositive(lp.entryPrice, "entryPrice");
  const v0 = requirePositive(lp.initialValueStable, "initialValueStable");
  return ratio.mul(v0).div(p0.mul(2)).toNumber();
}

/** Short notional valued at entry, in stable units: q · P0. */
export function shortNotionalAtEntry(hedge: HedgeConfig, lp: LPPositionConfig): number {
  if (hedge.mode === "none") return 0;
  // quantity may be 0 (ratio 0) — only negative/non-finite is invalid.
  const quantity = shortQuantityAtEntry(hedge, lp);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("quantity must be a non-negative finite number");
  }
  const p0 = requirePositive(lp.entryPrice, "entryPrice");
  return new Decimal(quantity).mul(p0).toNumber();
}

/** Short PnL at price P, in stable units: q · (P0 − P). */
export function shortPnlAtPrice(hedge: HedgeConfig, lp: LPPositionConfig, price: number): number {
  if (hedge.mode === "none") return 0;
  const ratio = assertRatio(hedge.ratio);
  const p0 = requirePositive(lp.entryPrice, "entryPrice");
  const v0 = requirePositive(lp.initialValueStable, "initialValueStable");
  const p = requirePositive(price, "price");
  const quantity = ratio.mul(v0).div(p0.mul(2));
  return quantity.mul(p0.minus(p)).toNumber();
}

/**
 * Short quantity sized from an explicit volatile-side exposure value at entry
 * (e.g. the CLMM position's volatile amount · entry price):
 * q = ratio · exposure / P0; 0 when mode is none.
 *
 * Phase 2 addition — composes with any LP engine that exposes its volatile-side
 * value at entry, without coupling the hedge domain to that engine.
 */
export function shortQuantityForExposure(
  hedge: HedgeConfig,
  exposureValueStable: number,
  price0: number,
): number {
  if (hedge.mode === "none") return 0;
  const ratio = assertRatio(hedge.ratio);
  const exposure = requirePositive(exposureValueStable, "exposureValueStable");
  const p0 = requirePositive(price0, "entryPrice");
  return ratio.mul(exposure).div(p0).toNumber();
}

/**
 * Short PnL for an explicit quantity opened at entry: q · (P0 − P).
 * Phase 2 addition — quantity-based variant of shortPnlAtPrice.
 * (Zero quantity normalizes to +0: 0 × a negative price move must not yield −0.)
 */
export function shortPnlForQuantity(
  quantity: number,
  entryPrice: number,
  price: number,
): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("quantity must be a non-negative finite number");
  }
  const p0 = requirePositive(entryPrice, "entryPrice");
  const p = requirePositive(price, "price");
  const pnl = new Decimal(quantity).mul(p0.minus(p));
  return pnl.isZero() ? 0 : pnl.toNumber();
}
