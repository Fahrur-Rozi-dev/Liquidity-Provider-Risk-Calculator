import { PricePoint, MarketDataSummary } from "@/types";

export interface ParsedCSVResult {
  data: PricePoint[];
  summary: MarketDataSummary;
  warnings: string[];
}

export function parseHistoricalCSV(csvText: string): ParsedCSVResult {
  const lines = csvText.split('\n');
  const data: PricePoint[] = [];
  const warnings: string[] = [];

  let invalidRows = 0;
  let duplicateRows = 0;

  if (lines.length === 0) {
    warnings.push("CSV is empty");
    return { data: [], summary: getEmptySummary(), warnings };
  }

  const headerRaw = lines[0].toLowerCase();
  const hasHeader = headerRaw.includes('timestamp') || headerRaw.includes('price');

  let headerMap: Record<string, number> = {
    timestamp: 0,
    price: 1,
    volume: -1,
    fundingrate: -1
  };

  if (hasHeader) {
    const headers = headerRaw.split(',').map(s => s.trim());
    headerMap.timestamp = headers.indexOf('timestamp');
    headerMap.price = headers.indexOf('price');
    headerMap.volume = headers.indexOf('volume');

    // Find funding rate header flexibly
    const fundingIdx = headers.findIndex(h => h.includes('funding'));
    headerMap.fundingrate = fundingIdx;

    if (headerMap.timestamp === -1 || headerMap.price === -1) {
      warnings.push("Missing required columns 'timestamp' or 'price'. Assuming column 0 is timestamp and 1 is price.");
      headerMap = { timestamp: 0, price: 1, volume: 2, fundingrate: 3 };
    }
  }

  const startIndex = hasHeader ? 1 : 0;
  const seenTimestamps = new Set<number>();

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');

    const timestampStr = cols[headerMap.timestamp];
    const priceStr = cols[headerMap.price];

    if (!timestampStr || !priceStr) {
      invalidRows++;
      continue;
    }

    const timestamp = parseInt(timestampStr, 10);
    const price = parseFloat(priceStr);

    if (isNaN(timestamp) || isNaN(price) || price <= 0) {
      invalidRows++;
      continue;
    }

    if (seenTimestamps.has(timestamp)) {
      duplicateRows++;
      continue;
    }
    seenTimestamps.add(timestamp);

    const point: PricePoint = { timestamp, price };

    if (headerMap.volume !== -1 && cols[headerMap.volume]) {
      const vol = parseFloat(cols[headerMap.volume]);
      if (!isNaN(vol) && vol >= 0) point.volume = vol;
    }

    if (headerMap.fundingrate !== -1 && cols[headerMap.fundingrate]) {
      const funding = parseFloat(cols[headerMap.fundingrate]);
      if (!isNaN(funding)) point.fundingRate = funding;
    }

    data.push(point);
  }

  // Chronological sort ascending
  data.sort((a, b) => a.timestamp - b.timestamp);

  if (data.length === 0) {
    warnings.push("No valid data rows parsed.");
    return { data: [], summary: getEmptySummary(), warnings };
  }

  // Interval detection
  let interval = 'IRREGULAR_INTERVAL';
  if (data.length > 1) {
    const diffs = new Map<number, number>();
    for (let i = 1; i < Math.min(100, data.length); i++) {
      const diff = data[i].timestamp - data[i-1].timestamp;
      diffs.set(diff, (diffs.get(diff) || 0) + 1);
    }

    // Find most common diff
    let maxCount = 0;
    let commonDiff = 0;
    diffs.forEach((count, diff) => {
      if (count > maxCount) {
        maxCount = count;
        commonDiff = diff;
      }
    });

    if (maxCount / Math.min(100, data.length - 1) > 0.8) { // 80% consistency
      if (commonDiff === 60000) interval = '1 minute';
      else if (commonDiff === 300000) interval = '5 minutes';
      else if (commonDiff === 3600000) interval = '1 hour';
      else if (commonDiff === 14400000) interval = '4 hours';
      else if (commonDiff === 86400000) interval = '1 day';
      else interval = `${commonDiff} ms`;
    }
  }

  const prices = data.map(d => d.price);

  const summary: MarketDataSummary = {
    totalRows: lines.length - (hasHeader ? 1 : 0),
    validRows: data.length,
    invalidRows,
    duplicateRows,
    firstTimestamp: data[0].timestamp,
    lastTimestamp: data[data.length - 1].timestamp,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    interval
  };

  return { data, summary, warnings };
}

function getEmptySummary(): MarketDataSummary {
  return {
    totalRows: 0, validRows: 0, invalidRows: 0, duplicateRows: 0,
    firstTimestamp: 0, lastTimestamp: 0, minPrice: 0, maxPrice: 0,
    interval: 'IRREGULAR_INTERVAL'
  };
}
