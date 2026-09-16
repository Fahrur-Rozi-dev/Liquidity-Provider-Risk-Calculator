import { CalculatorState, ScenarioRow } from "@/types";
import { calculateLPPosition } from "./lp";
import { calculateAutoShortNotional, calculateHedge } from "./hedge";
import { calculateTotalPnL } from "./pnl";

export const DEFAULT_SCENARIOS = [-50, -30, -20, -10, 0, 10, 20, 30, 50];

/**
 * Generates an array of scenarios based on the given calculator state.
 */
export function generateScenarios(state: CalculatorState, priceChangesPercent: number[] = DEFAULT_SCENARIOS): ScenarioRow[] {
  return priceChangesPercent.map(changePct => {
    // Current price mapping to 0 change
    const targetPrice = state.entryPrice * (1 + changePct / 100);

    // 1. LP Calculation
    const lpResult = calculateLPPosition(
      state.totalCapital,
      state.volatileAllocation,
      state.entryPrice,
      targetPrice
    );

    // 2. Hedge Calculation
    let shortNotional = state.manualShortNotional;
    if (state.isAutoShortNotional) {
      shortNotional = calculateAutoShortNotional(
        lpResult.initialVolatileValue,
        state.hedgeRatio
      ).toNumber();
    }

    const hedgeResult = calculateHedge(
      shortNotional,
      state.shortEntryPrice,
      targetPrice,
      lpResult.currentVolatileValue
    );

    // 3. Total PnL Calculation
    const totalResult = calculateTotalPnL(
      lpResult,
      hedgeResult,
      state.lpFeeIncome,
      state.fundingCost,
      state.openShortCost,
      state.closeShortCost,
      state.rebalanceCost,
      state.totalCapital
    );

    return {
      priceChangePercent: changePct,
      targetPrice,
      assetValue: lpResult.currentVolatileValue.toNumber(),
      assetPnL: lpResult.assetPnL.toNumber(),
      shortPnL: hedgeResult.shortPnL.toNumber(),
      effectiveHedgeRatio: hedgeResult.effectiveHedgeRatio.mul(100).toNumber(), // Display as percentage
      fees: state.lpFeeIncome,
      costs: totalResult.tradingCosts.plus(totalResult.funding).toNumber(), // Display all costs together (funding positive means cost)
      netPnL: totalResult.netPnL.toNumber()
    };
  });
}
