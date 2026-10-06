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
  assessFreshness,
  failedProvenance,
  liveProvenance,
  LIVE_WINDOW_MS,
  providerErrorMessage,
  validatePriceSeries,
} from "./data-quality";

export { HttpError, httpGetText, type FetchLike, type HttpResponse } from "./http";

export { RAYDIUM_API_BASE_URL } from "./raydium/api";
export {
  comparePoolsForDisplay,
  normalizeRaydiumPool,
  normalizeRaydiumSnapshot,
  orientRaydiumPool,
  QUOTE_MINT_ADDRESSES,
} from "./raydium/normalize";
export { RaydiumPoolProvider, describeFetchError, type RaydiumPoolProviderOptions } from "./raydium/pool";

export { FixturePoolProvider, fixtureTokens } from "./fixture";
export { UnavailableFundingRateProvider, UnavailableHistoricalPriceProvider } from "./stubs";
