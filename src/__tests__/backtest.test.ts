import { runBacktest } from '../lib/simulation/backtest';
import { CalculatorState, PricePoint } from '../types';

describe('Historical Backtest Engine', () => {
  const getBaseState = (): CalculatorState => ({
    modelType: 'clmm',
    pairName: "SOL/USDC",
    totalCapital: 200,
    volatileAllocation: 50,
    stableAllocation: 50,
    entryPrice: 100,
    lowerPrice: 80,
    upperPrice: 120,
    hedgeRatio: 75,
    shortEntryPrice: 100,
    isAutoShortNotional: true,
    manualShortNotional: 75,
    targetPrice: 100,
    strategyMode: 'DYNAMIC',
    targetHedgeRatio: 75,
    rebalanceLowerThreshold: 60,
    rebalanceUpperThreshold: 90,
    minimumRebalanceNotional: 0,
    rebalanceCooldownSteps: 0,
    rebalanceFeeRate: 0.05,
    slippageRate: 0.05,
    gasCostPerRebalance: 0,
    feeModelType: 'MANUAL',
    lpFeeIncome: 0,
    poolFeeRate: 0,
    estimatedLPShare: 0,
    fundingRatePerStep: 0,
    simulationPath: [], historicalData: [],
  });

  const generateData = (prices: number[]): PricePoint[] => {
    return prices.map((price, i) => ({
      timestamp: 1600000000000 + i * 3600000, // hourly
      price
    }));
  };

  test('Test 1: Constant price', () => {
    const state = getBaseState();
    // Use 0 initial fee costs to ensure flat 200 return
    state.rebalanceFeeRate = 0;
    state.slippageRate = 0;
    const data = generateData([100, 100, 100]);
    const res = runBacktest(state, data);

    expect(res.metrics.lpPnL).toBeCloseTo(0);
    expect(res.metrics.shortPnL).toBeCloseTo(0);
    expect(res.metrics.numberOfRebalances).toBe(0);
    expect(res.metrics.finalEquity).toBeCloseTo(200);
  });

  test('Test 2 & 3: Uptrend / Downtrend Dynamic vs Fixed Hedge Rebalancing', () => {
    const state = getBaseState();
    const uptrend = generateData([100, 110, 120, 130]);

    state.strategyMode = 'DYNAMIC';
    const dynRes = runBacktest(state, uptrend);
    // As SOL price rises, amountSOL drops. Dynamic short should reduce to match.
    expect(dynRes.metrics.numberOfRebalances).toBeGreaterThan(0);

    state.strategyMode = 'FIXED';
    const fixedRes = runBacktest(state, uptrend);
    expect(fixedRes.metrics.numberOfRebalances).toBe(0);
  });

  test('Test 4: Range Breakout', () => {
    const state = getBaseState();
    const data = generateData([100, 130]); // Upper is 120
    const res = runBacktest(state, data);

    const lastSnap = res.snapshots[1];
    expect(lastSnap.amountSOL).toBe(0); // 100% USDC above 120
    expect(lastSnap.amountUSDC).toBeGreaterThan(0);
  });

  test('Test 5: Cumulative PnL Reconciliation', () => {
    const state = getBaseState();
    state.rebalanceFeeRate = 0.1;
    state.slippageRate = 0.1;
    state.fundingRatePerStep = 0.05;
    state.lpFeeIncome = 5;

    const data = generateData([100, 110, 120, 110, 100]);
    const res = runBacktest(state, data);

    const m = res.metrics;
    const reconciledEquity = m.initialCapital + m.lpPnL + m.shortPnL + m.feeIncome - m.fundingPaid - m.rebalanceFees - m.slippage - m.gasCosts;

    expect(m.finalEquity).toBeCloseTo(reconciledEquity, 5);
  });

  test('Drawdown Calculation', () => {
    const state = getBaseState();
    // 100 -> 90 -> 80 creates a drop in total equity.
    const data = generateData([100, 90, 80, 100]);
    const res = runBacktest(state, data);

    expect(res.metrics.maxDrawdownUSD).toBeGreaterThan(0);
    expect(res.metrics.maxDrawdownPercent).toBeGreaterThan(0);
  });
});
