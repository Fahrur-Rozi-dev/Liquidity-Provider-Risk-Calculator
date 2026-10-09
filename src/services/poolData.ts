/**
 * Pool data application service (Phase 3, docs/06 "calculator integration").
 *
 * Composition + selection + orientation only — all price math still lives in
 * the domain engines (docs/02, docs/06: no workspace implements its own
 * competing version of a domain calculation). Adapters never leak here:
 * inputs are the shared provider contracts.
 *
 * Metadata (stable) and snapshots (observations) are kept separate per
 * docs/05; a calculator-ready selection is the JOIN of the two.
 */

import type { PoolMetadata, PoolSnapshot } from "@/types";
import type { PoolDataProvider, PoolQuery, ProviderResult } from "@/providers/types";
import { compareMetadataForDisplay } from "@/providers/raydium/normalize";

/** Normalized pool discovered by a provider, plus orientation provenance. */
export interface DiscoveredPool {
  metadata: PoolMetadata;
  /** Canonical orientation of the pool (docs/04: stable per 1 volatile). */
  orientation: "stable-per-volatile";
}

/** A discovered pool joined with its latest snapshot — calculator-ready. */
export interface PoolSelection {
  metadata: PoolMetadata;
  /** Token0 (volatile) symbol, e.g. "SOL". */
  volatileSymbol: string;
  /** Token1 (stable) symbol, e.g. "USDC". */
  stableSymbol: string;
  /** Canonical entry price from the snapshot: stable per 1 volatile. */
  entryPrice: number;
  /** Fee tier from the snapshot when observed, else the stable metadata tier. */
  feeTier: number;
  /** Snapshot TVL; null means unknown — never zero (docs/05 Unknown vs Zero). */
  tvlUsd: number | null;
  source: string;
}

/**
 * Deterministic pool ordering for display and default selection
 * (pair symbols, then canonical key). Pure and synchronous.
 */
export function sortDiscoveredPools(pools: readonly DiscoveredPool[]): DiscoveredPool[] {
  return [...pools].sort((a, b) => compareMetadataForDisplay(a.metadata, b.metadata));
}

/**
 * Deterministic primary selection: the first pool in canonical sort order.
 * TVL-based ranking would require observations for every discovered pool;
 * providers already rank discovery by liquidity (Raydium sortType=desc).
 */
export function selectPrimaryPool(pools: readonly DiscoveredPool[]): DiscoveredPool | null {
  return sortedFirst(pools);
}

function sortedFirst(pools: readonly DiscoveredPool[]): DiscoveredPool | null {
  if (pools.length === 0) return null;
  return sortDiscoveredPools(pools)[0];
}

/** Joins metadata with a snapshot into a calculator-ready selection. */
export function toPoolSelection(metadata: PoolMetadata, snapshot: PoolSnapshot): PoolSelection {
  return {
    metadata,
    volatileSymbol: metadata.token0.symbol,
    stableSymbol: metadata.token1.symbol,
    entryPrice: snapshot.price,
    feeTier: snapshot.feeTier ?? metadata.feeTier,
    tvlUsd: snapshot.tvlUsd,
    source: metadata.source,
  };
}

/** Discovers normalized pools through a provider (adapters stay invisible). */
export async function discoverPools(
  provider: PoolDataProvider,
  query: PoolQuery = {},
): Promise<ProviderResult<DiscoveredPool[]>> {
  const result = await provider.discoverPools(query);
  if (result.data === null) {
    return { data: null, quality: result.quality };
  }
  const discovered = result.data
    .filter((metadata) => metadata.poolType === "clmm")
    .map((metadata) => ({ metadata, orientation: "stable-per-volatile" as const }));
  return { data: discovered, quality: result.quality };
}

/** Loads stable metadata for a pool the user explicitly selected (no id guessing). */
export async function loadPoolMetadata(
  provider: PoolDataProvider,
  poolKey: string,
): Promise<ProviderResult<PoolMetadata>> {
  return provider.getPoolMetadata(poolKey);
}

/** Loads a snapshot for a pool the user explicitly selected (no id guessing). */
export async function loadPoolSnapshot(
  provider: PoolDataProvider,
  poolKey: string,
): Promise<ProviderResult<PoolSnapshot>> {
  return provider.getPoolSnapshot(poolKey);
}
