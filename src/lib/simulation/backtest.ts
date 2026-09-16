import Decimal from "decimal.js";
import {
  CalculatorState,
  SimulationSnapshot,
  RebalanceEvent,
  BacktestMetrics,
  SimulationResult,
  PricePoint
} from "@/types";
import { calculateCLMM } from "../calculations/clmm";
import { calculateLPPosition } from "../calculations/lp";
import { ShortTrancheManager } from "../hedge/short";
import { determineHedgeAdjustment } from "../hedge/rebalance";
import { estimateFees } from "../calculations/fees";

export function runBacktest(state: CalculatorState, historicalData: PricePoint[]): SimulationResult {
  const warnings: string[] = [];

  if (historicalData.length === 0) {
    warnings.push("No historical data provided to backtest.");
    return { snapshots: [], events: [], metrics: getEmptyMetrics(state), warnings };
  }

  const snapshots: SimulationSnapshot[] = [];
  const events: RebalanceEvent[] = [];
  const shortManager = new ShortTrancheManager();

  let cumulativeRealizedShortPnL = new Decimal(0);
  let totalFundingPaid = new Decimal(0);
  let totalRebalanceFees = new Decimal(0);
  let totalSlippage = new Decimal(0);
  let totalGas = new Decimal(0);
  let totalNotionalTraded = new Decimal(0);
  let totalFeeIncome = new Decimal(0);

  let stepsSinceLastRebalance = Infinity;
  let maxAbsNetDelta = new Decimal(0);
  let maxPositiveNetDelta = new Decimal(0);
  let maxNegativeNetDelta = new Decimal(0);
  let maxHedgeError = new Decimal(0);
  let minHedgeRatio = Infinity;
  let maxHedgeRatio = -Infinity;
  let sumHedgeRatio = 0;
  let validHedgeRatioSteps = 0;

  let timeInRangeSteps = 0;
  let timeBelowRangeSteps = 0;
  let timeAboveRangeSteps = 0;
  let numberOfRangeEntries = 0;
  let lastRangeStatus = 'IN_RANGE';

  let minILPercent = 0;
  let maxILPercent = -Infinity;
  let sumILPercent = 0;

  // Track Peak Equity for Drawdown
  let peakEquity = new Decimal(state.totalCapital);
  let maxDrawdownUSD = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);

  let positivePnLSteps = 0;

  const entryPrice = state.entryPrice;

  // Initial LP Setup
  let initialSolExposure = new Decimal(0);
  // let _initialLpValue = new Decimal(0);
  let initialHodlValue = new Decimal(0);
  // let _initialSolAmount = new Decimal(0);
  // let _initialUsdcAmount = new Decimal(0);
  let initialIlUsd = new Decimal(0);

  if (state.modelType === 'clmm') {
    const initCLMM = calculateCLMM(state.totalCapital, entryPrice, state.lowerPrice, state.upperPrice, entryPrice);
    initialSolExposure = initCLMM.lpDelta || initCLMM.currentVolatileValue;
    _initialLpValue = initCLMM.lpValue;
    initialHodlValue = initCLMM.hodlValue || initCLMM.lpValue;
    _initialSolAmount = initCLMM.volatileQuantity;
    _initialUsdcAmount = initCLMM.amountUSDC || new Decimal(0);
    initialIlUsd = initCLMM.ilUSD || new Decimal(0);
    lastRangeStatus = initCLMM.rangeStatus || 'IN_RANGE';
  } else {
    const initSimp = calculateLPPosition(state.totalCapital, state.volatileAllocation, entryPrice, entryPrice);
    initialSolExposure = initSimp.currentVolatileValue;
    _initialLpValue = initSimp.lpValue;
    initialHodlValue = initSimp.lpValue;
    _initialSolAmount = initSimp.volatileQuantity;
    _initialUsdcAmount = initSimp.initialStableValue;
  }

  // Initial Hedge
  const initialShortTarget = initialSolExposure.mul(state.hedgeRatio).div(100);
  if (initialShortTarget.gt(0)) {
    shortManager.addTranche(initialShortTarget, new Decimal(entryPrice), 0);
    totalNotionalTraded = totalNotionalTraded.plus(initialShortTarget);

    const initFees = initialShortTarget.mul(state.rebalanceFeeRate).div(100);
    const initSlippage = initialShortTarget.mul(state.slippageRate).div(100);
    const gas = new Decimal(state.gasCostPerRebalance || 0);

    totalRebalanceFees = totalRebalanceFees.plus(initFees);
    totalSlippage = totalSlippage.plus(initSlippage);
    totalGas = totalGas.plus(gas);
    stepsSinceLastRebalance = 0;
  }

  // Iterating History
  const pricesForVolatility: number[] = [];

  historicalData.forEach((point, stepIndex) => {
    const currentPrice = new Decimal(point.price);
    stepsSinceLastRebalance++;
    pricesForVolatility.push(point.price);

    // 1. Calculate LP
    let lpResult;
    if (state.modelType === 'clmm') {
      lpResult = calculateCLMM(state.totalCapital, entryPrice, state.lowerPrice, state.upperPrice, currentPrice);

      // Range Stats
      if (lpResult.rangeStatus === 'IN_RANGE') timeInRangeSteps++;
      else if (lpResult.rangeStatus === 'BELOW_RANGE') timeBelowRangeSteps++;
      else timeAboveRangeSteps++;

      if (lastRangeStatus !== 'IN_RANGE' && lpResult.rangeStatus === 'IN_RANGE') {
        numberOfRangeEntries++;
      }
      lastRangeStatus = lpResult.rangeStatus || 'IN_RANGE';

      // IL Stats
      const ilP = lpResult.ilPercent?.toNumber() || 0;
      minILPercent = Math.min(minILPercent, ilP);
      maxILPercent = Math.max(maxILPercent, ilP);
      sumILPercent += ilP;

    } else {
      lpResult = calculateLPPosition(state.totalCapital, state.volatileAllocation, entryPrice, currentPrice);
    }

    const lpSolExposure = (state.modelType === 'clmm') ? (lpResult.lpDelta || new Decimal(0)) : lpResult.currentVolatileValue;
    const currentShortNotional = shortManager.getTotalNotional();
    const effectiveHedgeRatio = lpSolExposure.isZero() ? null : currentShortNotional.div(lpSolExposure).mul(100);

    if (effectiveHedgeRatio !== null) {
      const hrNum = effectiveHedgeRatio.toNumber();
      minHedgeRatio = Math.min(minHedgeRatio, hrNum);
      maxHedgeRatio = Math.max(maxHedgeRatio, hrNum);
      sumHedgeRatio += hrNum;
      validHedgeRatioSteps++;
    }

    // 2. Income & Funding
    let feeIncomeThisStep = new Decimal(0);
    if (state.feeModelType === 'ESTIMATED' && point.volume) {
      feeIncomeThisStep = estimateFees(point.volume, state.poolFeeRate, state.estimatedLPShare, lpResult.rangeStatus || 'IN_RANGE');
    } else if (state.feeModelType === 'MANUAL') {
      // Flat fee divided across steps
      feeIncomeThisStep = new Decimal(state.lpFeeIncome).div(historicalData.length);
    }
    totalFeeIncome = totalFeeIncome.plus(feeIncomeThisStep);

    let fundingCostThisStep = new Decimal(0);
    if (point.fundingRate !== undefined) {
      fundingCostThisStep = currentShortNotional.mul(point.fundingRate).div(100);
    } else {
      fundingCostThisStep = currentShortNotional.mul(state.fundingRatePerStep).div(100);
    }
    totalFundingPaid = totalFundingPaid.plus(fundingCostThisStep);

    // 3. Rebalance
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
    let gasCostThisStep = new Decimal(0);
    let realizedPnLFromClose = new Decimal(0);
    let rebalanceTriggered = false;

    if (!adjustment.isZero()) {
      rebalanceTriggered = true;
      const absAdj = adjustment.abs();
      totalNotionalTraded = totalNotionalTraded.plus(absAdj);

      rebalanceCostThisStep = absAdj.mul(state.rebalanceFeeRate).div(100);
      slippageCostThisStep = absAdj.mul(state.slippageRate).div(100);
      gasCostThisStep = new Decimal(state.gasCostPerRebalance || 0);

      totalRebalanceFees = totalRebalanceFees.plus(rebalanceCostThisStep);
      totalSlippage = totalSlippage.plus(slippageCostThisStep);
      totalGas = totalGas.plus(gasCostThisStep);

      const targetShort = currentShortNotional.plus(adjustment);

      if (adjustment.gt(0)) {
        shortManager.addTranche(adjustment, currentPrice, stepIndex);
      } else {
        realizedPnLFromClose = shortManager.reduceTranche(adjustment.abs(), currentPrice);
        cumulativeRealizedShortPnL = cumulativeRealizedShortPnL.plus(realizedPnLFromClose);
      }
      stepsSinceLastRebalance = 0;

      events.push({
        timestamp: point.timestamp,
        price: currentPrice,
        previousShortNotional: currentShortNotional,
        targetShortNotional: targetShort,
        hedgeAdjustment: adjustment,
        previousHedgeRatio: effectiveHedgeRatio || new Decimal(0),
        newHedgeRatio: lpSolExposure.isZero() ? new Decimal(0) : targetShort.div(lpSolExposure).mul(100),
        tradingCost: rebalanceCostThisStep,
        slippageCost: slippageCostThisStep,
        gasCost: gasCostThisStep,
        realizedPnL: realizedPnLFromClose
      });
    }

    // 4. Update short state
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

    // 5. Combined PnL & Equity
    const combinedPnL = lpPnL.plus(totalShortPnL);

    const cumulativePnL = combinedPnL
      .plus(totalFeeIncome)
      .minus(totalFundingPaid)
      .minus(totalRebalanceFees)
      .minus(totalSlippage)
      .minus(totalGas);

    const equity = new Decimal(state.totalCapital).plus(cumulativePnL);

    if (equity.gt(peakEquity)) {
      peakEquity = equity;
    }

    const drawdownUSD = peakEquity.minus(equity);
    const drawdownPercent = drawdownUSD.div(peakEquity).mul(100);

    maxDrawdownUSD = Decimal.max(maxDrawdownUSD, drawdownUSD);
    maxDrawdownPercent = Decimal.max(maxDrawdownPercent, drawdownPercent);

    if (cumulativePnL.gt(0)) {
      positivePnLSteps++;
    }

    snapshots.push({
      stepIndex,
      timestamp: point.timestamp,
      price: point.price,

      amountSOL: lpResult.volatileQuantity.toNumber(),
      amountUSDC: (lpResult.amountUSDC || lpResult.initialStableValue).toNumber(),
      lpValue: lpResult.lpValue.toNumber(),
      lpPnL: lpPnL.toNumber(),
      hodlValue: (lpResult.hodlValue || initialHodlValue).toNumber(),
      hodlPnL: (lpResult.hodlValue || initialHodlValue).minus(state.totalCapital).toNumber(),
      ilUSD: (lpResult.ilUSD || new Decimal(0)).toNumber(),
      ilPercent: (lpResult.ilPercent || new Decimal(0)).toNumber(),

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
      gasCost: gasCostThisStep.toNumber(),

      fundingCost: fundingCostThisStep.toNumber(),
      feeIncome: feeIncomeThisStep.toNumber(),

      combinedPnL: combinedPnL.toNumber(),
      cumulativePnL: cumulativePnL.toNumber(),
      equity: equity.toNumber()
    });
  });

  const lastSnap = snapshots[snapshots.length - 1];
  const finalEquity = lastSnap.equity;
  const totalReturnPercent = (finalEquity / state.totalCapital - 1) * 100;

  // Annualized calc
  let annualizedReturnPercent = null;
  const firstT = historicalData[0].timestamp;
  const lastT = historicalData[historicalData.length - 1].timestamp;
  const durationMs = lastT - firstT;
  if (durationMs > 0) {
    const years = durationMs / (1000 * 60 * 60 * 24 * 365.25);
    annualizedReturnPercent = (Math.pow(finalEquity / state.totalCapital, 1 / years) - 1) * 100;
  }

  // Volatility calc
  let volatilityAnnualized = null;
  if (pricesForVolatility.length > 1) {
    const returns = [];
    for (let i = 1; i < pricesForVolatility.length; i++) {
      returns.push(Math.log(pricesForVolatility[i] / pricesForVolatility[i-1]));
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (durationMs > 0) {
      const avgIntervalMs = durationMs / (pricesForVolatility.length - 1);
      const periodsPerYear = (1000 * 60 * 60 * 24 * 365.25) / avgIntervalMs;
      volatilityAnnualized = stdDev * Math.sqrt(periodsPerYear) * 100;
    }
  }

  let sharpeRatio = null;
  let sortinoRatio = null;
  if (volatilityAnnualized && volatilityAnnualized > 0 && annualizedReturnPercent !== null) {
    sharpeRatio = annualizedReturnPercent / volatilityAnnualized;

    const returns = [];
    for (let i = 1; i < snapshots.length; i++) {
      returns.push((snapshots[i].equity - snapshots[i-1].equity) / snapshots[i-1].equity);
    }
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length > 0) {
      const downsideVariance = downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;
      const avgIntervalMs = durationMs / (pricesForVolatility.length - 1);
      const periodsPerYear = (1000 * 60 * 60 * 24 * 365.25) / avgIntervalMs;
      const downsideStdDevAnn = Math.sqrt(downsideVariance) * Math.sqrt(periodsPerYear) * 100;
      if (downsideStdDevAnn > 0) {
        sortinoRatio = annualizedReturnPercent / downsideStdDevAnn;
      }
    }
  }

  const metrics: BacktestMetrics = {
    initialCapital: state.totalCapital,

    finalEquity,
    totalReturnPercent,
    annualizedReturnPercent,

    lpPnL: lastSnap.lpPnL,
    shortPnL: lastSnap.shortPnL,
    feeIncome: totalFeeIncome.toNumber(),
    fundingPaid: totalFundingPaid.toNumber(),
    rebalanceFees: totalRebalanceFees.toNumber(),
    slippage: totalSlippage.toNumber(),
    gasCosts: totalGas.toNumber(),
    totalHedgeTradingCosts: totalRebalanceFees.plus(totalSlippage).plus(totalFundingPaid).plus(totalGas).toNumber(),
    combinedPnL: lastSnap.combinedPnL,

    maxDrawdownUSD: maxDrawdownUSD.toNumber(),
    maxDrawdownPercent: maxDrawdownPercent.toNumber(),
    volatilityAnnualized,
    sharpeRatio,
    sortinoRatio,
    winRatePercent: (positivePnLSteps / historicalData.length) * 100,

    timeInRangePercent: (timeInRangeSteps / historicalData.length) * 100,
    timeBelowRangePercent: (timeBelowRangeSteps / historicalData.length) * 100,
    timeAboveRangePercent: (timeAboveRangeSteps / historicalData.length) * 100,

    avgHedgeRatio: validHedgeRatioSteps > 0 ? sumHedgeRatio / validHedgeRatioSteps : 0,
    minHedgeRatio: minHedgeRatio === Infinity ? 0 : minHedgeRatio,
    maxHedgeRatio: maxHedgeRatio === -Infinity ? 0 : maxHedgeRatio,
    maxAbsNetDelta: maxAbsNetDelta.toNumber(),
    numberOfRangeEntries,

    initialIL: initialIlUsd.toNumber(),
    minILPercent,
    maxILPercent,
    finalILPercent: lastSnap.ilPercent,
    avgILPercent: sumILPercent / historicalData.length,

    numberOfRebalances: events.length,
    totalHedgeNotionalTraded: totalNotionalTraded.toNumber(),
    turnover: totalNotionalTraded.toNumber() / state.totalCapital
  };

  return { snapshots, events, metrics, warnings };
}

function getEmptyMetrics(state: CalculatorState): BacktestMetrics {
  return {
    initialCapital: state.totalCapital, finalEquity: state.totalCapital, totalReturnPercent: 0, annualizedReturnPercent: null,
    lpPnL: 0, shortPnL: 0, feeIncome: 0, fundingPaid: 0, rebalanceFees: 0, slippage: 0, gasCosts: 0, totalHedgeTradingCosts: 0, combinedPnL: 0,
    maxDrawdownUSD: 0, maxDrawdownPercent: 0, volatilityAnnualized: null, sharpeRatio: null, sortinoRatio: null, winRatePercent: 0,
    timeInRangePercent: 0, timeBelowRangePercent: 0, timeAboveRangePercent: 0, avgHedgeRatio: 0, minHedgeRatio: 0, maxHedgeRatio: 0, maxAbsNetDelta: 0, numberOfRangeEntries: 0,
    initialIL: 0, minILPercent: 0, maxILPercent: 0, finalILPercent: 0, avgILPercent: 0, numberOfRebalances: 0, totalHedgeNotionalTraded: 0, turnover: 0
  };
}
