import type { PoolDataProvider, PoolQuery } from "@/providers/types";
import { FixturePoolProvider } from "@/providers/fixture";

/**
 * Fixture provider tests: deterministic data through the same interface and
 * normalization path as the production Raydium adapter (docs/06).
 */

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function makeProvider() {
  return new FixturePoolProvider();
}

describe("FixturePoolProvider contract", () => {
  it("implements the same PoolDataProvider interface as production adapters", () => {
    const provider: PoolDataProvider = makeProvider();
    expect(provider.id).toBe("fixture");
  });
});

describe("FixturePoolProvider.searchPools", () => {
  it("returns deterministic, canonically oriented CLMM pools", async () => {
    const result = await makeProvider().searchPools();
    expect(result.data).not.toBeNull();
    expect(result.data!.map((d) => `${d.token0.symbol}/${d.token1.symbol}`)).toEqual([
      "BONK/USDC",
      "JUP/USDC",
      "SOL/USDC",
    ]);
    for (const pool of result.data!) {
      expect(pool.poolType).toBe("clmm");
      expect(pool.token1.address).toBe(USDC);
    }
  });

  it("never claims live freshness (fixtures are not realtime observations)", async () => {
    const result = await makeProvider().searchPools();
    expect(result.provenance.freshness).toBe("unavailable");
    expect(result.provenance.source).toBe("fixture");
  });

  it("applies the poolType filter", async () => {
    const clmm = await makeProvider().searchPools({ poolType: "clmm" });
    const dlmm = await makeProvider().searchPools({ poolType: "dlmm" });
    expect(clmm.data!.length).toBe(3);
    expect(dlmm.data!.length).toBe(0);
  });

  it("applies the minTvlUsd filter (excluding unknown-TVL pools)", async () => {
    const result = await makeProvider().searchPools({ minTvlUsd: 20_000_000 });
    expect(result.data!.map((d) => d.token0.symbol)).toEqual(["SOL"]);
  });

  it("applies case-insensitive search across symbols/addresses/id", async () => {
    const bySymbol = await makeProvider().searchPools({ search: "sol" });
    const byAddress = await makeProvider().searchPools({ search: "So11111111111111111111111111111111111111112" });
    const byId = await makeProvider().searchPools({ search: "FIXTURE-JUP" });
    expect(bySymbol.data!.map((d) => d.token0.symbol)).toEqual(["SOL"]);
    expect(byAddress.data!.map((d) => d.token0.symbol)).toEqual(["SOL"]);
    expect(byId.data!.map((d) => d.token0.symbol)).toEqual(["JUP"]);
  });

  it("applies the limit after sorting", async () => {
    const result = await makeProvider().searchPools({ limit: 2 });
    expect(result.data!.length).toBe(2);
    expect(result.data![0].token0.symbol).toBe("BONK");
  });

  it("is deterministic across calls", async () => {
    const a = await makeProvider().searchPools();
    const b = await makeProvider().searchPools();
    expect(a.data).toEqual(b.data);
  });
});

describe("FixturePoolProvider.getPoolSnapshot", () => {
  it("returns a normalized snapshot for a known fixture pool", async () => {
    const result = await makeProvider().getPoolSnapshot("fixture-sol-usdc");
    expect(result.data).not.toBeNull();
    expect(result.data!.price).toBeCloseTo(150.25, 9);
    expect(result.data!.feeRate).toBeCloseTo(0.0025, 9);
    expect(result.data!.estimated).toBe(false);
    expect(result.provenance.freshness).toBe("unavailable");
  });

  it("reports unknown ids as validation errors without inventing data", async () => {
    const result = await makeProvider().getPoolSnapshot("nope");
    expect(result.data).toBeNull();
    expect(result.provenance.freshness).toBe("error");
    expect(result.provenance.error).toBe("[validation] Pool nope not found in fixtures.");
  });
});

describe("PoolQuery defaults", () => {
  it("accepts an empty query", async () => {
    const query: PoolQuery = {};
    const result = await makeProvider().searchPools(query);
    expect(result.data!.length).toBe(3);
  });
});
