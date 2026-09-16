import { calculateCLMM } from '../lib/calculations/clmm';


describe('CLMM Engine', () => {

  describe('Range Transition Tests', () => {
    const capital = 200;
    const entry = 100;
    const lower = 80;
    const upper = 120;

    test('Inside Range', () => {
      const res = calculateCLMM(capital, entry, lower, upper, 100);
      expect(res.rangeStatus).toBe('IN_RANGE');
      expect(res.volatileQuantity.toNumber()).toBeGreaterThan(0);
      expect(res.amountUSDC?.toNumber()).toBeGreaterThan(0);
      // Because entry is exact midpoint geometrically (sqrt(80*120) = 97.97), 100 is slightly above geometric mean.
    });

    test('At Lower Boundary', () => {
      const res = calculateCLMM(capital, entry, lower, upper, 80);
      expect(res.rangeStatus).toBe('BELOW_RANGE'); // Note: lte in code means 80 is treated as BELOW (100% SOL)
      expect(res.amountUSDC?.toNumber()).toBe(0);
    });

    test('Below Range', () => {
      const res = calculateCLMM(capital, entry, lower, upper, 50);
      expect(res.rangeStatus).toBe('BELOW_RANGE');
      expect(res.amountUSDC?.toNumber()).toBe(0);
      expect(res.volatileQuantity.toNumber()).toBeGreaterThan(0); // Holds only SOL
    });

    test('At Upper Boundary', () => {
      const res = calculateCLMM(capital, entry, lower, upper, 120);
      expect(res.rangeStatus).toBe('ABOVE_RANGE');
      expect(res.volatileQuantity.toNumber()).toBe(0);
    });

    test('Above Range', () => {
      const res = calculateCLMM(capital, entry, lower, upper, 150);
      expect(res.rangeStatus).toBe('ABOVE_RANGE');
      expect(res.volatileQuantity.toNumber()).toBe(0);
      expect(res.amountUSDC?.toNumber()).toBeGreaterThan(0); // Holds only USDC
    });
  });

  describe('Consistency Tests', () => {
    test('Entry price unchanged', () => {
      const res = calculateCLMM(200, 100, 80, 120, 100);
      expect(res.lpValue.toNumber()).toBeCloseTo(200, 5);
      expect(res.hodlValue?.toNumber()).toBeCloseTo(200, 5);
      expect(res.assetPnL.toNumber()).toBeCloseTo(0, 5);
      expect(res.ilUSD?.toNumber()).toBeCloseTo(0, 5);
    });
  });

  describe('Round Trip Tests', () => {
    test('Entry -> Higher -> Entry', () => {
      const init = calculateCLMM(200, 100, 80, 120, 100);
      calculateCLMM(200, 100, 80, 120, 110);
      const back = calculateCLMM(200, 100, 80, 120, 100);

      expect(back.volatileQuantity.toNumber()).toBeCloseTo(init.volatileQuantity.toNumber(), 5);
      expect(back.amountUSDC?.toNumber()).toBeCloseTo(init.amountUSDC!.toNumber(), 5);
      expect(back.lpValue.toNumber()).toBeCloseTo(200, 5);
    });

    test('Entry -> Lower -> Entry', () => {
      const init = calculateCLMM(200, 100, 80, 120, 100);
      calculateCLMM(200, 100, 80, 120, 90);
      const back = calculateCLMM(200, 100, 80, 120, 100);

      expect(back.volatileQuantity.toNumber()).toBeCloseTo(init.volatileQuantity.toNumber(), 5);
      expect(back.amountUSDC?.toNumber()).toBeCloseTo(init.amountUSDC!.toNumber(), 5);
      expect(back.lpValue.toNumber()).toBeCloseTo(200, 5);
    });
  });

  describe('Symmetry / Sanity Tests', () => {
    test('Narrow range has more concentrated behavior', () => {
      const narrow = calculateCLMM(200, 100, 99, 101, 101); // Hit upper quickly
      expect(narrow.volatileQuantity.toNumber()).toBe(0); // Sold all SOL already

      const wide = calculateCLMM(200, 100, 50, 150, 101);
      expect(wide.volatileQuantity.toNumber()).toBeGreaterThan(0); // Still holds SOL
    });
  });
});
