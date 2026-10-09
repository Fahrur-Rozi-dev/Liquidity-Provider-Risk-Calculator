/**
 * Provider layer contracts — docs/06-roadmap.md Phase 3, docs/05-data-model.md.
 *
 * Read-only interfaces only (docs/09-realtime-boundaries.md): providers FETCH
 * public data; they never execute, sign, or transact. Adapters normalize into
 * the canonical contracts from @/types (PoolMetadata / PoolSnapshot / PricePoint
 * / FundingRatePoint) so domain engines and workspaces never see
 * provider-specific response shapes.
 */

import type {
  DataQuality,
  FundingRatePoint,
  PoolMetadata,
  PoolSnapshot,
  PricePoint,
} from "@/types";

/** Provider-agnostic pool discovery filter (docs/05: discoverPools). */
export interface PoolQuery {
  /** Filter by canonical pool type. Default: the provider decides (Raydium adapter serves CLMM only). */
  poolType?: PoolMetadata["poolType"];
  /** Minimum TVL in quote/USD units; pools with unknown TVL are excluded when set. */
  minTvlUsd?: number;
  /** Max rows returned, 1–100 (default 20). Applied after normalization. */
  limit?: number;
  /** Case-insensitive substring over symbols, addresses and pool keys. */
  search?: string;
}

/**
 * Classification of an expected provider failure. Surfaced as
 * "[type] message" in DataQuality.error so errors stay machine-readable.
 */
export type ProviderErrorType = "network" | "http" | "validation";

/**
 * Every provider result carries normalized data plus the canonical quality
 * block. Expected failures (network/HTTP/validation) NEVER throw: data is
 * null and quality.error explains the failure (docs/05 data-quality model).
 */
export interface ProviderResult<T> {
  data: T | null;
  quality: DataQuality;
}

/**
 * Read-only pool data contract (docs/05: PoolDataProvider). Production
 * adapters (Raydium) and deterministic fixtures implement exactly this
 * interface — one data contract, one calculation path (docs/06, docs/12).
 * getPoolHistory equivalent lands with the Phase 5 historical provider.
 */
export interface PoolDataProvider {
  readonly id: string;
  readonly label: string;
  /** Normalized pool discovery (docs/05: discoverPools). */
  discoverPools(query?: PoolQuery): Promise<ProviderResult<PoolMetadata[]>>;
  /** Stable metadata for one pool (docs/05: getPoolMetadata). */
  getPoolMetadata(poolKey: string): Promise<ProviderResult<PoolMetadata>>;
  /** Fresh normalized snapshot for one pool (docs/05: getPoolSnapshot). */
  getPoolSnapshot(poolKey: string): Promise<ProviderResult<PoolSnapshot>>;
}

/** Historical price series query (docs/05 PricePoint; replay engine lands in Phase 5). */
export interface HistoryQuery {
  /** Provider-specific series identifier (e.g. pool key or dataset name). */
  sourceId: string;
}

/** Read-only historical provider contract (docs/05: getPoolHistory equivalent). */
export interface HistoricalPriceProvider {
  readonly id: string;
  readonly label: string;
  getHistory(query: HistoryQuery): Promise<ProviderResult<PricePoint[]>>;
}

/** Read-only funding provider contract (funding stays separate from price PnL, docs/04). */
export interface FundingRateProvider {
  readonly id: string;
  readonly label: string;
  getFundingRate(symbol: string): Promise<ProviderResult<FundingRatePoint>>;
}
