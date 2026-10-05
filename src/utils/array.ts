/**
 * Generic array helpers. Pure and deterministic; no financial logic.
 */

/**
 * Evenly spaced values from min to max (inclusive), length = count.
 * Used to generate scenario price ladders for the calculator.
 */
export function linspace(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new RangeError("linspace bounds must be finite numbers");
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError("linspace count must be an integer >= 2");
  }
  if (max < min) {
    throw new RangeError("linspace max must be >= min");
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}
