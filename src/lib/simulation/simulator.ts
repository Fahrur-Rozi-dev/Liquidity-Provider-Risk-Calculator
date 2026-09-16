import Decimal from "decimal.js";
import {
  CalculatorState,
  SimulationSnapshot,
  RebalanceEvent,
  SimulationMetrics,
  SimulationResult
} from "@/types";
import { calculateCLMM } from "../calculations/clmm";
import { calculateLPPosition } from "../calculations/lp";
import { ShortTrancheManager } from "../hedge/short";
import { determineHedgeAdjustment } from "../hedge/rebalance";

export function runSimulation(state: CalculatorState): SimulationResult {
  const snapshots: SimulationSnapshot[] = [];
  const events: RebalanceEvent[] = [];

  const shortManager = new ShortTrancheManager();

  let cumulativeRealizedShortPnL = new Decimal(0);
  let totalFundingPaid = new Decimal(0);
  let totalRebalanceFees = new Decimal(0);
  let totalSlippage = new Decimal(0);
  let totalNotionalTraded = new Decimal(0);

  let stepsSinceLastRebalance = Infinity;
  let maxAbsNetDelta = new Decimal(0);
  let maxPositiveNetDelta = new Decimal(0);
  let maxNegativeNetDelta = new Decimal(0);
  let maxHedgeError = new Decimal(0);
  let minHedgeRatio = Infinity;
  let maxHedgeRatio = -Infinity;
  let sumHedgeRatio = 0;
  let validHedgeRatioSteps = 0;

  // Track initial LP state to build first hedge
  let initialSolExposure = new Decimal(0);
  let initialLpValue = new Decimal(0);
  let initialIlUsd = new Decimal(0);
  let initialHodlValue = new Decimal(0);

  // Initial Setup at entryPrice (step 0 effectively)
  if (state.modelType === 'clmm') {
    const initCLMM = calculateCLMM(state.totalCapital, state.entryPrice, state.lowerPrice, state.upperPrice, state.entryPrice);
    initialSolExposure = initCLMM.lpDelta || initCLMM.currentVolatileValue;
    initialLpValue = initCLMM.lpValue;
    initialIlUsd = initCLMM.ilUSD || new Decimal(0);
    initialHodlValue = initCLMM.hodlValue || initCLMM.lpValue;
  } else {
    const initSimp = calculateLPPosition(state.totalCapital, state.volatileAllocation, state.entryPrice, state.entryPrice);
    initialSolExposure = initSimp.currentVolatileValue;
    initialLpValue = initSimp.lpValue;
  }

  const initialShortTarget = initialSolExposure.mul(state.hedgeRatio).div(100);
  if (initialShortTarget.gt(0)) {
    shortManager.addTranche(initialShortTarget, new Decimal(state.entryPrice), 0);
    totalNotionalTraded = totalNotionalTraded.plus(initialShortTarget);

    // Initial cost (opening)
    const initFees = initialShortTarget.mul(state.rebalanceFeeRate).div(100);
    const initSlippage = initialShortTarget.mul(state.slippageRate).div(100);
    totalRebalanceFees = totalRebalanceFees.plus(initFees);
    totalSlippage = totalSlippage.plus(initSlippage);
    stepsSinceLastRebalance = 0;
  }

  // Iterate over price path
  state.simulationPath.forEach((priceNum, stepIndex) => {
    const currentPrice = new Decimal(priceNum);
    stepsSinceLastRebalance++;

    // 1. Calculate LP
    let lpResult;
    if (state.modelType === 'clmm') {
      lpResult = calculateCLMM(state.totalCapital, state.entryPrice, state.lowerPrice, state.upperPrice, currentPrice);
    } else {
      lpResult = calculateLPPosition(state.totalCapital, state.volatileAllocation, state.entryPrice, currentPrice);
    }

    const lpSolExposure = (state.modelType === 'clmm') ? (lpResult.lpDelta || new Decimal(0)) : lpResult.currentVolatileValue;
    const currentShortNotional = shortManager.getTotalNotional();
    const effectiveHedgeRatio = lpSolExposure.isZero() ? null : currentShortNotional.div(lpSolExposure).mul(100);

    // Track min/max/avg HR
    if (effectiveHedgeRatio !== null) {
      const hrNum = effectiveHedgeRatio.toNumber();
      minHedgeRatio = Math.min(minHedgeRatio, hrNum);
      maxHedgeRatio = Math.max(maxHedgeRatio, hrNum);
      sumHedgeRatio += hrNum;
      validHedgeRatioSteps++;
    }

    // 2. Funding calculation (charged every step for active tranches)
    const fundingCostThisStep = currentShortNotional.mul(state.fundingRatePerStep).div(100);
    totalFundingPaid = totalFundingPaid.plus(fundingCostThisStep);

    // 3. Rebalance Check
    const adjustment = determineHedgeAdjustment({
      strategyMode: state.strategyMode,
      currentShortNotional,
      lpSolExposureUSD: lpSolExposure,
      targetHedgeRatio: state.targetHedgeRatio,
      rebalanceLowerThreshold: state.rebalanceLowerThreshold,
      rebalanceUpperThreshold: state.rebalanceUpperThreshold,
      minimumRebalanceNotional: state.minimumRebalanceNotional,
      stepsSinceLastRebalance,
      rebalanceCooldownSteps: state.rebalanceCooldownSteps
    });

    let rebalanceCostThisStep = new Decimal(0);
    let slippageCostThisStep = new Decimal(0);
    let realizedPnLFromClose = new Decimal(0);
    let rebalanceTriggered = false;

    if (!adjustment.isZero()) {
      rebalanceTriggered = true;
      const absAdj = adjustment.abs();
      totalNotionalTraded = totalNotionalTraded.plus(absAdj);

      rebalanceCostThisStep = absAdj.mul(state.rebalanceFeeRate).div(100);
      slippageCostThisStep = absAdj.mul(state.slippageRate).div(100);

      totalRebalanceFees = totalRebalanceFees.plus(rebalanceCostThisStep);
      totalSlippage = totalSlippage.plus(slippageCostThisStep);

      const targetShort = currentShortNotional.plus(adjustment);

      if (adjustment.gt(0)) {
        // Increase short
        shortManager.addTranche(adjustment, currentPrice, stepIndex + 1); // +1 because we're inside step
      } else {
        // Decrease short
        realizedPnLFromClose = shortManager.reduceTranche(adjustment.abs(), currentPrice);
        cumulativeRealizedShortPnL = cumulativeRealizedShortPnL.plus(realizedPnLFromClose);
      }
      stepsSinceLastRebalance = 0;

      events.push({
        timestamp: stepIndex + 1,
        price: currentPrice,
        previousShortNotional: currentShortNotional,
        targetShortNotional: targetShort,
        hedgeAdjustment: adjustment,
        previousHedgeRatio: effectiveHedgeRatio || new Decimal(0),
        newHedgeRatio: lpSolExposure.isZero() ? new Decimal(0) : targetShort.div(lpSolExposure).mul(100),
        tradingCost: rebalanceCostThisStep,
        slippageCost: slippageCostThisStep,
        realizedPnL: realizedPnLFromClose
      });
    }

    // 4. Update short state & metrics
    const newShortNotional = shortManager.getTotalNotional();
    const unrealizedShortPnL = shortManager.getUnrealizedPnL(currentPrice);
    const totalShortPnL = cumulativeRealizedShortPnL.plus(unrealizedShortPnL);
    const lpPnL = lpResult.assetPnL;

    // Net Delta
    const netDeltaUSD = lpSolExposure.minus(newShortNotional);
    const netDeltaPercent = lpResult.lpValue.isZero() ? new Decimal(0) : netDeltaUSD.div(lpResult.lpValue).mul(100);

    maxAbsNetDelta = Decimal.max(maxAbsNetDelta, netDeltaUSD.abs());
    maxPositiveNetDelta = Decimal.max(maxPositiveNetDelta, netDeltaUSD);
    maxNegativeNetDelta = Decimal.min(maxNegativeNetDelta, netDeltaUSD);

    const targetNotional = lpSolExposure.mul(state.targetHedgeRatio).div(100);
    const hedgeErrorUSD = newShortNotional.minus(targetNotional);
    maxHedgeError = Decimal.max(maxHedgeError, hedgeErrorUSD.abs());

    // 5. Combined PnL
    const combinedPnL = lpPnL.plus(totalShortPnL); // Gross trading PnL

    // Cumulative PnL accounting for costs
    const stepLpFees = new Decimal(state.lpFeeIncome).div(state.simulationPath.length); // Distribute flat fee across steps for chart aesthetic
    const cumulativePnL = combinedPnL
      .plus(stepLpFees.mul(stepIndex + 1))
      .minus(totalFundingPaid)
      .minus(totalRebalanceFees)
      .minus(totalSlippage);

    snapshots.push({
      stepIndex: stepIndex + 1,
      price: priceNum,

      amountSOL: lpResult.volatileQuantity.toNumber(),
      amountUSDC: (lpResult.amountUSDC || lpResult.initialStableValue).toNumber(),
      lpValue: lpResult.lpValue.toNumber(),
      lpPnL: lpPnL.toNumber(),
      hodlValue: (lpResult.hodlValue || new Decimal(0)).toNumber(),
      ilUSD: (lpResult.ilUSD || new Decimal(0)).toNumber(),

      shortNotional: newShortNotional.toNumber(),
      shortPnL: totalShortPnL.toNumber(),
      effectiveHedgeRatio: effectiveHedgeRatio ? effectiveHedgeRatio.toNumber() : null,
      targetHedgeRatio: state.targetHedgeRatio,
      netDeltaUSD: netDeltaUSD.toNumber(),
      netDeltaPercent: netDeltaPercent.toNumber(),

      rebalanceTriggered,
      hedgeAdjustment: adjustment.toNumber(),
      rebalanceCost: rebalanceCostThisStep.toNumber(),
      slippageCost: slippageCostThisStep.toNumber(),

      fundingCost: fundingCostThisStep.toNumber(),

      combinedPnL: combinedPnL.toNumber(),
      cumulativePnL: cumulativePnL.toNumber()
    });
  });

  const lastSnap = snapshots[snapshots.length - 1];

  const metrics: SimulationMetrics = {
    initialCapital: state.totalCapital,
    finalLpValue: lastSnap ? lastSnap.lpValue : initialLpValue.toNumber(),
    lpPnL: lastSnap ? lastSnap.lpPnL : 0,
    hodlValue: lastSnap ? lastSnap.hodlValue : initialHodlValue.toNumber(),
    ilUSD: lastSnap ? lastSnap.ilUSD : initialIlUsd.toNumber(),

    initialShort: initialShortTarget.toNumber(),
    finalShort: lastSnap ? lastSnap.shortNotional : initialShortTarget.toNumber(),
    totalShortPnL: lastSnap ? lastSnap.shortPnL : 0,
    realizedShortPnL: cumulativeRealizedShortPnL.toNumber(),
    unrealizedShortPnL: lastSnap ? (lastSnap.shortPnL - cumulativeRealizedShortPnL.toNumber()) : 0,

    avgHedgeRatio: validHedgeRatioSteps > 0 ? sumHedgeRatio / validHedgeRatioSteps : 0,
    minHedgeRatio: minHedgeRatio === Infinity ? 0 : minHedgeRatio,
    maxHedgeRatio: maxHedgeRatio === -Infinity ? 0 : maxHedgeRatio,

    totalFundingPaid: totalFundingPaid.toNumber(),
    totalRebalanceFees: totalRebalanceFees.toNumber(),
    totalSlippage: totalSlippage.toNumber(),
    totalHedgeTradingCosts: totalRebalanceFees.plus(totalSlippage).plus(totalFundingPaid).toNumber(),

    maxAbsNetDelta: maxAbsNetDelta.toNumber(),
    maxPositiveNetDelta: maxPositiveNetDelta.toNumber(),
    maxNegativeNetDelta: maxNegativeNetDelta.toNumber(),
    maxHedgeError: maxHedgeError.toNumber(),
    numberOfRebalances: events.length,
    totalNotionalTraded: totalNotionalTraded.toNumber(),

    combinedPnL: lastSnap ? lastSnap.combinedPnL : 0,
    totalNetPnL: lastSnap ? lastSnap.cumulativePnL : 0
  };

  return {
    snapshots,
    events,
    metrics
  };
}
