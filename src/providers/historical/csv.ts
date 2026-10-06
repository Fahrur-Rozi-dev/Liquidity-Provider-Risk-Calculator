/**
 * Historical CSV import (Phase 3, docs/06: "historical price/pool data
 * contract"; consumed by the Phase 5 backtest).
 *
 * Strict format (produced by tools like Coingecko/GeckoTerminal CSV exports
 * after reorientation, or maintained manually):
 *
 *   timestamp,price
 *   1726272000000,150.25
 *   1726275600000,149.9
 *
 * Contract (docs/05): canonical price = stable per 1 volatile; timestamps in
 * epoch ms; every row validated. Import NEVER fabricates or repairs data —
 * malformed files are rejected with all errors listed (docs/07). Sorting,
 * deduplication and look-ahead guarantees are the Phase 5 replay engine's
 * documented responsibilities on top of this contract.
 */

import type { PricePoint } from "@/types";
import { validatePriceSeries } from "@/providers/data-quality";

export const CSV_HEADER = "timestamp,price";
const EXPECTED_COLUMNS = 2;

/** Formats the one error line for a CSV row (1-based, including header). */
function rowError(lineNumber: number, message: string): string {
  return `CSV line ${lineNumber}: ${message}.`;
}

/**
 * Parses CSV text into a validated PricePoint[] (source = "csv-import",
 * quality = "provider-reported" until proven exact). Returns ALL validation
 * errors instead of the first one, for quick source-file repair.
 */
export function parseHistoricalPriceCsv(text: string): { points: PricePoint[]; errors: string[] } {
  const errors: string[] = [];
  const points: PricePoint[] = [];

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { points, errors: ["CSV import requires at least a header line and one data row."] };
  }

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  if (header.length !== EXPECTED_COLUMNS || header[0] !== "timestamp" || header[1] !== "price") {
    return {
      points,
      errors: [`CSV header must be exactly "${CSV_HEADER}" (found: "${lines[0].trim()}").`],
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(",").map((cell) => cell.trim());
    if (cells.length !== EXPECTED_COLUMNS) {
      errors.push(rowError(i + 1, `expected ${EXPECTED_COLUMNS} columns, found ${cells.length}`));
      continue;
    }
    const timestamp = Number(cells[0]);
    const price = Number(cells[1]);
    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      errors.push(rowError(i + 1, "timestamp must be a positive epoch-ms integer"));
      continue;
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(rowError(i + 1, "price must be a positive finite number"));
      continue;
    }
    points.push({ timestamp, price, source: "csv-import", quality: "provider-reported" });
  }

  errors.push(...validatePriceSeries(points));
  return { points, errors };
}
