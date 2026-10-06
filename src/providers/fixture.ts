/**
 * Deterministic fixture pool provider (Phase 3, docs/06 "deterministic fixture
 * provider using the same contracts").
 *
 * Implements the SAME PoolDataProvider interface as the production Raydium
 * adapter and flows its raw entries through the SAME normalization path —
 * one data contract, one calculation path, no parallel model (docs/06, docs/12).
 * Used for offline development and deterministic tests. Contains no
 * calculation logic.
 *
 * Freshness is intentionally "unavailable" ("No live data"): fixtures are not
 * realtime observations and must never present themselves as live (docs/09).
 */

import type { Pool, PoolSnapshot, Token } from "@/types";
import { providerErrorMessage } from "@/providers/data-quality";
import type { PoolQuery, ProviderResult } from "@/providers/types";
import type { RaydiumPool } from "@/providers/raydium/api";
import {
  comparePoolsForDisplay,
  normalizeRaydiumPool,
  normalizeRaydiumSnapshot,
} from "@/providers/raydium/normalize";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

function mint(
  address: string,
  symbol: string,
  name: string,
  decimals: number,
): RaydiumPool["mintA"] {
  return { address, symbol, name, decimals, chainId: 101 };
}

/** Raw entries in the exact shape the Raydium API serves, for one normalization path. */
const FIXTURE_RAW_POOLS: readonly RaydiumPool[] = [
  {
    id: "fixture-sol-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(SOL_MINT, "SOL", "Solana", 9),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 150.25,
    feeRate: 0.0025,
    tvl: 82_400_000,
    mintAmountA: 190_000,
    mintAmountB: 41_600_000,
    day: { volume: 45_200_000, volumeFee: 113_000, feeApr: 0.05 },
    config: { tickSpacing: 60 },
  },
  {
    id: "fixture-jup-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(JUP_MINT, "JUP", "Jupiter", 6),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 0.812,
    feeRate: 0.001,
    tvl: 12_800_000,
    mintAmountA: 9_600_000,
    mintAmountB: 8_900_000,
    day: { volume: 3_100_000, volumeFee: 3_100, feeApr: 0.088 },
    config: { tickSpacing: 60 },
  },
  {
    id: "fixture-bonk-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(BONK_MINT, "BONK", "Bonk", 5),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 0.0000215,
    feeRate: 0.0001,
    tvl: 9_600_000,
    mintAmountA: 148_000_000_000_000,
    mintAmountB: 3_600_000,
    day: { volume: 12_400_000, volumeFee: 1_240, feeApr: 0.047 },
    config: { tickSpacing: 20 },
  },
];

function fixtureProvenance(now: number): ProviderResult<never>["provenance"] {
  return {
    source: "fixture",
    fetchedAt: now,
    observedAt: null,
    freshness: "unavailable",
    estimated: false,
  };
}

/** Applies the shared PoolQuery filters to normalized fixture pools. */
function applyQuery(pools: readonly Pool[], query: PoolQuery = {}): Pool[] {
  let result = [...pools];
  if (query.poolType) {
    result = result.filter((pool) => pool.poolType === query.poolType);
  }
  if (query.minTvlUsd !== undefined) {
    result = result.filter((pool) => pool.tvlUsd !== null && pool.tvlUsd >= (query.minTvlUsd as number));
  }
  if (query.search) {
    const needle = query.search.trim().toLowerCase();
    if (needle.length > 0) {
      result = result.filter((pool) =>
        [
          pool.token0.symbol,
          pool.token1.symbol,
          pool.token0.address,
          pool.token1.address,
          pool.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
  }
  result.sort(comparePoolsForDisplay);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  return result.slice(0, limit);
}

export class FixturePoolProvider {
  readonly id = "fixture";
  readonly label = "Deterministic fixture (offline)";

  async searchPools(query: PoolQuery = {}): Promise<ProviderResult<Pool[]>> {
    const now = Date.now();
    const normalized = FIXTURE_RAW_POOLS.map((raw) => normalizeRaydiumPool(raw)).filter(
      (pool): pool is Pool => pool !== null,
    );
    if (normalized.length !== FIXTURE_RAW_POOLS.length) {
      // A fixture failing canonical normalization is a developer error, not a data error.
      return {
        data: null,
        provenance: {
          ...fixtureProvenance(now),
          freshness: "error",
          error: providerErrorMessage("validation", "Fixture entry failed canonical normalization."),
        },
      };
    }
    return { data: applyQuery(normalized, query), provenance: fixtureProvenance(now) };
  }

  async getPoolSnapshot(poolId: string): Promise<ProviderResult<PoolSnapshot>> {
    const now = Date.now();
    const raw = FIXTURE_RAW_POOLS.find((entry) => entry.id === poolId);
    if (!raw) {
      return {
        data: null,
        provenance: {
          ...fixtureProvenance(now),
          freshness: "error",
          error: providerErrorMessage("validation", `Pool ${poolId} not found in fixtures.`),
        },
      };
    }
    const snapshot = normalizeRaydiumSnapshot(raw);
    if (!snapshot) {
      return {
        data: null,
        provenance: {
          ...fixtureProvenance(now),
          freshness: "error",
          error: providerErrorMessage("validation", `Pool ${poolId} failed canonical normalization.`),
        },
      };
    }
    return { data: snapshot, provenance: fixtureProvenance(now) };
  }
}

/** Fixture token metadata export for tests/docs (derived from the raw entries). */
export function fixtureTokens(): Token[] {
  return FIXTURE_RAW_POOLS.flatMap((raw) => [
    { symbol: raw.mintA.symbol, decimals: raw.mintA.decimals, address: raw.mintA.address, chain: "solana" },
    { symbol: raw.mintB.symbol, decimals: raw.mintB.decimals, address: raw.mintB.address, chain: "solana" },
  ]);
}
