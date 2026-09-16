export type PathMode = 'MANUAL' | 'PERCENTAGE' | 'TREND_UP' | 'TREND_DOWN' | 'MEAN_REVERSION' | 'VOLATILE';

export function generatePricePath(mode: PathMode, startPrice: number, steps: number, rawInput: string = ""): number[] {
  const path: number[] = [];
  let currentPrice = startPrice;

  if (mode === 'MANUAL') {
    return rawInput.split('\n')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
  }

  if (mode === 'PERCENTAGE') {
    const percentages = rawInput.split('\n')
      .map(s => parseFloat(s.replace('%', '').trim()))
      .filter(n => !isNaN(n));

    percentages.forEach(pct => {
      currentPrice = currentPrice * (1 + pct / 100);
      path.push(currentPrice);
    });
    return path;
  }

  // Pre-sets (ignoring exact step count for these fixed shape arrays, could interpolate but simple fixed paths is enough)
  if (mode === 'TREND_UP') {
    return [105, 110, 115, 120, 125, 130, 140, 150];
  }

  if (mode === 'TREND_DOWN') {
    return [95, 90, 85, 80, 75, 70, 60, 50];
  }

  if (mode === 'MEAN_REVERSION') {
    return [110, 120, 110, 100, 90, 80, 90, 100];
  }

  if (mode === 'VOLATILE') {
    return [115, 95, 125, 85, 110, 90, 105, 100];
  }

  return path;
}
