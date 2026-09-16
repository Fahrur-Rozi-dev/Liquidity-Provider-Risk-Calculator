import Decimal from "decimal.js";

export interface CalculatorState {
  pairName: string;
  totalCapital: number;
  volatileAllocation: number; // Percentage (e.g., 50 for 50%)
  stableAllocation: number; // Percentage (e.g., 50 for 50%)
  entryPrice: number;

  hedgeRatio: number; // Percentage (e.g., 75 for 75%)
  shortEntryPrice: number;
  isAutoShortNotional: boolean;
  manualShortNotional: number;

  lpFeeIncome: number;
  fundingCost: number; // Positive is cost, negative is income

  openShortCost: number;
  closeShortCost: number;
  rebalanceCost: number;

  targetPrice: number;
}

export interface LPResult {
  initialVolatileValue: Decimal;
  initialStableValue: Decimal;
  volatileQuantity: Decimal;
  currentVolatileValue: Decimal;
  lpValue: Decimal;
  assetPnL: Decimal;
}

export interface HedgeResult {
  shortNotional: Decimal;
  shortPnL: Decimal;
  effectiveHedgeRatio: Decimal;
  netDirectionalExposure: Decimal;
}

export interface TotalResult {
  lpResult: LPResult;
  hedgeResult: HedgeResult;
  lpFees: Decimal;
  funding: Decimal;
  tradingCosts: Decimal;
  netPnL: Decimal;
  netPnLPercentage: Decimal;
}

export interface ScenarioRow {
  priceChangePercent: number;
  targetPrice: number;
  assetValue: number;
  assetPnL: number;
  shortPnL: number;
  effectiveHedgeRatio: number;
  fees: number;
  costs: number;
  netPnL: number;
}
