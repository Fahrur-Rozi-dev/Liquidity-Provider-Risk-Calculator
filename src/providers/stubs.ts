/**
 * Explicit "not connected yet" provider stubs (Phase 3, docs/06).
 *
 * The historical and funding provider CONTRACTS exist now (docs/06: establish
 * the interface and data contract early); their real implementations arrive
 * with the phases that consume them (Phase 5 backtest, Phase 4+ funding).
 * The stubs never fabricate data (docs/07) — every call returns data: null
 * with an explicit canonical quality error (docs/05 DataQuality).
 */

import type { DataQuality, FundingRatePoint, PricePoint } from "@/types";
import { providerErrorMessage } from "@/providers/data-quality";
import type {
  FundingRateProvider,
  HistoricalPriceProvider,
  ProviderResult,
} from "@/providers/types";

function unavailable(source: string, message: string): DataQuality {
  return {
    status: "unavailable",
    source,
    fetchedAt: null,
    observedAt: null,
    warnings: [],
    estimated: false,
    error: message,
  };
}

export class UnavailableHistoricalPriceProvider implements HistoricalPriceProvider {
  readonly id = "unavailable";
  readonly label = "Historical data not connected yet (Phase 5)";

  async getHistory(): Promise<ProviderResult<PricePoint[]>> {
    return {
      data: null,
      quality: unavailable(
        this.id,
        providerErrorMessage(
          "validation",
          "No historical provider is connected yet; the historical price contract is established in Phase 3 and implemented in Phase 5.",
        ),
      ),
    };
  }
}

export class UnavailableFundingRateProvider implements FundingRateProvider {
  readonly id = "unavailable";
  readonly label = "Funding data not connected yet (Phase 4+)";

  async getFundingRate(symbol: string): Promise<ProviderResult<FundingRatePoint>> {
    return {
      data: null,
      quality: unavailable(
        this.id,
        providerErrorMessage(
          "validation",
          `No funding provider is connected yet for ${symbol}; funding stays a separate model from price PnL (docs/04).`,
        ),
      ),
    };
  }
}
