/**
 * Display formatting helpers for the UI layer.
 *
 * These are presentation-only utilities (Intl-based) and are NOT used for
 * money-critical intermediate calculations. Financial engines must use
 * decimal-safe arithmetic (docs/04-math-and-finance.md) — never these.
 * Non-finite inputs render as an em dash instead of "NaN"/"Infinity".
 */

function fixedFormatter(decimals: number): Intl.NumberFormat {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Fixed-decimal number with US thousands separators, e.g. 1234.5 -> "1,234.50". */
export function formatNumber(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return "—";
  return fixedFormatter(decimals).format(value);
}

/** Currency value, e.g. -1250.75 -> "-$1,250.75" (USD default). */
export function formatCurrency(value: number, currency: string = "USD", decimals: number = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Fraction -> percent string, e.g. 0.0345 -> "3.45%". */
export function formatPercent(fraction: number, decimals: number = 2): string {
  if (!Number.isFinite(fraction)) return "—";
  return `${fixedFormatter(decimals).format(fraction * 100)}%`;
}

/**
 * Signed display value: positive gets "+", negative gets "-", zero is unsigned.
 * Sign is taken from the value rounded to `decimals`, so -0.001 at 2 decimals
 * renders as "0.00", not "-0.00".
 */
export function formatSigned(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return "—";
  const factor = 10 ** decimals;
  const roundedMagnitude = Math.round(Math.abs(value) * factor) / factor;
  const magnitude = fixedFormatter(decimals).format(roundedMagnitude);
  if (roundedMagnitude === 0) return magnitude;
  return value < 0 ? `-${magnitude}` : `+${magnitude}`;
}
