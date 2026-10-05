import { formatCurrency, formatNumber, formatPercent, formatSigned } from "@/utils/format";

describe("formatNumber", () => {
  it("formats with fixed decimals and thousands separators", () => {
    expect(formatNumber(1234.5, 2)).toBe("1,234.50");
    expect(formatNumber(1234567.891, 2)).toBe("1,234,567.89");
  });

  it("pads decimals to the requested precision", () => {
    expect(formatNumber(0.1, 4)).toBe("0.1000");
  });

  it("formats zero and negatives", () => {
    expect(formatNumber(0, 2)).toBe("0.00");
    expect(formatNumber(-9876.543, 1)).toBe("-9,876.5");
  });

  it("renders non-finite values as an em dash", () => {
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats USD with symbol and separators", () => {
    expect(formatCurrency(-1250.75)).toBe("-$1,250.75");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("renders non-finite values as an em dash", () => {
    expect(formatCurrency(Number.NaN)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("converts fractions to percent strings", () => {
    expect(formatPercent(0.0345, 2)).toBe("3.45%");
    expect(formatPercent(1, 0)).toBe("100%");
    expect(formatPercent(-0.0025, 2)).toBe("-0.25%");
  });

  it("renders non-finite values as an em dash", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatSigned", () => {
  it("prefixes positive values with + and negatives with -", () => {
    expect(formatSigned(1234.5)).toBe("+1,234.50");
    expect(formatSigned(-1234.5)).toBe("-1,234.50");
  });

  it("renders values rounding to zero without a sign", () => {
    expect(formatSigned(0)).toBe("0.00");
    expect(formatSigned(-0.001, 2)).toBe("0.00");
    expect(formatSigned(0.001, 2)).toBe("0.00");
  });

  it("renders non-finite values as an em dash", () => {
    expect(formatSigned(Number.NaN)).toBe("—");
  });
});
