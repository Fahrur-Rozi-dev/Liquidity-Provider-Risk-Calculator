import type { PoolId, PoolMetadata, PoolSnapshot, Token } from "@/types";
import type { PoolDataProvider, PoolQuery, ProviderResult } from "@/providers/types";
import { okQuality, errorQuality } from "@/providers/data-quality";
import {
  discoverPools,
  loadPoolMetadata,
  loadPoolSnapshot,
  selectPrimaryPool,
  sortDiscoveredPools,
  toPoolSelection,
  type DiscoveredPool,
} from "@/services/poolData";

/**
 * Pool data service tests use hand-rolled fake providers implementing the
 * production PoolDataProvider contract (docs/08 Step 4: fakes behind the same
 * contract) — no live network, no parallel model. Assertions target the
 * canonical docs/05 contracts: PoolMetadata / PoolSnapshot / DataQuality.
 */

function token(symbol: string, decimals: number, address: string): Token {
  return { symbol, decimals, address, chain: "solana" };
}

function makeMetadata(overrides: Partial<PoolMetadata> = {}): PoolMetadata {
  const id: PoolId = { protocol: "raydium", chain: "solana", address: "pool-a" };
  return {
    id,
    key: "raydium:solana:pool-a",
    poolType: "clmm",
    token0: token("SOL", 9, "So111"),
    token1: token("USDC", 6, "EPjF"),
    feeTier: 0.0025,
    source: "test",
    ...overrides,
  };
}

function makeSnapshot(metadata: PoolMetadata, overrides: Partial<PoolSnapshot> = {}): PoolSnapshot {
  return {
    poolId: metadata.id,
    poolKey: metadata.key,
    observedAt: null,
    price: 150,
    liquidity: null,
    tvlUsd: 1_000_000,
    volume24hUsd: null,
    fees24hUsd: null,
    feeTier: metadata.feeTier,
    quality: okQuality(metadata.source, 2),
    ...overrides,
  };
}

function fakeProvider(
  pools: readonly PoolMetadata[],
  options: { failDiscovery?: boolean } = {},
): PoolDataProvider {
  return {
    id: "fake",
    label: "Fake provider",
    async discoverPools(query: PoolQuery = {}): Promise<ProviderResult<PoolMetadata[]>> {
      if (options.failDiscovery) {
        return { data: null, quality: errorQuality("fake", 1, "[network] down") };
      }
      let data = [...pools];
      if (query.poolType) data = data.filter((p) => p.poolType === query.poolType);
      if (query.limit !== undefined) data = data.slice(0, query.limit);
      return { data, quality: okQuality("fake", 1) };
    },
    async getPoolMetadata(poolKey: string): Promise<ProviderResult<PoolMetadata>> {
      const found = pools.find((p) => p.key === poolKey);
      if (!found) {
        return { data: null, quality: errorQuality("fake", 1, "[validation] not found") };
      }
      return { data: found, quality: okQuality("fake", 1) };
    },
    async getPoolSnapshot(poolKey: string): Promise<ProviderResult<PoolSnapshot>> {
      const found = pools.find((p) => p.key === poolKey);
      if (!found) {
        return { data: null, quality: errorQuality("fake", 1, "[validation] not found") };
      }
      return { data: makeSnapshot(found), quality: okQuality("fake", 2) };
    },
  };
}

describe("sortDiscoveredPools", () => {
  it("orders deterministically by pair symbols, then canonical key", () => {
    const pools: DiscoveredPool[] = [
      { metadata: makeMetadata({ key: "raydium:solana:z", id: { protocol: "raydium", chain: "solana", address: "z" }, token0: token("SOL", 9, "So111") }), orientation: "stable-per-volatile" },
      { metadata: makeMetadata({ key: "raydium:solana:b", id: { protocol: "raydium", chain: "solana", address: "b" }, token0: token("BONK", 5, "DezX") }), orientation: "stable-per-volatile" },
      { metadata: makeMetadata({ key: "raydium:solana:m", id: { protocol: "raydium", chain: "solana", address: "m" }, token0: token("JUP", 6, "JUPy") }), orientation: "stable-per-volatile" },
    ];
    expect(sortDiscoveredPools(pools).map((p) => p.metadata.token0.symbol)).toEqual(["BONK", "JUP", "SOL"]);
  });

  it("does not mutate the input array", () => {
    const pools: DiscoveredPool[] = [
      { metadata: makeMetadata({ token0: token("SOL", 9, "So111") }), orientation: "stable-per-volatile" },
      { metadata: makeMetadata({ token0: token("AAA", 6, "aaa") }), orientation: "stable-per-volatile" },
    ];
    sortDiscoveredPools(pools);
    expect(pools[0].metadata.token0.symbol).toBe("SOL");
  });
});

