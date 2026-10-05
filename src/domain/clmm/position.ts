/**
 * Exact CLMM engine — Uniswap-v3-style concentrated liquidity math
 * (docs/04-math-and-finance.md, Phase 2 of docs/06-roadmap.md).
 *
 * This is the EXACT model, labeled "Exact" in the UI (docs/04 assumptions).
 * It ADDS to — and never replaces — the Phase 1 simplified engine
 * (src/domain/lp/constant-product.ts), which stays available (docs/07:
 * do not delete earlier functionality).
 *
 * Token ordering (docs/04: "The implementation must handle token ordering
 * explicitly"): token0 = volatile, token1 = stable, and the canonical price is
 * P = amount1 / amount0 = stable-token value per 1 volatile token.
 *
 * Uniswap-v3-style amounts for liquidity L, with sa = √Pa, sb = √Pb, s = √P:
 *   P <= Pa:      amount0 = L·(sb − sa)/(sa·sb)    amount1 = 0
 *   Pa < P < Pb:  amount0 = L·(sb − s)/(s·sb)      amount1 = L·(s − sa)
 *   P >= Pb:      amount0 = 0                      amount1 = L·(sb − sa)
 *
 * Explicit assumptions:
 * - In-range entry only: lowerPrice < entryPrice < upperPrice (docs/04
 *   position creation). Out-of-range entry must be modeled explicitly later.
 * - Liquidity L is derived from the initial stable value V0 at entry:
 *   V0 = L·(2·s0 − sa − s0²/sb), so L = V0 / (2·s0 − sa − s0²/sb).
 * - Position delta = d(LP value)/dP in volatile-equivalent units:
 *   below range L·(sb − sa)/(sa·sb); in range L·(1/s − 1/sb); above range 0.
 * - No fees, funding, or rebalance costs (modeled in later phases).
 * - Internals use Decimal.js; public results are plain numbers for display.
 */

import Decimal from "decimal.js";

import { requirePositive } from "@/utils/decimal";

/** Range status terms from docs/04-math-and-finance.md. */
export type RangeStatus = "BELOW_RANGE" | "IN_RANGE" | "ABOVE_RANGE";

/** Explicit CLMM position config (docs/02-structure.md state design). */
export interface CLMMConfig {
  /** Entry price P0 — stable per 1 volatile */
  entryPrice: number;
  /** Lower range bound Pa — stable per 1 volatile */
  lowerPrice: number;
  /** Upper range bound Pb — stable per 1 volatile, must be > lowerPrice */
  upperPrice: number;
  /** Initial LP value V0, expressed in stable units */
  initialValueStable: number;
}

/** Token amounts held by the position: token0 = volatile, token1 = stable. */
export interface CLMMAmounts {
  amountVolatile: number;
  amountStable: number;
}

/** Form-level validation. Returns human-readable errors (empty array = valid). */
export function validateCLMMConfig(config: CLMMConfig): string[] {
  const errors: string[] = [];
  const { entryPrice, lowerPrice, upperPrice, initialValueStable } = config;
  const lowerValid = Number.isFinite(lowerPrice) && lowerPrice > 0;
  const upperValid = Number.isFinite(upperPrice) && upperPrice > 0;
  const entryValid = Number.isFinite(entryPrice) && entryPrice > 0;
  const valueValid = Number.isFinite(initialValueStable) && initialValueStable > 0;
  if (!lowerValid) errors.push("Lower price must be a positive number.");
  if (!upperValid) errors.push("Upper price must be a positive number.");
  if (!entryValid) errors.push("Entry price must be a positive number.");
  if (!valueValid) errors.push("Initial LP value must be a positive number.");
  // Range/ordering checks run only when their inputs are themselves valid, so
  // the form shows one meaningful error per mistake instead of cascades.
  if (lowerValid && upperValid && lowerPrice >= upperPrice) {
    errors.push("Upper price must be greater than lower price.");
  }
  const rangeValid = lowerValid && upperValid && lowerPrice < upperPrice;
  if (
    rangeValid &&
    entryValid &&
    !(entryPrice > lowerPrice && entryPrice < upperPrice)
  ) {
    errors.push(
      "In-range entry required: lower price < entry price < upper price (Phase 2 supports in-range entry only).",
    );
  }
  return errors;
}

function sqrtDecimal(value: number, name: string): Decimal {
  return requirePositive(value, name).sqrt();
}

