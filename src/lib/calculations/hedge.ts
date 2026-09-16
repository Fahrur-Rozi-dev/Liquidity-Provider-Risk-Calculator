import Decimal from "decimal.js";
import { HedgeResult } from "@/types";

/**
 * Calculates hedge parameters based on short notional and price changes.
 *
 * Assumptions:
 * - Short PnL = shortNotional * ((shortEntryPrice - targetPrice) / shortEntryPrice)
 * - Effective hedge ratio = shortNotional / currentVolatileValue
 */
export function calculateHedge(
  shortNotional: number | Decimal,
  shortEntryPrice: number | Decimal,
  targetPrice: number | Decimal,
  currentVolatileValue: number | Decimal
): HedgeResult {
  const notional = new Decimal(shortNotional);
  const entryP = new Decimal(shortEntryPrice);
  const targetP = new Decimal(targetPrice);
  const currentVolValue = new Decimal(currentVolatileValue);

  // Short PnL: shortNotional × ((shortEntryPrice - targetPrice) / shortEntryPrice)
  const priceDiff = entryP.minus(targetP);
  const shortPnL = notional.mul(priceDiff.dividedBy(entryP));

  // Effective Hedge Ratio: shortNotional / currentVolatileValue
  // Using 0 if currentVolatileValue is 0 to avoid division by zero
  const effectiveHedgeRatio = currentVolValue.isZero()
    ? new Decimal(0)
    : notional.dividedBy(currentVolValue);

  // Net directional exposure = currentVolatileAssetValue - shortNotional
  const netDirectionalExposure = currentVolValue.minus(notional);

  return {
    shortNotional: notional,
    shortPnL,
    effectiveHedgeRatio,
    netDirectionalExposure,
  };
}

/**
 * Calculates the short notional value given the initial volatile value and a hedge ratio (in percentage).
 */
export function calculateAutoShortNotional(
  initialVolatileValue: number | Decimal,
  hedgeRatioPercent: number | Decimal
): Decimal {
  const initVol = new Decimal(initialVolatileValue);
  const hr = new Decimal(hedgeRatioPercent).dividedBy(100);
  return initVol.mul(hr);
}
