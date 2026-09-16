import Decimal from "decimal.js";
import { RangeStatus, FeeModelType } from "@/types";

export function estimateFees(
  feeModelType: FeeModelType,
  rangeStatus: RangeStatus,
  poolFeeRate?: number | Decimal,
  estimatedLPShare?: number | Decimal,
  volumeUsd?: number | Decimal,
  poolFeesUsd?: number | Decimal,
  manualFeeAmount?: number | Decimal
): Decimal {
  // Determine range activity factor
  const rangeActivityFactor = rangeStatus === 'IN_RANGE' ? new Decimal(1) : new Decimal(0);

  if (feeModelType === 'NONE') {
    return new Decimal(0);
  }

  if (feeModelType === 'MANUAL') {
    // Basic flat distribution not strictly bound by range (per Phase 1 legacy support)
    return new Decimal(manualFeeAmount || 0);
  }

  // Multiply estimates by range status since fees are only earned in range for CLMM
  if (feeModelType === 'POOL_ESTIMATE') {
    if (!volumeUsd || !poolFeeRate || !estimatedLPShare) return new Decimal(0);
    const vol = new Decimal(volumeUsd);
    const rate = new Decimal(poolFeeRate).div(100);
    const share = new Decimal(estimatedLPShare).div(100);
    return vol.mul(rate).mul(share).mul(rangeActivityFactor);
  }

  if (feeModelType === 'HISTORICAL_POOL_FEES') {
    if (!poolFeesUsd || !estimatedLPShare) return new Decimal(0);
    const poolFees = new Decimal(poolFeesUsd);
    const share = new Decimal(estimatedLPShare).div(100);
    return poolFees.mul(share).mul(rangeActivityFactor);
  }

  if (feeModelType === 'POSITION_LEVEL') {
    // If provider gave exact position fees natively
    return new Decimal(poolFeesUsd || 0);
  }

  return new Decimal(0);
}
