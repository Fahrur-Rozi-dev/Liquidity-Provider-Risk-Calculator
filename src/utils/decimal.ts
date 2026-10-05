import Decimal from "decimal.js";

/**
 * Shared decimal-safe guard for engine inputs (AGENTS.md: decimal-safe
 * arithmetic for financial calculations). Throws RangeError on invalid input —
 * callers should validate user-facing configs first via their validate helpers.
 */
export function requirePositive(value: number, name: string): Decimal {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
  const d = new Decimal(value);
  // Decimal.isPositive() is sign-based: it returns true for +0, so zero must
  // be rejected explicitly.
  if (d.isZero() || !d.isPositive()) {
    throw new RangeError(`${name} must be positive`);
  }
  return d;
}
