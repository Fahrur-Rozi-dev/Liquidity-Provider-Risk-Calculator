/**
 * Simplified LP engine — constant-product 50/50 pool (x·y = k).
 *
 * This is the Phase 1 model (docs/06-roadmap.md). It is intentionally NOT the
 * exact concentrated-liquidity math; Phase 2 replaces it with exact CLMM
 * formulas (docs/04-math-and-finance.md). Every number produced here is a
 * "Simplified model" estimate and must be labeled as such in the UI —
 * never presented as an exact protocol result.
 *
 * Price convention (docs/04): P = stable-token value per 1 volatile token.
 * Example: SOL/USDC at 150 means 1 SOL = 150 USDC.
 *
 * Explicit assumptions:
 * - 50/50 value split at entry: stableReserve0 = V0/2, volatileReserve0 = V0/(2·P0)
 * - Pool price P = stableReserve / volatileReserve
 * - No fees, funding, or rebalance costs (modeled in later phases)
 *
 * Internals use Decimal.js; public results are plain numbers for display.
 */

import { requirePositive } from "@/utils/decimal";

export interface LPPositionConfig {
  /** Entry price P0 — stable per 1 volatile */
  entryPrice: number;
  /** Initial LP value V0, expressed in stable units */
  initialValueStable: number;
}

export interface TokenReserves {
  amountVolatile: number;
  amountStable: number;
}

/** Initial reserves implied by the 50/50 entry: x0 = V0/(2·P0), y0 = V0/2. */
export function initialReserves(config: LPPositionConfig): TokenReserves {
  const p0 = requirePositive(config.entryPrice, "entryPrice");
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  const stable = v0.div(2);
  const volatile = stable.div(p0);
  return { amountVolatile: volatile.toNumber(), amountStable: stable.toNumber() };
}

/** LP value at price P: V(P) = V0 · sqrt(P/P0). */
export function lpValueAtPrice(config: LPPositionConfig, price: number): number {
  const p0 = requirePositive(config.entryPrice, "entryPrice");
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  const p = requirePositive(price, "price");
  return v0.mul(p.div(p0).sqrt()).toNumber();
}

/** Reserves at price P for the same pool — the x·y = k invariant is preserved. */
export function lpAmountsAtPrice(config: LPPositionConfig, price: number): TokenReserves {
  const p0 = requirePositive(config.entryPrice, "entryPrice");
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  const p = requirePositive(price, "price");
  // k = V0² / (4·P0); x = sqrt(k/P) volatile, y = sqrt(k·P) stable
  const k = v0.mul(v0).div(p0.mul(4));
  return {
    amountVolatile: k.div(p).sqrt().toNumber(),
    amountStable: k.mul(p).sqrt().toNumber(),
  };
}

/** LP PnL vs entry, in stable units: V(P) − V0. */
export function lpPnlAtPrice(config: LPPositionConfig, price: number): number {
  const p0 = requirePositive(config.entryPrice, "entryPrice");
  const v0 = requirePositive(config.initialValueStable, "initialValueStable");
  const p = requirePositive(price, "price");
  return v0.mul(p.div(p0).sqrt()).minus(v0).toNumber();
}

/** Form-level validation. Returns human-readable errors (empty array = valid). */
export function validateLPPositionConfig(config: LPPositionConfig): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(config.entryPrice) || config.entryPrice <= 0) {
    errors.push("Entry price must be a positive number.");
  }
  if (!Number.isFinite(config.initialValueStable) || config.initialValueStable <= 0) {
    errors.push("Initial LP value must be a positive number.");
  }
  return errors;
}
