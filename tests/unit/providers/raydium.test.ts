import { clearHttpCache, type FetchLike } from "@/providers/http";
import { RaydiumPoolProvider } from "@/providers/raydium/pool";
import { orientRaydiumPool, QUOTE_MINT_ADDRESSES } from "@/providers/raydium/normalize";

/**
 * Raydium adapter tests run entirely against a mocked transport — no live
 * network in tests. Response shapes mirror the verified live API v3 payload.
 * Assertions target the canonical contracts (docs/05): PoolMetadata for
 * discovery, PoolSnapshot for observations, DataQuality for every result.
 */

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const RAW_POOL = {
  type: "Concentrated",
  programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  id: "pool-1",
  mintA: { chainId: 101, address: "7MY6V8pFVqe8Z79Cd3shbxbDHiDmgMBEUJMmCGixMLgw", symbol: "KAS", name: "Kaspa", decimals: 6 },
  mintB: { chainId: 101, address: USDC, symbol: "USDC", name: "USD Coin", decimals: 6 },
  price: 0.042965598770605656,
  mintAmountA: 992498858.02746,
  mintAmountB: 10161.74414,
  feeRate: 0.0001,
  openTime: "0",
  tvl: 42653469.46,
  day: { volume: 355501.864, volumeQuote: 355536.856, volumeFee: 35.550193, apr: 0.03, feeApr: 0.03 },
  pooltype: ["Clmm"],
  config: { tickSpacing: 1 },
};

function envelope(data: unknown) {
  return { id: "req-1", success: true, data };
}

function captureFetch(body: unknown, ok = true, status = 200) {
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    calls.push(url);
    return { ok, status, text: async () => JSON.stringify(body) };
  };
  return { fetchImpl, calls };
}

beforeEach(() => {
  // The transport cache is module-level and URL-keyed; each test gets a cold cache.
  clearHttpCache();
});