describe("selectPrimaryPool", () => {
  it("picks the first pool in canonical sort order — provider rank first, NOT TVL", () => {
    // AAA sorts first alphabetically even though its TVL is far lower:
    // providers already rank discovery by liquidity, so re-ranking on TVL
    // here would need observations for every pool (docs/06 rationale).
    const pools: DiscoveredPool[] = [
      { metadata: makeMetadata({ key: "raydium:solana:sol", token0: token("SOL", 9, "So111") }), orientation: "stable-per-volatile" },
      { metadata: makeMetadata({ key: "raydium:solana:aaa", token0: token("AAA", 6, "aaa") }), orientation: "stable-per-volatile" },
    ];
    expect(selectPrimaryPool(pools)?.metadata.key).toBe("raydium:solana:aaa");
  });

  it("returns null for an empty list", () => {
    expect(selectPrimaryPool([])).toBeNull();
  });
});

describe("toPoolSelection", () => {
  it("joins metadata with a snapshot into calculator-ready inputs", () => {
    const metadata = makeMetadata();
    const selection = toPoolSelection(metadata, makeSnapshot(metadata, { price: 150.25, tvlUsd: 42_000 }));
    expect(selection.metadata).toBe(metadata);
    expect(selection.volatileSymbol).toBe("SOL");
    expect(selection.stableSymbol).toBe("USDC");
    expect(selection.entryPrice).toBe(150.25);
    expect(selection.feeTier).toBeCloseTo(0.0025, 9);
    expect(selection.tvlUsd).toBe(42_000);
    expect(selection.source).toBe("test");
  });

  it("falls back to the metadata fee tier when the snapshot omits it", () => {
    const metadata = makeMetadata({ feeTier: 0.001 });
    const selection = toPoolSelection(metadata, makeSnapshot(metadata, { feeTier: null }));
    expect(selection.feeTier).toBe(0.001);
  });

  it("propagates unknown TVL as null — never coerced to zero (docs/05)", () => {
    const metadata = makeMetadata();
    const selection = toPoolSelection(metadata, makeSnapshot(metadata, { tvlUsd: null }));
    expect(selection.tvlUsd).toBeNull();
  });
});

describe("discoverPools", () => {
  it("keeps only canonical CLMM pools and wraps them with orientation", async () => {
    const clmm = makeMetadata();
    const amm = makeMetadata({ key: "raydium:solana:amm", id: { protocol: "raydium", chain: "solana", address: "amm" }, poolType: "amm" as const });
    const result = await discoverPools(fakeProvider([clmm, amm]));
    expect(result.data).toEqual([{ metadata: clmm, orientation: "stable-per-volatile" }]);
    expect(result.quality.status).toBe("fresh");
  });

  it("passes the query through to the provider", async () => {
    let received: PoolQuery | undefined;
    const base = fakeProvider([makeMetadata()]);
    const provider: PoolDataProvider = {
      ...base,
      async discoverPools(query?: PoolQuery) {
        received = query;
        return base.discoverPools(query);
      },
    };
    await discoverPools(provider, { poolType: "clmm", limit: 5 });
    expect(received).toEqual({ poolType: "clmm", limit: 5 });
  });

  it("propagates provider failures untouched", async () => {
    const result = await discoverPools(fakeProvider([], { failDiscovery: true }));
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[network] down");
  });
});

describe("loadPoolMetadata", () => {
  it("delegates to the provider contract", async () => {
    const result = await loadPoolMetadata(fakeProvider([makeMetadata()]), "raydium:solana:pool-a");
    expect(result.data?.key).toBe("raydium:solana:pool-a");
    expect(result.quality.status).toBe("fresh");
  });

  it("propagates not-found errors", async () => {
    const result = await loadPoolMetadata(fakeProvider([makeMetadata()]), "missing");
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[validation] not found");
  });
});

describe("loadPoolSnapshot", () => {
  it("delegates to the provider contract", async () => {
    const metadata = makeMetadata();
    const result = await loadPoolSnapshot(fakeProvider([metadata]), "raydium:solana:pool-a");
    expect(result.data?.price).toBe(150);
    expect(result.data?.poolKey).toBe("raydium:solana:pool-a");
    expect(result.quality.status).toBe("fresh");
  });

  it("propagates not-found errors", async () => {
    const result = await loadPoolSnapshot(fakeProvider([makeMetadata()]), "missing");
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[validation] not found");
  });
});
