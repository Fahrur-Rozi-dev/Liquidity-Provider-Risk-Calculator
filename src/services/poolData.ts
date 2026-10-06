/**
 * Pool data application service (Phase 3, docs/06 "calculator integration").
 *
 * Composition + selection + orientation only — all price math still lives in
 * the domain engines (docs/02, docs/06: no workspace implements its own
 * competing version of a domain calculation). Adapters never leak here:
 * inputs are the shared provider contracts.
 */

import type { Pool, PoolSnapshot } from "@/types";
import type { PoolDataProvider, PoolQuery, ProviderResult } from "@/providers/types";

/** Normalized pool discovered by a provider, plus orientation provenance. */
export interface DiscoveredPool {
  pool: Pool;
  /** Canonical orientation of the pool (docs/04: stable per 1 volatile). */
  orientation: "stable-per-volatile";
}

/** A discovered pool ready to seed the calculator inputs. */
export interface PoolSelection {
  pool: Pool;
  /** Token0 (volatile) symbol, e.g. "SOL". */
  volatileSymbol: string;
  /** Token1 (stable) symbol, e.g. "USDC". */
  stableSymbol: string;
  /** Canonical entry price: stable per 1 volatile. */
  entryPrice: number;
  feeRate: number;
  tvlUsd: number | null;
  source: string;
}

/**
 * Deterministic pool selection: highest TVL among normalized CLMM pools.
 * Pure and synchronous — selection logic stays independent of any provider.
 */
export function selectPrimaryPool(pools: readonly DiscoveredPool[]): DiscoveredPool | null {
  let best: DiscoveredPool | null = null;
  let bestTvl = -Infinity;
  for (const candidate of pools) {
    const tvl = candidate.pool.tvlUsd;
    if (tvl === null) continue;
    if (best === null || tvl > bestTvl) {
      best = candidate;
      bestTvl = tvl;
    }
  }
  return best;
}

/** Projects a canonical Pool into a calculator-ready PoolSelection. */
export function toPoolSelection(pool: Pool): PoolSelection {
  return {
    pool,
    volatileSymbol: pool.token0.symbol,
    stableSymbol: pool.token1.symbol,
    entryPrice: pool.currentPrice,
    feeRate: pool.feeRate,
    tvlUsd: pool.tvlUsd,
    source: pool.source,
  };
}

/** Discovers normalized pools through a provider (adapters stay invisible). */
export async function discoverPools(
  provider: PoolDataProvider,
  query: PoolQuery = {},
): Promise<ProviderResult<DiscoveredPool[]>> {
  const result = await provider.searchPools(query);
  if (result.data === null) {
    return { data: null, provenance: result.provenance };
  }
  const discovered = result.data
    .filter((pool) => pool.poolType === "clmm")
    .map((pool) => ({ pool, orientation: "stable-per-volatile" as const }));
  return { data: discovered, provenance: result.provenance };
}

/**
 * Loads a snapshot for a pool the user explicitly selected by id.
 * The pool must be known from discovery first (no provider-side id guessing).
 */
export async function loadPoolSnapshot(
  provider: PoolDataProvider,
  poolId: string,
): Promise<ProviderResult<PoolSnapshot>> {
  return provider.getPoolSnapshot(poolId);
}
