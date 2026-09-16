import Decimal from "decimal.js";
import { LPResult } from "@/types";

/**
 * Calculates LP parameters based on simplified baseline model (hold-based).
 *
 * Assumptions:
 * - Volatile asset and stablecoin values are split based on allocations at entry.
 * - Current volatile value is calculated simply as volatile quantity * target price.
 * - This model does NOT account for concentrated liquidity mechanics or impermanent loss.
 */
export function calculateLPPosition(
  totalCapital: number | Decimal,
  volatileAllocationPercent: number | Decimal,
  entryPrice: number | Decimal,
  targetPrice: number | Decimal
): LPResult {
  const tCapital = new Decimal(totalCapital);
  const vAlloc = new Decimal(volatileAllocationPercent).dividedBy(100);
  const ePrice = new Decimal(entryPrice);
  const tPrice = new Decimal(targetPrice);

  // 1. Initial Volatile Asset Value
  const initialVolatileValue = tCapital.mul(vAlloc);

  // 2. Initial Stablecoin Value
  const initialStableValue = tCapital.minus(initialVolatileValue);

  // 3. Volatile Asset Quantity
  const volatileQuantity = initialVolatileValue.dividedBy(ePrice);

  // 4. Target Value of Volatile Asset
  const currentVolatileValue = volatileQuantity.mul(tPrice);

  // 5. Simplified LP Value
  const lpValue = currentVolatileValue.plus(initialStableValue);

  // Asset PnL = currentVolatileValue - initialVolatileValue
  const assetPnL = currentVolatileValue.minus(initialVolatileValue);

  return {
    initialVolatileValue,
    initialStableValue,
    volatileQuantity,
    currentVolatileValue,
    lpValue,
    assetPnL,
  };
}
