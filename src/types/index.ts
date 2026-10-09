/**
 * Core domain contracts — docs/05-data-model.md.
 *
 * These are explicit domain types only; no calculations live here.
 * Every numeric price uses the canonical convention:
 *   stable-token value per 1 unit of volatile token (docs/04-math-and-finance.md).
 *   Example: SOL/USDC at 150 means 1 SOL = 150 USDC.
 *
 * Data model principles (docs/05):
 *   - stable metadata (PoolId/PoolMetadata) is separated from time-varying
 *     observations (PoolSnapshot);
 *   - ONE canonical data-quality model (DataQuality) is shared by every
 *     externally sourced observation — features never invent their own
 *     freshness/error vocabulary;
 *   - Unknown vs Zero invariant: 0 means a measured/calculated zero, null
 *     means unknown or not supplied, estimates must be flagged, stale values
 *     remain known but are marked stale. Unavailable data is never silently
 *     converted to zero (docs/05, docs/06 cross-phase rule 10).
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

/** Stable pool identity (docs/05 PoolId). */
export interface PoolId {
  protocol: ProtocolId;
  chain: ChainId;
  /** On-chain pool address or provider-canonical pool identifier. */
  address: string;
}

/** Stable pool descriptor — everything that does not change block to block (docs/05 PoolMetadata). */
export interface PoolMetadata {
  id: PoolId;
  /** Unique string key within the platform (protocol:chain:address). */
  key: string;
  poolType: PoolType;
  /** volatile token (price numerator) */
  token0: Token;
  /** stable / quote token (price denominator) */
  token1: Token;
  /** normalized fee tier as a fraction, e.g. 0.0004 = 0.04% */
  feeTier: number;
  source: string;
}

/**
 * One pool observation at a point in time (docs/05 PoolSnapshot).
 * Time-varying values are `null` when the provider does not supply them —
 * never coerced to zero (docs/05 Unknown vs Zero).
 */
export interface PoolSnapshot {
  poolId: PoolId;
  /** Canonical pool key (PoolMetadata.key) for cross-referencing. */
  poolKey: string;
  /** epoch ms — when the observation reflects chain state. */
  observedAt: number | null;
  /** stable per 1 volatile */
  price: number;
  /** raw in-range liquidity when the provider exposes it; null otherwise */
  liquidity: number | null;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  fees24hUsd: number | null;
  /** fee tier as observed in this snapshot (may differ from metadata on dynamic-fee pools) */
  feeTier: number | null;
  /** Canonical quality block (docs/05 DataQuality). */
  quality: DataQuality;
}

export interface LPPosition {
  /** Pool key or manual pool identifier */
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

/**
 * Canonical status for externally sourced observations (docs/05 DataQuality).
 * One vocabulary for every feature — never a per-feature freshness model.
 *  - fresh: observed within the provider's reliable window
 *  - stale: known value, observed outside the reliable window
 *  - partial: some requested fields unavailable (nulls present)
 *  - unavailable: the data source has no value at all (e.g. fixtures, stubs)
 *  - error: the fetch/validation failed; data is absent
 */
export type DataQualityStatus = "fresh" | "stale" | "partial" | "unavailable" | "error";

/** The single canonical quality block for all externally sourced data (docs/05). */
export interface DataQuality {
  status: DataQualityStatus;
  source: string;
  /** epoch ms — when the observation reflects chain state, when known. */
  observedAt: number | null;
  /** epoch ms — when the platform downloaded the data. */
  fetchedAt: number | null;
  /** human-readable warnings (stale window, partial fields, assumptions). */
  warnings: readonly string[];
  estimated: boolean;
  /** structured error message ("[type] message") when status is "error". */
  error?: string;
}

/** DataQuality for a list payload applies to each element; partial lists carry warnings. */
export type ListDataQuality = DataQuality;

export interface PricePoint {
  /** epoch ms */
  timestamp: number;
  /** stable per 1 volatile */
  price: number;
  source: string;
  quality: DataQualityLabel;
  /** epoch ms the point reflects; defaults to the timestamp itself when identical. */
  observedAt?: number;
}

export type DataQualityLabel = "exact" | "provider-reported" | "estimated" | "simplified";

/**
 * One funding-rate observation (Phase 3 contract, docs/06). Funding stays a
 * separate model from price PnL (docs/04-math-and-finance.md); funding data is
 * read-only market information (docs/09).
 */
export interface FundingRatePoint {
  /** Underlying market symbol, e.g. "SOL-PERP". */
  symbol: string;
  /** Funding per interval as a fraction (e.g. 0.0001 = 0.01% per interval). */
  rate: number;
  interval: "1h" | "4h" | "8h" | "24h" | "unknown";
  /** epoch ms of the observation. */
  timestamp: number;
  source: string;
  quality: DataQualityLabel;
}

/** Validated historical price series (Phase 3 contract; replay lands in Phase 5). */
export interface PriceHistory {
  /** Provider- or dataset-specific series identifier. */
  sourceId: string;
  points: readonly PricePoint[];
  fetchedAt: number | null;
  interval: "unknown" | "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  quality: DataQualityLabel;
}

/** A named historical dataset imported through the validated CSV contract. */
export interface HistoricalDataset {
  id: string;
  label: string;
  /** Canonical orientation — always "stable-per-volatile" (docs/04). */
  priceConvention: typeof PRICE_CONVENTION;
  /** epoch ms when the dataset was imported. */
  createdAt: number;
  history: PriceHistory;
}
