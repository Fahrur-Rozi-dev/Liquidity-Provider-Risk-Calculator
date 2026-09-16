import Decimal from "decimal.js";
import { RangeStatus } from "@/types";

export function estimateFees(
  volume: number | undefined,
  poolFeeRate: number,
  estimatedLPShare: number,
  rangeStatus: RangeStatus
): Decimal {
  if (!volume || rangeStatus !== 'IN_RANGE') {
    return new Decimal(0);
  }

  const vol = new Decimal(volume);
  const feeRate = new Decimal(poolFeeRate).div(100);
  const share = new Decimal(estimatedLPShare).div(100);

  return vol.mul(feeRate).mul(share);
}
