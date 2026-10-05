/**
 * Core domain contracts — docs/05-data-model.md.
 *
 * These are explicit domain types only; no calculations live here.
 * Every numeric price uses the canonical convention:
 *   stable-token value per 1 unit of volatile token (docs/04-math-and-finance.md).
 *   Example: SOL/USDC at 150 means 1 SOL = 150 USDC.
 */

/** Canonical internal price convention. All modules must use it. */
export const PRICE_CONVENTION = "stable-per-volatile" as const;

export type ChainId = string;

export interface Token {
  symbol: string;
  decimals: number;
  address: string;
  chain: ChainId;
}

export type PoolType = "clmm" | "dlmm" | "amm";

export type ProtocolId = string;

export interface Pool {
  id: string;
  address: string;
  protocol: ProtocolId;
  chain: ChainId;
  poolType: PoolType;
  /** volatile token (price numerator) */
  token0: Token;
  /** stable / quote token (price denominator) */
  token1: Token;
  /** normalized fraction, e.g. 0.0004 = 0.04% */
  feeRate: number;
  /** stable per 1 volatile */
  currentPrice: number;
  /** provider-reported liquidity; null when unavailable (pool-type dependent) */
  liquidity: number | null;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  fees24hUsd: number | null;
  /** epoch ms — when the snapshot reflects the chain */
  observedAt: number | null;
  source: string;
}

export interface LPPosition {
  /** Pool id or manual pool identifier */
  poolRef: string;
  /** stable per 1 volatile */
  lowerPrice: number;
  /** stable per 1 volatile, must be > lowerPrice */
  upperPrice: number;
  /** stable per 1 volatile at position creation */
  entryPrice: number;
  /** in-range liquidity L when known; null when derived from initial amounts */
  liquidityL: number | null;
  /** initial volatile-token (token0) amount, when position defined by amounts */
  initialAmountVolatile: number | null;
  /** initial stable-token (token1) amount, when position defined by amounts */
  initialAmountStable: number | null;
  /** currency used for valuation, e.g. "USDC" */
  valuationCurrency: string;
  /** epoch ms */
  createdAt: number;
}

export type HedgeMode = "none" | "fixed" | "dynamic";

export interface HedgeTranche {
  id: string;
  direction: "short";
  /** stable per 1 volatile at entry */
  entryPrice: number;
  /** original quantity in volatile units */
  quantity: number;
  /** volatile units still open after FIFO reductions */
  remainingQuantity: number;
  /** epoch ms or sequence index of the opening event */
  openedAt: number;
  /** cumulative funding per unit accrued on this tranche */
  accumulatedFundingPerUnit: number;
  /** realized PnL booked when this tranche was reduced */
  realizedPnl: number;
}

export interface HedgePosition {
  mode: HedgeMode;
  /** 0..1 — dynamic target defaults to 0.75 (docs/04-math-and-finance.md) */
  targetRatio: number;
  /** current short notional, stable units */
  currentNotional: number;
  tranches: HedgeTranche[];
  /** cumulative funding paid/received, kept separate from price PnL */
  accumulatedFunding: number;
  /** rebalance costs (fee + slippage + fixed), kept separate from price PnL */
  accumulatedRebalanceCosts: number;
}

export type DataQualityLabel = "exact" | "provider-reported" | "estimated" | "simplified";

export interface PricePoint {
  /** epoch ms */
  timestamp: number;
  /** stable per 1 volatile */
  price: number;
  source: string;
  quality: DataQualityLabel;
}

export interface PoolSnapshot {
  /** epoch ms */
  timestamp: number;
  /** stable per 1 volatile */
  price: number;
  tvlUsd: number | null;
  liquidity: number | null;
  volume24hUsd: number | null;
  fees24hUsd: number | null;
  feeRate: number;
  source: string;
  estimated: boolean;
}

/** Realtime freshness states surfaced by every realtime view (docs/03-design.md). */
export type DataFreshness = "live" | "updating" | "stale" | "error" | "unavailable";

/** Provenance block every external dataset should carry (docs/05-data-model.md). */
export interface DataProvenance {
  source: string;
  fetchedAt: number | null;
  observedAt: number | null;
  freshness: DataFreshness;
  estimated: boolean;
  error?: string;
}
