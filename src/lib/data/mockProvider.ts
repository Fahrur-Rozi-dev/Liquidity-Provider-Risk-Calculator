import Decimal from "decimal.js";
import { NormalizedPool, PoolSnapshot, HistoryParams, PoolDataProvider, TokenInfo } from "@/types";

// Mock data fixtures mapping
const MOCK_POOLS: NormalizedPool[] = [
  {
    id: "raydium-sol-usdc-0.25",
    protocol: "Raydium",
    chain: "Solana",
    poolType: "CLMM",
    token0: { address: "So11111111111111111111111111111111111111112", symbol: "SOL", decimals: 9 },
    token1: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", decimals: 6 },
    feeRate: new Decimal(0.25),
    currentPrice: new Decimal(150.0), // USDC per SOL
    tvlUsd: new Decimal(10000000),
    volume24hUsd: new Decimal(5000000),
    fees24hUsd: new Decimal(12500),
    apr: new Decimal(45.6),
    updatedAt: new Date(),
    source: "MockProvider",
    fetchedAt: new Date()
  },
  {
    id: "meteora-eth-usdc-0.05",
    protocol: "Meteora",
    chain: "Solana",
    poolType: "DLMM",
    token0: { address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", symbol: "ETH", decimals: 8 },
    token1: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", decimals: 6 },
    feeRate: new Decimal(0.05),
    currentPrice: new Decimal(3500.0), // USDC per ETH
    tvlUsd: new Decimal(5000000),
    volume24hUsd: new Decimal(1000000),
    fees24hUsd: new Decimal(500),
    apr: new Decimal(3.65),
    updatedAt: new Date(),
    source: "MockProvider",
    fetchedAt: new Date()
  }
];

export class MockPoolProvider implements PoolDataProvider {

  // Cache to simulate fetching abstraction
  private cache = new Map<string, { data: NormalizedPool, timestamp: number }>();
  private CACHE_TTL_MS = 60000; // 1 minute

  async searchPools(query: string): Promise<NormalizedPool[]> {
    const lowerQ = query.toLowerCase();
    return MOCK_POOLS.filter(p =>
      p.token0.symbol.toLowerCase().includes(lowerQ) ||
      p.token1.symbol.toLowerCase().includes(lowerQ) ||
      p.protocol.toLowerCase().includes(lowerQ) ||
      p.id.toLowerCase().includes(lowerQ)
    );
  }

  async getPool(poolId: string): Promise<NormalizedPool> {
    const cacheKey = `pool_${poolId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const pool = MOCK_POOLS.find(p => p.id === poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);

    // Simulate freshness drift by setting fetchedAt dynamically
    const freshPool = { ...pool, fetchedAt: new Date() };
    this.cache.set(cacheKey, { data: freshPool, timestamp: Date.now() });

    return freshPool;
  }

  async getPoolSnapshot(poolId: string): Promise<PoolSnapshot> {
    const pool = await this.getPool(poolId);
    return {
      poolId: pool.id,
      timestamp: new Date(),
      price: pool.currentPrice,
      tvlUsd: pool.tvlUsd,
      volumeUsd: pool.volume24hUsd,
      feesUsd: pool.fees24hUsd,
      feeRate: pool.feeRate,
      source: "MockProvider"
    };
  }

  async getPoolHistory(poolId: string, params: HistoryParams): Promise<PoolSnapshot[]> {
    const pool = await this.getPool(poolId);

    // Generate mock history walking backward
    const history: PoolSnapshot[] = [];
    let currentPrice = pool.currentPrice!.toNumber();
    let currentTvl = pool.tvlUsd!.toNumber();

    // Default to last 7 days of 1h ticks if params not fully specified
    const msPerStep = params.interval === '1h' ? 3600000 : 86400000;
    const steps = 24 * 7;

    const now = Date.now();
    for (let i = steps; i >= 0; i--) {
       const timestamp = new Date(now - (i * msPerStep));
       // Basic random walk
       const change = (Math.random() - 0.5) * 0.02; // +/- 1%
       currentPrice = currentPrice * (1 + change);
       currentTvl = currentTvl * (1 + (Math.random() - 0.5) * 0.01);

       history.push({
         poolId: pool.id,
         timestamp,
         price: new Decimal(currentPrice),
         tvlUsd: new Decimal(currentTvl),
         volumeUsd: new Decimal(currentTvl * Math.random() * 0.2), // pseudo volume
         feesUsd: new Decimal(currentTvl * Math.random() * 0.2 * pool.feeRate!.toNumber()),
         feeRate: pool.feeRate,
         source: "MockProvider"
       });
    }

    return history;
  }
}

// Normalizer Utility
export function normalizePriceToUsdPerToken(
  rawPrice: Decimal,
  token0: TokenInfo,
  token1?: TokenInfo
): Decimal {
  // If Token 0 is USDC, the pool trades in SOL per USDC.
  // We want USDC per SOL natively. So we invert.
  if (token0.symbol === "USDC" || token0.symbol === "USDT") {
    if (rawPrice.isZero()) return new Decimal(0);
    return new Decimal(1).div(rawPrice);
  }

  // If Token 1 is USDC, it's already USDC per SOL.
  return rawPrice;
}
