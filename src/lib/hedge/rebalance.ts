import Decimal from "decimal.js";
import { HedgeStrategyMode } from "@/types";

interface RebalanceInput {
  strategyMode: HedgeStrategyMode;
  currentShortNotional: Decimal;
  lpSolExposureUSD: Decimal; // amountSOL * currentPrice
  targetHedgeRatio: number; // e.g. 75
  rebalanceLowerThreshold: number; // e.g. 60
  rebalanceUpperThreshold: number; // e.g. 90
  minimumRebalanceNotional: number; // e.g. 5
  stepsSinceLastRebalance: number;
  rebalanceCooldownSteps: number;
}

export function determineHedgeAdjustment(input: RebalanceInput): Decimal {
  const {
    strategyMode,
    currentShortNotional,
    lpSolExposureUSD,
    targetHedgeRatio,
    rebalanceLowerThreshold,
    rebalanceUpperThreshold,
    minimumRebalanceNotional,
    stepsSinceLastRebalance,
    rebalanceCooldownSteps
  } = input;

  // Fixed strategy never rebalances automatically
  if (strategyMode === "FIXED") {
    return new Decimal(0);
  }

  // Handle case where LP goes out of range (100% USDC, 0 SOL)
  if (lpSolExposureUSD.isZero()) {
    // Both Dynamic and Threshold should close short entirely if exposure is gone
    if (currentShortNotional.gt(0)) {
      return currentShortNotional.negated();
    }
    return new Decimal(0);
  }

  const currentHedgeRatioPercent = currentShortNotional.div(lpSolExposureUSD).mul(100);
  const targetShortNotional = lpSolExposureUSD.mul(targetHedgeRatio).div(100);

  let needsRebalance = false;

  if (strategyMode === "DYNAMIC") {
    needsRebalance = true;
  } else if (strategyMode === "THRESHOLD") {
    needsRebalance = currentHedgeRatioPercent.lt(rebalanceLowerThreshold) ||
                     currentHedgeRatioPercent.gt(rebalanceUpperThreshold);
  }

  if (needsRebalance) {
    // Check cooldown
    if (stepsSinceLastRebalance < rebalanceCooldownSteps) {
      return new Decimal(0);
    }

    const adjustment = targetShortNotional.minus(currentShortNotional);

    // Check minimum notional size
    if (adjustment.abs().lt(minimumRebalanceNotional)) {
      return new Decimal(0);
    }

    return adjustment;
  }

  return new Decimal(0);
}
