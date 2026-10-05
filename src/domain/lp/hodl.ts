/**
 * HODL benchmark & impermanent loss — LP domain (docs/02-structure.md places
 * the HODL benchmark and IL under LP, not CLMM).
 *
 * HODL means retaining the initial token quantities without LP rebalancing
 * (docs/04). IL is a comparison between LP value and the HODL benchmark at the
 * SAME scenario price — never a generic price loss.
 *
 * Sign convention: IL = LP value − HODL value.
 * Negative = LP underperforms HODL; zero = parity (at entry for a fresh position).
 */

import Decimal from "decimal.js";

import type { TokenReserves } from "./constant-product";
import { requirePositive } from "@/utils/decimal";

/** HODL value at price P: x0·P + y0 — the initial quantities are never rebalanced. */
export function hodlValueAtPrice(initial: TokenReserves, price: number): number {
  const p = requirePositive(price, "price");
  const x = new Decimal(initial.amountVolatile);
  const y = new Decimal(initial.amountStable);
  return x.mul(p).plus(y).toNumber();
}

/** IL vs the HODL benchmark: lpValue − hodlValue (negative = LP underperforms). */
export function impermanentLoss(lpValue: number, hodlValue: number): number {
  if (!Number.isFinite(lpValue) || !Number.isFinite(hodlValue)) {
    throw new RangeError("lpValue and hodlValue must be finite numbers");
  }
  return new Decimal(lpValue).minus(hodlValue).toNumber();
}
