import Decimal from "decimal.js";
import { TotalResult, LPResult, HedgeResult } from "@/types";

/**
 * Calculates Total PnL incorporating LP result, Hedge result, fees, funding, and costs.
 */
export function calculateTotalPnL(
  lpResult: LPResult,
  hedgeResult: HedgeResult,
  lpFeeIncome: number | Decimal,
  fundingCost: number | Decimal,
  openShortCost: number | Decimal,
  closeShortCost: number | Decimal,
  rebalanceCost: number | Decimal,
  totalCapital: number | Decimal
): TotalResult {
  const fees = new Decimal(lpFeeIncome);
  const funding = new Decimal(fundingCost);

  const oCost = new Decimal(openShortCost);
  const cCost = new Decimal(closeShortCost);
  const rCost = new Decimal(rebalanceCost);
  const tradingCosts = oCost.plus(cCost).plus(rCost);

  // Net PnL = Asset PnL + Short PnL + Fees - Funding - Trading Costs
  const combinedPnL = lpResult.assetPnL.plus(hedgeResult.shortPnL);

  const netPnL = combinedPnL
    .plus(fees)
    .minus(funding)
    .minus(tradingCosts);

  const tCapital = new Decimal(totalCapital);
  const netPnLPercentage = tCapital.isZero()
    ? new Decimal(0)
    : netPnL.dividedBy(tCapital).mul(100);

  // CLMM HODL Benchmarks
  let hodlPnL: Decimal | undefined;
  let hodlPlusHedgePnL: Decimal | undefined;

  if (lpResult.hodlValue) {
    hodlPnL = lpResult.hodlValue.minus(tCapital);
    hodlPlusHedgePnL = hodlPnL.plus(hedgeResult.shortPnL);
  }

  return {
    lpResult,
    hedgeResult,
    lpFees: fees,
    funding,
    tradingCosts,
    netPnL,
    netPnLPercentage,
    hodlPnL,
    hodlPlusHedgePnL
  };
}