describe("RaydiumPoolProvider.discoverPools", () => {
  it("normalizes canonically oriented pools into stable PoolMetadata with fresh quality", async () => {
    const { fetchImpl } = captureFetch(envelope({ count: 1, data: [RAW_POOL], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();

    expect(result.data).not.toBeNull();
    const metadata = result.data![0];
    expect(metadata.key).toBe("raydium:solana:pool-1");
    expect(metadata.id).toEqual({ protocol: "raydium", chain: "solana", address: "pool-1" });
    expect(metadata.poolType).toBe("clmm");
    expect(metadata.token0.symbol).toBe("KAS");
    expect(metadata.token1.symbol).toBe("USDC");
    expect(metadata.feeTier).toBeCloseTo(0.0001, 9);
    expect(metadata.source).toBe("raydium-api-v3");
    // Discovery quality: fresh fetch from the live provider (docs/05).
    expect(result.quality.status).toBe("fresh");
    expect(result.quality.source).toBe("raydium-api-v3");
    expect(result.quality.fetchedAt).not.toBeNull();
    expect(result.quality.estimated).toBe(false);
  });

  it("queries the concentrated list endpoint with the requested page size", async () => {
    const { fetchImpl, calls } = captureFetch(envelope({ count: 0, data: [], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    await provider.discoverPools({ limit: 7 });
    expect(calls[0]).toContain("pools/info/list?poolType=concentrated&poolSortField=liquidity&sortType=desc&pageSize=7&page=1");
  });

  it("clamps the page size into the provider's documented 1..100 range", async () => {
    const { fetchImpl, calls } = captureFetch(envelope({ count: 0, data: [], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    await provider.discoverPools({ limit: 500 });
    expect(calls[0]).toContain("pageSize=100");
  });

  it("drops pools that cannot be oriented stable-per-volatile", async () => {
    // Both sides stable → not expressible as volatile/stable.
    const stablePair = {
      ...RAW_POOL,
      id: "pool-stable",
      mintA: { chainId: 101, address: USDT, symbol: "USDT", name: "Tether", decimals: 6 },
    };
    // mintB not a recognized quote asset → rejected rather than re-priced.
    const weirdQuote = {
      ...RAW_POOL,
      id: "pool-weird",
      mintB: { chainId: 101, address: "MintDog", symbol: "DOGE", name: "Dogecoin", decimals: 8 },
    };
    const { fetchImpl } = captureFetch(envelope({ count: 3, data: [stablePair, weirdQuote, RAW_POOL], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();

    expect(result.data!.map((p) => p.id.address)).toEqual(["pool-1"]);
  });

  it("drops entries failing integrity validation (bad decimals, impossible fee rates)", async () => {
    const badDecimals = {
      ...RAW_POOL,
      id: "pool-decimals",
      mintA: { ...RAW_POOL.mintA, decimals: 18 },
    };
    const badFeeRate = { ...RAW_POOL, id: "pool-fee", feeRate: 2 };
    const negativeTvl = { ...RAW_POOL, id: "pool-tvl", tvl: -1 };
    const { fetchImpl } = captureFetch(
      envelope({ count: 4, data: [badDecimals, badFeeRate, negativeTvl, RAW_POOL], hasNextPage: false }),
    );
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data!.map((p) => p.id.address)).toEqual(["pool-1"]);
  });

  it("allows missing 24h windows in snapshots (volume/fees stay null, never zero)", async () => {
    const { fetchImpl } = captureFetch(envelope([{ ...RAW_POOL, day: undefined }]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolSnapshot("pool-1");
    expect(result.data!.volume24hUsd).toBeNull();
    expect(result.data!.fees24hUsd).toBeNull();
  });

  it("drops entries missing required fields but keeps valid ones", async () => {
    const broken = { ...RAW_POOL, id: "pool-broken", feeRate: undefined };
    const { fetchImpl } = captureFetch(envelope({ count: 2, data: [broken, RAW_POOL], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data!.map((p) => p.id.address)).toEqual(["pool-1"]);
    expect(result.quality.status).toBe("fresh");
  });

  it("surfaces a provider-reported failure as error quality without throwing", async () => {
    const { fetchImpl } = captureFetch({ id: "req", success: false, msg: "query ids type error" });
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[http] query ids type error");
  });

  it("surfaces malformed payloads as validation errors", async () => {
    const { fetchImpl } = captureFetch({ hello: "not an envelope" });
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[validation] Malformed response envelope.");
  });

  it("surfaces HTTP errors", async () => {
    const { fetchImpl } = captureFetch("rate limited", false, 429);
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[http] HTTP 429 for https://api-v3.raydium.io/pools/info/list?poolType=concentrated&poolSortField=liquidity&sortType=desc&pageSize=20&page=1");
  });

  it("surfaces network failures", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[network] fetch failed");
  });

  it("surfaces timeouts as network errors", async () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const fetchImpl: FetchLike = async () => {
      throw abort;
    };
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.discoverPools();
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[network] Request timed out.");
  });

  it("serves repeated reads within the TTL window from the bounded cache (docs/06)", async () => {
    const { fetchImpl, calls } = captureFetch(envelope({ count: 1, data: [RAW_POOL], hasNextPage: false }));
    const provider = new RaydiumPoolProvider({ fetchImpl, ttlMs: 60_000 });

    const first = await provider.discoverPools();
    const second = await provider.discoverPools();

    expect(calls).toHaveLength(1); // second read never hits the transport
    expect(second.data).toEqual(first.data);
    expect(second.quality.warnings.some((w) => w.includes("TTL cache"))).toBe(true);
  });
});

describe("RaydiumPoolProvider.getPoolMetadata", () => {
  it("returns stable metadata for a known pool via the ids endpoint", async () => {
    const { fetchImpl, calls } = captureFetch(envelope([RAW_POOL]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolMetadata("pool-1");

    expect(calls[0]).toContain("pools/info/ids?ids=pool-1");
    expect(result.data).not.toBeNull();
    expect(result.data!.key).toBe("raydium:solana:pool-1");
    expect(result.data!.feeTier).toBeCloseTo(0.0001, 9);
    expect(result.quality.status).toBe("fresh");
  });

  it("reports unknown pools as validation errors, never invented metadata", async () => {
    const { fetchImpl } = captureFetch(envelope([]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolMetadata("missing");
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[validation] Pool missing not found.");
  });

  it("reports non-orientable pools as validation errors", async () => {
    const stablePair = {
      ...RAW_POOL,
      mintA: { chainId: 101, address: USDT, symbol: "USDT", name: "Tether", decimals: 6 },
    };
    const { fetchImpl } = captureFetch(envelope([stablePair]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolMetadata("pool-1");
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[validation] Pool pool-1 cannot be oriented stable-per-volatile.");
  });
});

describe("RaydiumPoolProvider.getPoolSnapshot", () => {
  it("returns a fresh PoolSnapshot observation for a known pool", async () => {
    const { fetchImpl } = captureFetch(envelope([RAW_POOL]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolSnapshot("pool-1");

    expect(result.data).not.toBeNull();
    const snapshot = result.data!;
    expect(snapshot.poolId).toEqual({ protocol: "raydium", chain: "solana", address: "pool-1" });
    expect(snapshot.poolKey).toBe("raydium:solana:pool-1");
    // Raydium serves provider-cached aggregates without observation times.
    expect(snapshot.observedAt).toBeNull();
    expect(snapshot.price).toBeCloseTo(0.042965598770605656, 18);
    expect(snapshot.feeTier).toBeCloseTo(0.0001, 9);
    expect(snapshot.tvlUsd).toBeCloseTo(42653469.46, 6);
    expect(snapshot.volume24hUsd).toBeCloseTo(355501.864, 6);
    expect(snapshot.fees24hUsd).toBeCloseTo(35.550193, 6);
    // Raw CLMM liquidity is not normalized: null means unknown, never zero.
    expect(snapshot.liquidity).toBeNull();
    expect(snapshot.quality.status).toBe("fresh");
    expect(snapshot.quality.estimated).toBe(false);
    expect(snapshot.quality.source).toBe("raydium-api-v3");
  });

  it("reports unknown pools as validation errors without inventing data", async () => {
    const { fetchImpl } = captureFetch(envelope([]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolSnapshot("missing");
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[validation] Pool missing not found.");
  });

  it("reports non-orientable pools as validation errors", async () => {
    const stablePair = {
      ...RAW_POOL,
      mintA: { chainId: 101, address: USDT, symbol: "USDT", name: "Tether", decimals: 6 },
    };
    const { fetchImpl } = captureFetch(envelope([stablePair]));
    const provider = new RaydiumPoolProvider({ fetchImpl });
    const result = await provider.getPoolSnapshot("pool-1");
    expect(result.data).toBeNull();
    expect(result.quality.error).toBe("[validation] Pool pool-1 cannot be oriented stable-per-volatile.");
  });
});

describe("orientation rules", () => {
  it("recognizes the documented quote mints", () => {
    expect(QUOTE_MINT_ADDRESSES.has(USDC)).toBe(true);
    expect(QUOTE_MINT_ADDRESSES.has(USDT)).toBe(true);
  });

  it("rejects both-stable and unrecognized-quote pairs", () => {
    const bothStable = {
      ...RAW_POOL,
      mintA: { chainId: 101, address: USDT, symbol: "USDT", name: "Tether", decimals: 6 },
    };
    const unknownQuote = {
      ...RAW_POOL,
      mintB: { chainId: 101, address: "MintDog", symbol: "DOGE", name: "Dogecoin", decimals: 8 },
    };
    expect(orientRaydiumPool(bothStable)).toBeNull();
    expect(orientRaydiumPool(unknownQuote)).toBeNull();
  });
});
