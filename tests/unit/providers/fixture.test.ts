import type { PoolDataProvider } from "@/providers/types";
import { FixturePoolProvider } from "@/providers/fixture";

/**
 * Fixture provider tests: deterministic data through the same PoolDataProvider
 * interface and the same normalization path as the production Raydium adapter
 * (docs/06). Fixtures are never presented as live observations (docs/05/09).
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

describe("FixturePoolProvider.discoverPools", () => {
  it("returns deterministic, canonically oriented CLMM pool metadata", async () => {
    const result = await makeProvider().discoverPools();
    expect(result.data).not.toBeNull();
    expect(result.data!.map((m) => `${m.token0.symbol}/${m.token1.symbol}`)).toEqual([
      "SOL/USDC",
      "JUP/USDC",
      "BONK/USDC",
    ]);
    for (const metadata of result.data!) {
      expect(metadata.poolType).toBe("clmm");
      expect(metadata.token1.address).toBe(USDC);
      // Canonical key: protocol:chain:address (docs/05 PoolId).
      expect(metadata.key).toBe(`raydium:solana:${metadata.id.address}`);
      expect(metadata.source).toBe("raydium-api-v3");
    }
  });

  it("never claims live quality (fixtures are not realtime observations)", async () => {
    const result = await makeProvider().discoverPools();
    expect(result.quality.status).toBe("unavailable");
    expect(result.quality.source).toBe("fixture");
    expect(result.quality.fetchedAt).toBeNull();
    expect(result.quality.warnings.length).toBeGreaterThan(0);
  });

  it("is deterministic across calls", async () => {
    const a = await makeProvider().discoverPools();
    const b = await makeProvider().discoverPools();
    expect(a.data).toEqual(b.data);
  });
});

describe("FixturePoolProvider.getPoolMetadata", () => {
  it("returns stable metadata for a known fixture pool key", async () => {
    const result = await makeProvider().getPoolMetadata("raydium:solana:fixture-sol-usdc");
    expect(result.data).not.toBeNull();
    expect(result.data!.token0.symbol).toBe("SOL");
    expect(result.data!.token1.symbol).toBe("USDC");
    expect(result.data!.feeTier).toBeCloseTo(0.0025, 9);
    expect(result.quality.status).toBe("unavailable");
  });

  it("reports unknown keys as validation errors without inventing metadata", async () => {
    const result = await makeProvider().getPoolMetadata("nope");
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[validation] Pool nope not found in fixtures.");
  });
});

describe("FixturePoolProvider.getPoolSnapshot", () => {
  it("returns a normalized snapshot for a known fixture pool", async () => {
    const result = await makeProvider().getPoolSnapshot("fixture-sol-usdc");
    expect(result.data).not.toBeNull();
    expect(result.data!.price).toBeCloseTo(150.25, 9);
    expect(result.data!.feeTier).toBeCloseTo(0.0025, 9);
    expect(result.data!.liquidity).toBeNull(); // unknown stays null, never zero
    expect(result.data!.quality.status).toBe("unavailable");
    expect(result.data!.quality.source).toBe("fixture");
    expect(result.data!.poolKey).toBe("raydium:solana:fixture-sol-usdc");
  });

  it("reports unknown ids as validation errors without inventing data", async () => {
    const result = await makeProvider().getPoolSnapshot("nope");
    expect(result.data).toBeNull();
    expect(result.quality.status).toBe("error");
    expect(result.quality.error).toBe("[validation] Pool nope not found in fixtures.");
  });
});
