/**
 * Raydium CLMM adapter — normalization (Phase 3, docs/06).
 *
 * Maps verified raw Raydium API v3 pool entries to the canonical @/types
 * contracts: stable identity (PoolMetadata) separated from observations
 * (PoolSnapshot), per updated docs/05. Orientation rule (docs/04/docs/05):
 * canonical price is stable per volatile. Raydium entries report
 * price = value of 1 mintA in mintB, so:
 *  - mintB recognized as a quote/stable asset AND mintA not also stable:
 *      canonical orientation as reported (token0 = mintA, token1 = mintB).
 *  - otherwise the pair is REJECTED (no silent price re-orientation, no
 *    unstable quote assumptions) — a documented, deliberate limitation.
 *
 * No domain calculations happen here: only normalization and rejection
 * (docs/06: provider adapters must stay outside the domain layer).
 */

import type { PoolId, PoolMetadata, PoolSnapshot, Token } from "@/types";
import { okQuality, unavailableQuality } from "@/providers/data-quality";
import type { RaydiumPool } from "./api";

/** Chain ids that map to canonical ChainId values. */
const CHAIN_ID_MAINNET_SOLANA = 101;

/** Mint addresses recognized as stable/quote assets (Solana mainnet). */
export const QUOTE_MINT_ADDRESSES: ReadonlySet<string> = new Set([
  // USDC
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  // USDS
  "USDSfrmfJv4jpQKSD1A7s4UxyDiAf8cvVW3B8pP9w2S",
  // PYUSD
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
  // USDe
  "5we7sQQKssGmzh2DtXZrWzXyP9DQVXcL1Ycsz7V3GTVk",
]);

function chainIdToChain(chainId: number): string | null {
  return chainId === CHAIN_ID_MAINNET_SOLANA ? "solana" : null;
}

function toToken(mint: RaydiumPool["mintA"]): Token | null {
  const chainName = chainIdToChain(mint.chainId);
  if (!chainName) return null;
  return {
    symbol: mint.symbol,
    decimals: mint.decimals,
    address: mint.address,
    chain: chainName,
  };
}

/** Canonical stable pool key: protocol:chain:address (docs/05 PoolId). */
export function poolKeyOf(protocol: string, chain: string, address: string): string {
  return `${protocol}:${chain}:${address}`;
}

/**
 * Orientation check for a raw pool. Returns null when the pair cannot be
 * expressed in the canonical stable-per-volatile orientation without
 * assumptions (either side not a recognized quote asset, or both stable).
 */
export function orientRaydiumPool(
  pool: RaydiumPool,
): { volatile: RaydiumPool["mintA"]; quote: RaydiumPool["mintB"] } | null {
  const quoteIsRecognized = QUOTE_MINT_ADDRESSES.has(pool.mintB.address);
  const baseIsQuote = QUOTE_MINT_ADDRESSES.has(pool.mintA.address);
  if (baseIsQuote || !quoteIsRecognized) return null;
  return { volatile: pool.mintA, quote: pool.mintB };
}

/**
 * Normalizes one raw Raydium pool to the canonical stable contracts.
 * Returns null when the pool cannot be oriented or is off-chain-id.
 */
export function normalizeRaydiumMetadata(raw: RaydiumPool): PoolMetadata | null {
  const oriented = orientRaydiumPool(raw);
  if (!oriented) return null;
  const chain = chainIdToChain(raw.mintA.chainId);
  if (!chain) return null;

  const token0 = toToken(oriented.volatile);
  const token1 = toToken(oriented.quote);
  if (!token0 || !token1) return null;

  const id: PoolId = { protocol: "raydium", chain, address: raw.id };
  return {
    id,
    key: poolKeyOf("raydium", chain, raw.id),
    poolType: "clmm",
    token0,
    token1,
    // As reported by the adapter's fee-tier normalization: fraction per swap.
    feeTier: raw.feeRate,
    source: "raydium-api-v3",
  };
}

/**
 * Builds a fresh snapshot observation from the same raw entry (single fetch,
 * two contracts). Snapshot quality is canonical-fresh (docs/05); the caller
 * layers transport failures on top.
 */
export function normalizeRaydiumSnapshot(raw: RaydiumPool, now: number): PoolSnapshot | null {
  const metadata = normalizeRaydiumMetadata(raw);
  if (!metadata) return null;
  return {
    poolId: metadata.id,
    poolKey: metadata.key,
    // Raydium serves provider-cached aggregates without per-pool observation
    // times; observedAt stays null rather than pretending freshness.
    observedAt: null,
    price: raw.price,
    // Raw CLMM liquidity is pool-type specific; null means "not normalized",
    // never zero (docs/05 Unknown vs Zero).
    liquidity: null,
    tvlUsd: raw.tvl,
    volume24hUsd: raw.day?.volume ?? null,
    fees24hUsd: raw.day?.volumeFee ?? null,
    feeTier: raw.feeRate,
    quality: okQuality(metadata.source, now),
  };
}

/**
 * Builds an unavailable-quality placeholder observation for a known pool —
 * used by fixture providers, which are not realtime sources (docs/09:
 * fixtures never present themselves as live).
 */
export function fixtureSnapshotQuality(source: string): ReturnType<typeof unavailableQuality> {
  return unavailableQuality(
    source,
    "Deterministic fixture data — not a realtime observation; values are static.",
  );
}

/** Stable pool ordering for deterministic discovery results (symbol, then key). */
export function compareMetadataForDisplay(a: PoolMetadata, b: PoolMetadata): number {
  const symbolA = `${a.token0.symbol}/${a.token1.symbol}`;
  const symbolB = `${b.token0.symbol}/${b.token1.symbol}`;
  if (symbolA !== symbolB) return symbolA.localeCompare(symbolB);
  return a.key.localeCompare(b.key);
}
