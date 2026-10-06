import {
  assessFreshness,
  failedProvenance,
  liveProvenance,
  LIVE_WINDOW_MS,
  providerErrorMessage,
  validatePriceSeries,
} from "@/providers/data-quality";
import { CSV_HEADER, parseHistoricalPriceCsv } from "@/providers/historical/csv";
import type { PricePoint } from "@/types";

describe("assessFreshness", () => {
  const now = 1_000_000;

  it("marks data within the live window as live", () => {
    expect(assessFreshness({ observedAt: now - LIVE_WINDOW_MS / 2, fetchedAt: null }, now)).toBe("live");
  });

  it("marks data older than the window as stale", () => {
    expect(assessFreshness({ observedAt: now - LIVE_WINDOW_MS - 1, fetchedAt: null }, now)).toBe("stale");
  });

  it("prefers observedAt over fetchedAt", () => {
    const observedAt = now - LIVE_WINDOW_MS - 1; // stale
    const fetchedAt = now - 1; // would be live
    expect(assessFreshness({ observedAt, fetchedAt }, now)).toBe("stale");
  });

  it("falls back to fetchedAt when observedAt is null", () => {
    expect(assessFreshness({ observedAt: null, fetchedAt: now - 1 }, now)).toBe("live");
  });

  it("is unavailable without any timestamps", () => {
    expect(assessFreshness({ observedAt: null, fetchedAt: null }, now)).toBe("unavailable");
  });

  it("treats non-finite timestamps as unavailable", () => {
    expect(assessFreshness({ observedAt: Number.NaN, fetchedAt: null }, now)).toBe("unavailable");
  });
});

describe("provenance factories", () => {
  it("liveProvenance records the source and time as live", () => {
    const provenance = liveProvenance("raydium-api-v3", 123);
    expect(provenance).toEqual({
      source: "raydium-api-v3",
      fetchedAt: 123,
      observedAt: null,
      freshness: "live",
      estimated: false,
    });
  });

  it("failedProvenance marks freshness error with the message", () => {
    const provenance = failedProvenance("src", 5, "[network] boom");
    expect(provenance.freshness).toBe("error");
    expect(provenance.error).toBe("[network] boom");
    expect(provenance.estimated).toBe(false);
  });
});

describe("providerErrorMessage", () => {
  it("formats typed failures as [type] message", () => {
    expect(providerErrorMessage("validation", "bad payload")).toBe("[validation] bad payload");
    expect(providerErrorMessage("http", "HTTP 429")).toBe("[http] HTTP 429");
    expect(providerErrorMessage("network", "timed out")).toBe("[network] timed out");
  });
});

describe("validatePriceSeries", () => {
  const valid: PricePoint[] = [
    { timestamp: 1, price: 100, source: "csv-import", quality: "provider-reported" },
    { timestamp: 2, price: 101.5, source: "csv-import", quality: "provider-reported" },
  ];

  it("accepts a valid series", () => {
    expect(validatePriceSeries(valid)).toEqual([]);
  });

  it("requires at least one point", () => {
    expect(validatePriceSeries([])).toEqual(["Price series must contain at least one point."]);
  });

  it("rejects non-positive and non-finite prices with the row index", () => {
    const errors = validatePriceSeries([
      { timestamp: 1, price: 0, source: "x", quality: "provider-reported" },
      { timestamp: 2, price: Number.POSITIVE_INFINITY, source: "x", quality: "provider-reported" },
    ]);
    expect(errors).toEqual([
      "Point 1: price must be a positive finite number.",
      "Point 2: price must be a positive finite number.",
    ]);
  });

  it("rejects non-finite timestamps", () => {
    const errors = validatePriceSeries([{ timestamp: Number.NaN, price: 5, source: "x", quality: "provider-reported" }]);
    expect(errors).toEqual(["Point 1: timestamp must be finite epoch ms."]);
  });
});

describe("parseHistoricalPriceCsv", () => {
  it("parses a valid file with the exact header", () => {
    const csv = `${CSV_HEADER}\n1726272000000,150.25\n1726275600000,149.9\n`;
    const { points, errors } = parseHistoricalPriceCsv(csv);
    expect(errors).toEqual([]);
    expect(points).toEqual([
      { timestamp: 1726272000000, price: 150.25, source: "csv-import", quality: "provider-reported" },
      { timestamp: 1726275600000, price: 149.9, source: "csv-import", quality: "provider-reported" },
    ]);
  });

  it("accepts CRLF line endings", () => {
    const csv = `${CSV_HEADER}\r\n1000,1.5\r\n2000,2.5\r\n`;
    const { points, errors } = parseHistoricalPriceCsv(csv);
    expect(errors).toEqual([]);
    expect(points.length).toBe(2);
  });

  it("rejects a wrong header with the expected format", () => {
    const { points, errors } = parseHistoricalPriceCsv("time,value\n1,2\n");
    expect(points).toEqual([]);
    expect(errors).toEqual(['CSV header must be exactly "timestamp,price" (found: "time,value").']);
  });

  it("rejects an empty file", () => {
    const { errors } = parseHistoricalPriceCsv("   \n");
    expect(errors).toEqual(["CSV import requires at least a header line and one data row."]);
  });

  it("reports every bad row instead of stopping at the first", () => {
    const csv = `${CSV_HEADER}\nabc,1\n2000,0\n3000,-5\n4000,not-a-price\n5000,2,3\n`;
    const { points, errors } = parseHistoricalPriceCsv(csv);
    expect(points).toEqual([]);
    expect(errors).toEqual([
      "CSV line 2: timestamp must be a positive epoch-ms integer.",
      "CSV line 3: price must be a positive finite number.",
      "CSV line 4: price must be a positive finite number.",
      "CSV line 5: price must be a positive finite number.",
      "CSV line 6: expected 2 columns, found 3.",
      "Price series must contain at least one point.",
    ]);
  });

  it("keeps valid rows among invalid ones and still lists the errors", () => {
    const csv = `${CSV_HEADER}\n1000,10\n2000,zero\n3000,30\n`;
    const { points, errors } = parseHistoricalPriceCsv(csv);
    expect(points.map((p) => p.timestamp)).toEqual([1000, 3000]);
    expect(errors).toEqual(["CSV line 3: price must be a positive finite number."]);
  });
});
