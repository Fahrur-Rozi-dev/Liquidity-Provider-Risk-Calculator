/**
 * Data-quality helpers — docs/05-data-model.md (source, timestamps, freshness,
 * errors) and docs/10-quality-gates.md (stale data detected, errors handled,
 * estimates clearly labeled).
 */

import type { DataFreshness, DataProvenance, PricePoint } from "@/types";
import type { ProviderErrorType } from "./types";

/**
 * Raydium API v3 responses are provider-cached for 60–90 s (docs.raydium.io).
 * A 5-minute window marks data live; anything older is stale.
 */
export const LIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Freshness for a provenance block evaluated at `now`. observedAt (when the
 * data reflects the chain) is preferred over fetchedAt (when we downloaded it).
 */
export function assessFreshness(
  input: { observedAt: number | null; fetchedAt: number | null },
  now: number,
): DataFreshness {
  const observedAt = input.observedAt ?? input.fetchedAt;
  if (observedAt === null || !Number.isFinite(observedAt)) return "unavailable";
  return now - observedAt <= LIVE_WINDOW_MS ? "live" : "stale";
}

/** Provenance for a successful read at `now`. */
export function liveProvenance(source: string, now: number, estimated = false): DataProvenance {
  return {
    source,
    fetchedAt: now,
    observedAt: null,
    freshness: "live",
    estimated,
  };
}

/** Provenance for a failed read — never invents data (docs/07: don't invent protocol data). */
export function failedProvenance(source: string, now: number, error: string): DataProvenance {
  return {
    source,
    fetchedAt: now,
    observedAt: null,
    freshness: "error",
    estimated: false,
    error,
  };
}

/** Formats an expected failure as "[type] message" so provenance.error stays structured. */
export function providerErrorMessage(type: ProviderErrorType, message: string): string {
  return `[${type}] ${message}`;
}

/** Contract validation for any PricePoint[] (docs/05) — reusable across providers and imports. */
export function validatePriceSeries(points: readonly PricePoint[]): string[] {
  const errors: string[] = [];
  if (points.length === 0) {
    errors.push("Price series must contain at least one point.");
  }
  points.forEach((point, index) => {
    const label = `Point ${index + 1}`;
    if (!Number.isFinite(point.timestamp)) {
      errors.push(`${label}: timestamp must be finite epoch ms.`);
    }
    if (!Number.isFinite(point.price) || point.price <= 0) {
      errors.push(`${label}: price must be a positive finite number.`);
    }
  });
  return errors;
}
