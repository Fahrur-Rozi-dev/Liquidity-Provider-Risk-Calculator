/**
 * Raydium CLMM adapter — normalization (Phase 3, docs/06).
 *
 * Maps verified raw Raydium API v3 pool entries to the canonical @/types
 * contracts. Orientation rule (docs/04/docs/05): canonical price is stable
 * per volatile. Raydium entries report price = value of 1 mintA in mintB, so:
 *  - mintB recognized as a quote/stable asset AND mintA not also stable:
 *      canonical orientation as reported (token0 = mintA, token1 = mintB).
 *  - otherwise the pair is REJECTED (no silent price re-orientation, no
 *    unstable quote assumptions) — a documented, deliberate limitation.
 *
 * No domain calculations happen here: only normalization and rejection
 * (docs/06: provider adapters must stay outside the domain layer).
 */

import type { Pool, PoolSnapshot, Token } from "@/types";
import type { RaydiumPool } from "./api";

/** Chain ids that map to canonical ChainId values. */
const CHAIN_ID_MAINNET_SOLANA = 101;

/** Mint addresses recognized as stable/quote assets (Solana mainnet). */
export const QUOTE_MINT_ADDRESSES: ReadonlySet<string> = new Set([
  // USDC
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  // USDS (formerly USDH)
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

/** Normalizes one raw Raydium pool to the canonical Pool contract. */
export function normalizeRaydiumPool(raw: RaydiumPool): Pool | null {
  const oriented = orientRaydiumPool(raw);
  if (!oriented) return null;
  const chain = chainIdToChain(raw.mintA.chainId);
  if (!chain) return null;

  const token0 = toToken(oriented.volatile);
  const token1 = toToken(oriented.quote);
  if (!token0 || !token1) return null;

  return {
    id: raw.id,
    address: raw.id,
    protocol: "raydium",
    chain,
    poolType: "clmm",
    token0,
    token1,
    feeRate: raw.feeRate,
    // As reported: value of 1 token0 in token1 = stable per volatile.
    currentPrice: raw.price,
    liquidity: null,
    tvlUsd: raw.tvl,
    volume24hUsd: raw.day?.volume ?? null,
    fees24hUsd: raw.day?.volumeFee ?? null,
    // Raydium serves cached aggregates without per-pool observation times.
    observedAt: null,
    source: "raydium-api-v3",
  };
}

/** Builds a fresh snapshot from the same raw entry (single fetch, two contracts). */
export function normalizeRaydiumSnapshot(raw: RaydiumPool): PoolSnapshot | null {
  const pool = normalizeRaydiumPool(raw);
  if (!pool) return null;
  return {
    timestamp: Date.now(),
    price: pool.currentPrice,
    tvlUsd: pool.tvlUsd,
    liquidity: null,
    volume24hUsd: pool.volume24hUsd,
    fees24hUsd: pool.fees24hUsd,
    feeRate: pool.feeRate,
    source: pool.source,
    estimated: false,
  };
}

/** Stable pool ordering for deterministic discovery results (symbol, then id). */
export function comparePoolsForDisplay(a: Pool, b: Pool): number {
  const symbolA = `${a.token0.symbol}/${a.token1.symbol}`;
  const symbolB = `${b.token0.symbol}/${b.token1.symbol}`;
  if (symbolA !== symbolB) return symbolA.localeCompare(symbolB);
  return a.id.localeCompare(b.id);
}
