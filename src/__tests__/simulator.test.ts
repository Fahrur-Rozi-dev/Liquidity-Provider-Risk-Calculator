import { runSimulation } from '../lib/simulation/simulator';
import { CalculatorState } from '../types';

describe('Simulator Engine', () => {

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
    lpFeeIncome: 0,
    fundingCost: 0,
    openShortCost: 0,
    closeShortCost: 0,
    rebalanceCost: 0,
    targetPrice: 100,

    // Phase 3 Base
    strategyMode: 'FIXED',
    targetHedgeRatio: 75,
    rebalanceLowerThreshold: 60,
    rebalanceUpperThreshold: 90,
    minimumRebalanceNotional: 0,
    rebalanceCooldownSteps: 0,
    rebalanceFeeRate: 0.05,
    slippageRate: 0.05,
    fundingRatePerStep: 0,
    simulationPath: []
  });

  test('Fixed Strategy - Short never changes', () => {
    const state = getBaseState();
    state.strategyMode = 'FIXED';
    state.simulationPath = [110, 120, 130, 90, 80, 70];

    const result = runSimulation(state);

    // Check initial short is calculated correctly
    expect(result.metrics.initialShort).toBeGreaterThan(0);

    // Number of rebalances should be 0 because it's fixed
    expect(result.metrics.numberOfRebalances).toBe(0);

    // Final short should match initial short
    expect(result.metrics.finalShort).toBe(result.metrics.initialShort);
  });

  test('Dynamic Strategy - Rebalances every step when exposure changes', () => {
    const state = getBaseState();
    state.strategyMode = 'DYNAMIC';
    state.simulationPath = [110, 120];

    const result = runSimulation(state);

    // Because CLMM exposure changes every tick, we expect rebalances
    expect(result.metrics.numberOfRebalances).toBeGreaterThan(0);

    // Target HR is 75%, it should attempt to maintain it perfectly
    // Final step effective hedge ratio should be exactly 75
    const lastSnap = result.snapshots[result.snapshots.length - 1];
    expect(lastSnap.targetHedgeRatio).toBeCloseTo(75, 1);
  });

  test('Threshold Strategy - Only rebalances outside bands', () => {
    const state = getBaseState();
    state.strategyMode = 'THRESHOLD';
    state.rebalanceLowerThreshold = 60;
    state.rebalanceUpperThreshold = 90;
    // Tiny price move shouldn't break 60-90 band
    state.simulationPath = [101, 102];

    const resultNoReb = runSimulation(state);
    expect(resultNoReb.metrics.numberOfRebalances).toBe(0);

    // Large price move should break the band
    state.simulationPath = [101, 150]; // 150 pushes it way out
    const resultReb = runSimulation(state);
    expect(resultReb.metrics.numberOfRebalances).toBeGreaterThan(0);
  });

  test('Out of Range - Above Range (Closes short completely)', () => {
    const state = getBaseState();
    state.strategyMode = 'DYNAMIC';
    state.simulationPath = [130]; // Upper is 120, so 130 is 0 SOL exposure

    const result = runSimulation(state);

    const lastSnap = result.snapshots[result.snapshots.length - 1];
    expect(lastSnap.amountSOL).toBe(0);
    expect(lastSnap.shortNotional).toBe(0); // dynamic should have closed it
    expect(result.events.length).toBe(1); // One event to close
  });

  test('Funding Directions', () => {
    const state = getBaseState();
    state.strategyMode = 'FIXED';
    state.simulationPath = [100, 100]; // 2 steps

    // Positive funding (short pays)
    state.fundingRatePerStep = 1; // 1%
    const resPositive = runSimulation(state);
    expect(resPositive.metrics.totalFundingPaid).toBeGreaterThan(0);

    // Negative funding (short receives)
    state.fundingRatePerStep = -1; // -1%
    const resNegative = runSimulation(state);
    expect(resNegative.metrics.totalFundingPaid).toBeLessThan(0);
  });

  test('Path Dependency / Round Trip', () => {
    const state1 = getBaseState();
    state1.strategyMode = 'DYNAMIC';
    state1.rebalanceFeeRate = 0.05;
    state1.simulationPath = [110, 100]; // Path A

    const state2 = getBaseState();
    state2.strategyMode = 'DYNAMIC';
    state2.rebalanceFeeRate = 0.05;
    state2.simulationPath = [90, 100]; // Path B

    const res1 = runSimulation(state1);
    const res2 = runSimulation(state2);

    // Both end at 100, so final LP and final Short Notional should be identical
    expect(res1.metrics.finalLpValue).toBeCloseTo(res2.metrics.finalLpValue, 5);
    expect(res1.metrics.finalShort).toBeCloseTo(res2.metrics.finalShort, 5);

    // However, because paths were different, total traded and therefore fees will differ slightly
    // or realized PnL will differ.
    expect(res1.metrics.totalNetPnL).not.toBe(res2.metrics.totalNetPnL);
  });
});