/** Derives liquidity L from the initial stable value V0 at in-range entry. */
export function liquidityFromInitialValue(config: CLMMConfig): number {
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  if (config.entryPrice <= config.lowerPrice || config.entryPrice >= config.upperPrice) {
    throw new RangeError("entry price must be inside the range to derive liquidity");
  }
  const s0 = sqrtDecimal(config.entryPrice, "entryPrice");
  const sa = sqrtDecimal(config.lowerPrice, "lowerPrice");
  const sb = sqrtDecimal(config.upperPrice, "upperPrice");
  // V0 = L·(2·s0 − sa − s0²/sb); denominator > 0 exactly for in-range entry.
  const denom = s0.mul(2).minus(sa).minus(s0.mul(s0).div(sb));
  if (!denom.isPositive()) {
    throw new RangeError("entry price must be inside the range to derive liquidity");
  }
  return v0.div(denom).toNumber();
}

/** Token amounts at price P for liquidity L — docs/04 formulas, exact branches. */
export function clmmAmountsAtPrice(
  config: CLMMConfig,
  liquidity: number,
  price: number,
): CLMMAmounts {
  const l = requirePositive(liquidity, "liquidity");
  const sa = sqrtDecimal(config.lowerPrice, "lowerPrice");
  const sb = sqrtDecimal(config.upperPrice, "upperPrice");
  const s = sqrtDecimal(price, "price");
  // token0 = volatile, token1 = stable (explicit ordering, docs/04)
  if (price <= config.lowerPrice) {
    return {
      amountVolatile: l.mul(sb.minus(sa)).div(sa.mul(sb)).toNumber(),
      amountStable: 0,
    };
  }
  if (price >= config.upperPrice) {
    return {
      amountVolatile: 0,
      amountStable: l.mul(sb.minus(sa)).toNumber(),
    };
  }
  return {
    amountVolatile: l.mul(sb.minus(s)).div(s.mul(sb)).toNumber(),
    amountStable: l.mul(s.minus(sa)).toNumber(),
  };
}

/** LP value at price P, in stable units: amount0·P + amount1. */
export function clmmValueAtPrice(
  config: CLMMConfig,
  liquidity: number,
  price: number,
): number {
  const l = requirePositive(liquidity, "liquidity");
  const p = requirePositive(price, "price");
  const sa = sqrtDecimal(config.lowerPrice, "lowerPrice");
  const sb = sqrtDecimal(config.upperPrice, "upperPrice");
  const s = p.sqrt();
  if (price <= config.lowerPrice) {
    // Pure volatile: L·(sb − sa)/(sa·sb)·P
    return l.mul(sb.minus(sa)).div(sa.mul(sb)).mul(s.mul(s)).toNumber();
  }
  if (price >= config.upperPrice) {
    // Pure stable: L·(sb − sa)
    return l.mul(sb.minus(sa)).toNumber();
  }
  // x·P + y = L·s·(sb − s)/sb + L·(s − sa)
  return l.mul(s).mul(sb.minus(s)).div(sb).plus(l.mul(s.minus(sa))).toNumber();
}

/** LP PnL vs entry, in stable units: V(P) − V0. */
export function clmmPnlAtPrice(
  config: CLMMConfig,
  liquidity: number,
  price: number,
): number {
  const value = clmmValueAtPrice(config, liquidity, price);
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  return new Decimal(value).minus(v0).toNumber();
}

/** Position delta: d(LP value)/dP, in volatile-equivalent units. */
export function clmmDeltaAtPrice(
  config: CLMMConfig,
  liquidity: number,
  price: number,
): number {
  const l = requirePositive(liquidity, "liquidity");
  const sa = sqrtDecimal(config.lowerPrice, "lowerPrice");
  const sb = sqrtDecimal(config.upperPrice, "upperPrice");
  const s = sqrtDecimal(price, "price");
  if (price <= config.lowerPrice) {
    // Pure volatile holding: delta = amount0 = L·(sb − sa)/(sa·sb)
    return l.mul(sb.minus(sa)).div(sa.mul(sb)).toNumber();
  }
  if (price >= config.upperPrice) {
    // Pure stable holding: delta 0
    return 0;
  }
  // In range: dV/dP = L·(1/s − 1/sb)
  return l.div(s).minus(l.div(sb)).toNumber();
}

/** Range status at price P (docs/04): below / in / above. */
export function rangeStatusAtPrice(config: CLMMConfig, price: number): RangeStatus {
  requirePositive(price, "price");
  if (price <= config.lowerPrice) return "BELOW_RANGE";
  if (price >= config.upperPrice) return "ABOVE_RANGE";
  return "IN_RANGE";
}

/** Initial token amounts at the entry price (in-range by validation). */
export function initialCLMMAmounts(config: CLMMConfig): CLMMAmounts {
  return clmmAmountsAtPrice(config, liquidityFromInitialValue(config), config.entryPrice);
}
