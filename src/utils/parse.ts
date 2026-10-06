/**
 * Defensive scalar readers for normalizing untrusted provider payloads.
 * Never used for financial math — only to gate raw JSON into canonical types
 * (docs/05: normalize provider data before it reaches domain/UI layers).
 */

/** Narrow unknown to a plain object record (arrays are not records). */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Narrow unknown to a non-empty string. */
export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Narrow unknown to a finite number. */
export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
