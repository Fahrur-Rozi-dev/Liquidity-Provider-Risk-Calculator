/**
 * Data-quality helpers — docs/05-data-model.md.
 *
 * ONE canonical quality model (DataQuality) is shared by every externally
 * sourced observation; features never invent their own freshness/error
 * vocabulary. Unknown vs Zero invariant lives in the types: unavailable data
 * stays null and is flagged, never coerced to zero (docs/05, docs/06 rule 10).
 */

import type { DataQuality, DataQualityStatus, PricePoint } from "@/types";
import type { ProviderErrorType } from "./types";

/**
 * Raydium API v3 responses are provider-cached for 60–90 s (docs.raydium.io).
 * A 5-minute window marks data fresh; anything older is stale.
 */
export const LIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Canonical status for an observation evaluated at `now` (docs/05 DataQuality).
 * observedAt (when the data reflects the chain) is preferred over fetchedAt
 * (when we downloaded it).
 */
export function assessQuality(
  input: { observedAt: number | null; fetchedAt: number | null },
  now: number,
): DataQualityStatus {
  const observedAt = input.observedAt ?? input.fetchedAt;
  if (observedAt === null || !Number.isFinite(observedAt)) return "unavailable";
  return now - observedAt <= LIVE_WINDOW_MS ? "fresh" : "stale";
}

/** The canonical DataQuality block for a successful read at `now`. */
export function okQuality(source: string, now: number, warnings: readonly string[] = [], estimated = false): DataQuality {
  return {
    status: "fresh",
    source,
    observedAt: null,
    fetchedAt: now,
    warnings,
    estimated,
  };
}

/** DataQuality for a failed read — data is absent, never invented (docs/07). */
export function errorQuality(source: string, now: number, error: string): DataQuality {
  return {
    status: "error",
    source,
    observedAt: null,
    fetchedAt: now,
    warnings: [],
    estimated: false,
    error,
  };
}

/** DataQuality for sources with no realtime observation at all (fixtures, stubs). */
export function unavailableQuality(source: string, warning: string): DataQuality {
  return {
    status: "unavailable",
    source,
    observedAt: null,
    fetchedAt: null,
    warnings: [warning],
    estimated: false,
  };
}

/**
 * Builds the canonical quality block for a single observation from parts.
 * Picks fresh/stale by window, propagates partial-field warnings.
 */
export function observationQuality(
  input: { source: string; observedAt: number | null; fetchedAt: number | null },
  now: number,
  warnings: readonly string[] = [],
): DataQuality {
  const status = assessQuality(input, now);
  return {
    status: warnings.length > 0 && status === "fresh" ? "partial" : status,
    source: input.source,
    observedAt: input.observedAt,
    fetchedAt: input.fetchedAt,
    warnings,
    estimated: false,
  };
}

/** Formats an expected failure as "[type] message" so quality.error stays structured. */
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
