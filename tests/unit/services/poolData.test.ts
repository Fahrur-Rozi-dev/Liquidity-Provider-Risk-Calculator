import type { Pool, PoolSnapshot } from "@/types";
import type { PoolDataProvider, PoolQuery, ProviderResult } from "@/providers/types";
import {
  discoverPools,
  loadPoolSnapshot,
  selectPrimaryPool,
  toPoolSelection,
  type DiscoveredPool,
} from "@/services/poolData";

/**
 * Pool data service tests use hand-rolled fake providers implementing the
 * production interface (docs/08 Step 4: fakes behind the same contract) —
 * no live network, no parallel model.
 */

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    id: "pool-a",
    address: "pool-a",
    protocol: "raydium",
    chain: "solana",
    poolType: "clmm",
    token0: { symbol: "SOL", decimals: 9, address: "So111", chain: "solana" },
    token1: { symbol: "USDC", decimals: 6, address: "EPjF", chain: "solana" },
    feeRate: 0.0025,
    currentPrice: 150,
    liquidity: null,
    tvlUsd: 1_000_000,
    volume24hUsd: null,
    fees24hUsd: null,
    observedAt: null,
    source: "test",
    ...overrides,
  };
}

function fakeProvider(pools: readonly Pool[], fail = false): PoolDataProvider {
  return {
    id: "fake",
    label: "Fake provider",
    async searchPools(): Promise<ProviderResult<Pool[]>> {
      if (fail) {
        return {
          data: null,
          provenance: { source: "fake", fetchedAt: 1, observedAt: null, freshness: "error", estimated: false, error: "[network] down" },
        };
      }
      return {
        data: [...pools],
        provenance: { source: "fake", fetchedAt: 1, observedAt: null, freshness: "live", estimated: false },
      };
    },
    async getPoolSnapshot(poolId: string): Promise<ProviderResult<PoolSnapshot>> {
      const pool = pools.find((entry) => entry.id === poolId);
      if (!pool) {
        return {
          data: null,
          provenance: { source: "fake", fetchedAt: 1, observedAt: null, freshness: "error", estimated: false, error: "[validation] not found" },
        };
      }
      return {
        data: {
          timestamp: 2,
          price: pool.currentPrice,
          tvlUsd: pool.tvlUsd,
          liquidity: null,
          volume24hUsd: pool.volume24hUsd,
          fees24hUsd: pool.fees24hUsd,
          feeRate: pool.feeRate,
          source: pool.source,
          estimated: false,
        },
        provenance: { source: "fake", fetchedAt: 2, observedAt: null, freshness: "live", estimated: false },
      };
    },
  };
}

describe("selectPrimaryPool", () => {
  it("picks the highest-TVL pool deterministically", () => {
    const pools: DiscoveredPool[] = [
      { pool: makePool({ id: "small", tvlUsd: 100 }), orientation: "stable-per-volatile" },
      { pool: makePool({ id: "big", tvlUsd: 900 }), orientation: "stable-per-volatile" },
      { pool: makePool({ id: "middle", tvlUsd: 500 }), orientation: "stable-per-volatile" },
    ];
    expect(selectPrimaryPool(pools)?.pool.id).toBe("big");
  });

  it("ignores pools with unknown TVL", () => {
    const pools: DiscoveredPool[] = [
      { pool: makePool({ id: "unknown", tvlUsd: null }), orientation: "stable-per-volatile" },
      { pool: makePool({ id: "known", tvlUsd: 1 }), orientation: "stable-per-volatile" },
    ];
    expect(selectPrimaryPool(pools)?.pool.id).toBe("known");
  });

  it("returns null for an empty list", () => {
    expect(selectPrimaryPool([])).toBeNull();
  });

  it("returns null when no pool has a TVL", () => {
    const pools: DiscoveredPool[] = [{ pool: makePool({ tvlUsd: null }), orientation: "stable-per-volatile" }];
    expect(selectPrimaryPool(pools)).toBeNull();
  });

  it("keeps the first pool on ties (stable ordering)", () => {
    const pools: DiscoveredPool[] = [
      { pool: makePool({ id: "first", tvlUsd: 100 }), orientation: "stable-per-volatile" },
      { pool: makePool({ id: "second", tvlUsd: 100 }), orientation: "stable-per-volatile" },
    ];
    expect(selectPrimaryPool(pools)?.pool.id).toBe("first");
  });
});

describe("toPoolSelection", () => {
  it("projects a pool into calculator-ready inputs", () => {
    const pool = makePool({ currentPrice: 150.25, feeRate: 0.0001 });
    const selection = toPoolSelection(pool);
    expect(selection.volatileSymbol).toBe("SOL");
    expect(selection.stableSymbol).toBe("USDC");
    expect(selection.entryPrice).toBe(150.25);
    expect(selection.feeRate).toBe(0.0001);
    expect(selection.tvlUsd).toBe(1_000_000);
    expect(selection.source).toBe("test");
  });
});

describe("discoverPools", () => {
  it("wraps normalized pools with canonical orientation", async () => {
    const result = await discoverPools(fakeProvider([makePool()]));
    expect(result.provenance.freshness).toBe("live");
    expect(result.data).toEqual([{ pool: makePool(), orientation: "stable-per-volatile" }]);
  });

  it("passes the query through to the provider", async () => {
    let received: PoolQuery | undefined;
    const provider: PoolDataProvider = {
      ...fakeProvider([makePool()]),
      async searchPools(query?: PoolQuery) {
        received = query;
        return fakeProvider([makePool()]).searchPools();
      },
    };
    await discoverPools(provider, { poolType: "clmm", limit: 5 });
    expect(received).toEqual({ poolType: "clmm", limit: 5 });
  });

  it("propagates provider failures untouched", async () => {
    const result = await discoverPools(fakeProvider([], true));
    expect(result.data).toBeNull();
    expect(result.provenance.error).toBe("[network] down");
  });
});

describe("loadPoolSnapshot", () => {
  it("delegates to the provider contract", async () => {
    const result = await loadPoolSnapshot(fakeProvider([makePool({ currentPrice: 42 })]), "pool-a");
    expect(result.data?.price).toBe(42);
    expect(result.provenance.freshness).toBe("live");
  });

  it("propagates not-found errors", async () => {
    const result = await loadPoolSnapshot(fakeProvider([makePool()]), "missing");
    expect(result.data).toBeNull();
    expect(result.provenance.error).toBe("[validation] not found");
  });
});
