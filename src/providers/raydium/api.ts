/**
 * Raydium API v3 raw response shapes + JSON parser (Phase 3, docs/06).
 *
 * Provider-specific response shapes stay inside the adapter
 * (docs/05: provider SDKs never leak into domain/UI code). Shapes were
 * verified against the live mainnet API (api-v3.raydium.io) and the official
 * docs (docs.raydium.io/api-reference/api-v3/overview): envelope
 * { id, success, msg?, data } and pool entries with mintA/mintB objects,
 * price = value of 1 mintA in mintB, feeRate as a fraction, day/week windows.
 */

import { asNumber, asRecord, asString } from "@/utils/parse";

export const RAYDIUM_API_BASE_URL = "https://api-v3.raydium.io";

/** Envelope every Raydium v3 endpoint wraps its payload in. */
export interface RaydiumEnvelope<T> {
  success: boolean;
  msg?: string;
  data?: T;
}

/** Mint info embedded in pool entries (subset of fields the adapter needs). */
export interface RaydiumMint {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Solana chain id: 101 = mainnet. */
  chainId: number;
}

/** Pool entry from /pools/info/list, /pools/info/mint and /pools/info/ids. */
export interface RaydiumPool {
  id: string;
  type: string;
  programId: string;
  mintA: RaydiumMint;
  mintB: RaydiumMint;
  /** Value of 1 mintA in mintB (stable per volatile when mintB is the stable). */
  price: number;
  feeRate: number;
  tvl: number;
  mintAmountA: number;
  mintAmountB: number;
  day?: RaydiumWindow;
  config?: { tickSpacing?: number } | null;
}

export interface RaydiumWindow {
  volume?: number;
  volumeFee?: number;
  feeApr?: number;
}

/** Envelope for list endpoints: data = { count, data: RaydiumPool[], hasNextPage }. */
export interface RaydiumPoolList {
  count: number;
  data: RaydiumPool[];
  hasNextPage: boolean;
}

/** Envelope for /pools/info/ids: data is a bare pool array. */
export type RaydiumPoolArray = RaydiumPool[];

/**
 * Parses raw JSON text into an envelope. Returns null (never throws) for
 * malformed payloads; `success: false` propagates for msg-based errors.
 */
export function parseRaydiumEnvelope<T>(text: string): RaydiumEnvelope<T> | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const record = asRecord(json);
  if (!record) return null;
  const success = record.success;
  if (typeof success !== "boolean") return null;
  return {
    success,
    msg: typeof record.msg === "string" ? record.msg : undefined,
    data: record.data as T | undefined,
  };
}

/** Parses one raw mint object defensively. */
export function parseRaydiumMint(value: unknown): RaydiumMint | null {
  const record = asRecord(value);
  if (!record) return null;
  const address = asString(record.address);
  const symbol = asString(record.symbol);
  const name = asString(record.name);
  const decimals = asNumber(record.decimals);
  const chainId = asNumber(record.chainId);
  if (!address || !symbol || !name || decimals === null || chainId === null) return null;
  return { address, symbol, name, decimals, chainId };
}

/** Parses one raw pool object defensively; any missing required field rejects the entry. */
export function parseRaydiumPool(value: unknown): RaydiumPool | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const type = asString(record.type);
  const programId = asString(record.programId);
  const mintA = parseRaydiumMint(record.mintA);
  const mintB = parseRaydiumMint(record.mintB);
  const price = asNumber(record.price);
  const feeRate = asNumber(record.feeRate);
  const tvl = asNumber(record.tvl);
  const mintAmountA = asNumber(record.mintAmountA);
  const mintAmountB = asNumber(record.mintAmountB);
  if (
    !id ||
    !type ||
    !programId ||
    !mintA ||
    !mintB ||
    price === null ||
    feeRate === null ||
    tvl === null ||
    mintAmountA === null ||
    mintAmountB === null
  ) {
    return null;
  }
  const day = asRecord(record.day);
  return {
    id,
    type,
    programId,
    mintA,
    mintB,
    price,
    feeRate,
    tvl,
    mintAmountA,
    mintAmountB,
    day: day
      ? {
          volume: asNumber(day.volume) ?? undefined,
          volumeFee: asNumber(day.volumeFee) ?? undefined,
          feeApr: asNumber(day.feeApr) ?? undefined,
        }
      : undefined,
  };
}
