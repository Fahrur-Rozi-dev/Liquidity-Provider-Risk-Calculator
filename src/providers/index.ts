/**
 * Provider layer barrel (Phase 3, docs/06 Production Data Foundation).
 * Contracts, the Raydium CLMM adapter, deterministic fixtures, and data-quality
 * helpers — all read-only (docs/09-realtime-boundaries.md).
 */

export type {
  FundingRateProvider,
  HistoricalPriceProvider,
  HistoryQuery,
  PoolDataProvider,
  PoolQuery,
  ProviderErrorType,
  ProviderResult,
} from "./types";

export {
  assessQuality,
  errorQuality,
  LIVE_WINDOW_MS,
  observationQuality,
  okQuality,
  providerErrorMessage,
  unavailableQuality,
  validatePriceSeries,
} from "./data-quality";

export { HttpError, httpGetText, type FetchLike, type HttpResponse, clearHttpCache } from "./http";

export { RAYDIUM_API_BASE_URL } from "./raydium/api";
export {
  compareMetadataForDisplay,
  normalizeRaydiumMetadata,
  normalizeRaydiumSnapshot,
  orientRaydiumPool,
  poolKeyOf,
  QUOTE_MINT_ADDRESSES,
} from "./raydium/normalize";
export { RAYDIUM_SOURCE, RaydiumPoolProvider, type RaydiumPoolProviderOptions } from "./raydium/pool";

export { FixturePoolProvider } from "./fixture";
export { UnavailableFundingRateProvider, UnavailableHistoricalPriceProvider } from "./stubs";
