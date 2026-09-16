import { CalculatorState, ScenarioRow } from "@/types";
import { calculateLPPosition } from "./lp";
import { calculateCLMM } from "./clmm";
import { calculateAutoShortNotional, calculateHedge } from "./hedge";
import { calculateTotalPnL } from "./pnl";

// Default scenarios mapped to price changes in %
export const DEFAULT_SCENARIOS = [-75, -50, -30, -20, -10, -5, 0, 5, 10, 20, 30, 50, 75, 100];

/**
 * Generates an array of scenarios based on the given calculator state.
 */
export function generateScenarios(state: CalculatorState, priceChangesPercent: number[] = DEFAULT_SCENARIOS): ScenarioRow[] {
  return priceChangesPercent.map(changePct => {
    // Current price mapping to 0 change
    const targetPrice = state.entryPrice * (1 + changePct / 100);

    // 1. LP Calculation based on model type
    let lpResult;
    if (state.modelType === 'clmm') {
      lpResult = calculateCLMM(
        state.totalCapital,
        state.entryPrice,
        state.lowerPrice,
        state.upperPrice,
        targetPrice
      );
    } else {
      lpResult = calculateLPPosition(
        state.totalCapital,
        state.volatileAllocation,
        state.entryPrice,
        targetPrice
      );
    }

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
      0,
      0,
      0,
      0,
      state.totalCapital
    );

    // netDelta calculation for CLMM
    const netDelta = (lpResult.lpDelta ? lpResult.lpDelta.toNumber() : lpResult.currentVolatileValue.toNumber()) - hedgeResult.shortNotional.toNumber();

    return {
      priceChangePercent: changePct,
      targetPrice,
      assetValue: lpResult.currentVolatileValue.toNumber(),
      assetPnL: lpResult.assetPnL.toNumber(),
      shortPnL: hedgeResult.shortPnL.toNumber(),
      effectiveHedgeRatio: hedgeResult.effectiveHedgeRatio.mul(100).toNumber(), // Display as percentage
      fees: state.lpFeeIncome,
      costs: totalResult.tradingCosts.plus(totalResult.funding).toNumber(),
      netPnL: totalResult.netPnL.toNumber(),

      // CLMM fields (can be undefined if simplified, which is fine)
      amountSOL: lpResult.volatileQuantity.toNumber(),
      amountUSDC: lpResult.amountUSDC?.toNumber(),
      lpValue: lpResult.lpValue.toNumber(),
      hodlValue: lpResult.hodlValue?.toNumber(),
      hodlPnL: totalResult.hodlPnL?.toNumber(),
      ilUSD: lpResult.ilUSD?.toNumber(),
      ilPercent: lpResult.ilPercent?.toNumber(),
      lpDelta: lpResult.lpDelta?.toNumber(),
      netDelta: netDelta,
      rangeStatus: lpResult.rangeStatus,
      totalPnLAfterCosts: totalResult.netPnL.toNumber(), // In phase 2 net PnL is the bottom line
    };
  });
}
