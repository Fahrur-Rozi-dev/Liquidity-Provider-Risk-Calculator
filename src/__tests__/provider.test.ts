import { MockPoolProvider, normalizePriceToUsdPerToken } from '../lib/data/mockProvider';
import { estimateFees } from '../lib/calculations/fees';
import Decimal from 'decimal.js';

describe('Data Provider & Normalization', () => {

  test('normalizePriceToUsdPerToken inverts when Token0 is USDC', () => {
    // e.g. Raydium sometimes tracks USDC/SOL price where USDC is token0
    // so raw price = 0.00666 USDC per SOL natively internally, or inverted 150 SOL per USDC
    const t0 = { address: 'usdc', symbol: 'USDC', decimals: 6 };
    const t1 = { address: 'sol', symbol: 'SOL', decimals: 9 };

    // Assume raw price is 150 SOL per 1 USDC
    const rawPrice = new Decimal(150);

    // We want USDC per SOL = 1 / 150
    const normalized = normalizePriceToUsdPerToken(rawPrice, t0, t1);
    expect(normalized.toNumber()).toBeCloseTo(0.006666, 5);
  });

  test('normalizePriceToUsdPerToken keeps as is when Token1 is USDC', () => {
    const t0 = { address: 'sol', symbol: 'SOL', decimals: 9 };
    const t1 = { address: 'usdc', symbol: 'USDC', decimals: 6 };
    const rawPrice = new Decimal(150);

    const normalized = normalizePriceToUsdPerToken(rawPrice, t0, t1);
    expect(normalized.toNumber()).toBe(150);
  });

  test('Mock Provider Cache Works', async () => {
    const provider = new MockPoolProvider();

    const p1 = await provider.getPool("raydium-sol-usdc-0.25");
    const p2 = await provider.getPool("raydium-sol-usdc-0.25");

    // Should return exact same object reference if cached
    expect(p1).toBe(p2);
  });

  test('Mock Provider History Generator', async () => {
    const provider = new MockPoolProvider();
    const history = await provider.getPoolHistory("raydium-sol-usdc-0.25", { interval: '1h' });

    expect(history.length).toBeGreaterThan(0);
    // Chronologically sorted (oldest first, because we generated backwards but need it chronological in the end)
    // Wait, the mock generator pushes from oldest to newest because of loop `for (let i = steps; i >= 0; i--)`
    // Let's verify:
    expect(history[0].timestamp.getTime()).toBeLessThan(history[history.length - 1].timestamp.getTime());
  });

  test('Fee Estimation Logic', () => {
    // POOL ESTIMATE mode
    // Pool volume = $1M, fee rate = 0.25%, LP share = 0.01%
    // Pool fee = $2500. User fee = $0.25
    const est = estimateFees('POOL_ESTIMATE', 'IN_RANGE', 0.25, 0.01, 1000000, 0, 0);
    expect(est.toNumber()).toBeCloseTo(0.25);

    // Out of range should be 0
    const estOut = estimateFees('POOL_ESTIMATE', 'ABOVE_RANGE', 0.25, 0.01, 1000000, 0, 0);
    expect(estOut.toNumber()).toBe(0);

    // HISTORICAL POOL FEES mode
    // Actual pool fees = $3000, LP share = 0.01% -> User fee = $0.30
    const hist = estimateFees('HISTORICAL_POOL_FEES', 'IN_RANGE', 0, 0.01, 0, 3000, 0);
    expect(hist.toNumber()).toBeCloseTo(0.30);
  });
});
