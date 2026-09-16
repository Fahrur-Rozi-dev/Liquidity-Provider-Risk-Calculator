import { calculateLPPosition } from '../lib/calculations/lp';
import { calculateHedge } from '../lib/calculations/hedge';
import { calculateTotalPnL } from '../lib/calculations/pnl';

describe('Calculations Engine', () => {
  // Test Case 1: Price unchanged
  test('1. Price unchanged (No hedge, No fees, No costs)', () => {
    const lp = calculateLPPosition(200, 50, 100, 100);
    expect(lp.initialVolatileValue.toNumber()).toBe(100);
    expect(lp.currentVolatileValue.toNumber()).toBe(100);
    expect(lp.assetPnL.toNumber()).toBe(0);

    const hedge = calculateHedge(0, 100, 100, lp.currentVolatileValue);
    expect(hedge.shortPnL.toNumber()).toBe(0);

    const total = calculateTotalPnL(lp, hedge, 0, 0, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(0);
  });

  // Test Case 2: Asset -50%
  test('2. Asset -50% (No hedge)', () => {
    const lp = calculateLPPosition(200, 50, 100, 50);
    expect(lp.assetPnL.toNumber()).toBe(-50); // 100 to 50
    expect(lp.currentVolatileValue.toNumber()).toBe(50);
  });

  // Test Case 3: Asset +50%
  test('3. Asset +50% (No hedge)', () => {
    const lp = calculateLPPosition(200, 50, 100, 150);
    expect(lp.assetPnL.toNumber()).toBe(50);
    expect(lp.currentVolatileValue.toNumber()).toBe(150);
  });

  // Test Case 4: 0% hedge
  test('4. 0% hedge', () => {
    const lp = calculateLPPosition(200, 50, 100, 80);
    const hedge = calculateHedge(0, 100, 80, lp.currentVolatileValue);

    expect(hedge.shortNotional.toNumber()).toBe(0);
    expect(hedge.shortPnL.toNumber()).toBe(0);
    expect(hedge.effectiveHedgeRatio.toNumber()).toBe(0);
  });
});

  // Test Case 5: 50% hedge
  test('5. 50% hedge on price drop', () => {
    // LP $200, 50% vol = $100. 50% hedge = $50 short
    const lp = calculateLPPosition(200, 50, 100, 80);
    const hedge = calculateHedge(50, 100, 80, lp.currentVolatileValue);

    // Short PnL: 50 * ((100-80)/100) = 50 * 0.2 = $10
    expect(hedge.shortPnL.toNumber()).toBe(10);

    // Total PnL: Asset PnL (-$20) + Short PnL ($10) = -$10
    const total = calculateTotalPnL(lp, hedge, 0, 0, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(-10);
  });

  // Test Case 6: 75% hedge
  test('6. 75% hedge on price drop', () => {
    const lp = calculateLPPosition(200, 50, 100, 80);
    const hedge = calculateHedge(75, 100, 80, lp.currentVolatileValue);

    // Short PnL: 75 * ((100-80)/100) = 75 * 0.2 = $15
    expect(hedge.shortPnL.toNumber()).toBe(15);

    // Asset PnL is -$20
    const total = calculateTotalPnL(lp, hedge, 0, 0, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(-5);
  });

  // Test Case 7: 100% hedge
  test('7. 100% hedge on price drop', () => {
    const lp = calculateLPPosition(200, 50, 100, 80);
    const hedge = calculateHedge(100, 100, 80, lp.currentVolatileValue);

    // Short PnL: 100 * ((100-80)/100) = $20
    expect(hedge.shortPnL.toNumber()).toBe(20);

    // Total PnL should be 0 because 100% hedged
    const total = calculateTotalPnL(lp, hedge, 0, 0, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(0);
  });

  // Test Case 8: Short profit
  test('8. Short profit', () => {
    const lp = calculateLPPosition(200, 50, 100, 50);
    const hedge = calculateHedge(75, 100, 50, lp.currentVolatileValue); // price drops 50%

    // Short PnL: 75 * ((100-50)/100) = $37.5
    expect(hedge.shortPnL.toNumber()).toBe(37.5);
  });

  // Test Case 9: Short loss
  test('9. Short loss', () => {
    const lp = calculateLPPosition(200, 50, 100, 150);
    const hedge = calculateHedge(75, 100, 150, lp.currentVolatileValue); // price rises 50%

    // Short PnL: 75 * ((100-150)/100) = -$37.5
    expect(hedge.shortPnL.toNumber()).toBe(-37.5);
  });

  // Test Case 10: Negative funding
  test('10. Negative funding (income)', () => {
    const lp = calculateLPPosition(200, 50, 100, 100);
    const hedge = calculateHedge(75, 100, 100, lp.currentVolatileValue);

    // funding = -5 (income)
    const total = calculateTotalPnL(lp, hedge, 0, -5, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(5); // 0 + 5
  });

  // Test Case 11: Positive funding
  test('11. Positive funding (cost)', () => {
    const lp = calculateLPPosition(200, 50, 100, 100);
    const hedge = calculateHedge(75, 100, 100, lp.currentVolatileValue);

    // funding = 5 (cost)
    const total = calculateTotalPnL(lp, hedge, 0, 5, 0, 0, 0, 200);
    expect(total.netPnL.toNumber()).toBe(-5);
  });

  // Test Case 12: Manual short notional
  test('12. Manual short notional', () => {
    const lp = calculateLPPosition(200, 50, 100, 100); // 100 vol
    const hedge = calculateHedge(80, 100, 100, lp.currentVolatileValue); // $80 short

    expect(hedge.shortNotional.toNumber()).toBe(80);
    expect(hedge.effectiveHedgeRatio.toNumber()).toBe(0.8); // 80 / 100
  });
