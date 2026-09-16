import Decimal from "decimal.js";

export type ModelType = 'simplified' | 'clmm';

export type RangeStatus = 'BELOW_RANGE' | 'IN_RANGE' | 'ABOVE_RANGE';

export interface CalculatorState {
  modelType: ModelType;

  pairName: string;
  totalCapital: number;

  // Used in simplified
  volatileAllocation: number; // Percentage (e.g., 50 for 50%)
  stableAllocation: number; // Percentage (e.g., 50 for 50%)

  // Common
  entryPrice: number;

  // Used in CLMM
  lowerPrice: number;
  upperPrice: number;

  // Hedge
  hedgeRatio: number; // Percentage (e.g., 75 for 75%)
  shortEntryPrice: number;
  isAutoShortNotional: boolean;
  manualShortNotional: number;

  // Costs
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

  // CLMM Specific
  liquidity?: Decimal;
  amountUSDC?: Decimal;
  hodlValue?: Decimal;
  ilUSD?: Decimal;
  ilPercent?: Decimal;
  rangeStatus?: RangeStatus;
  lpDelta?: Decimal;
  initialVolatileQuantity?: Decimal;
  initialStableQuantity?: Decimal;
  volatileAllocationPercent?: Decimal;
  stableAllocationPercent?: Decimal;
}

export interface HedgeResult {
  shortNotional: Decimal;
  shortPnL: Decimal;
  effectiveHedgeRatio: Decimal; // Can be 0 if unhedged or division by zero prevented
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

  // Benchmark
  hodlPnL?: Decimal;
  hodlPlusHedgePnL?: Decimal;
}

export interface ScenarioRow {
  priceChangePercent: number;
  targetPrice: number;
  assetValue: number;
  assetPnL: number;
  shortPnL: number;
  effectiveHedgeRatio: number; // 0 instead of null for easy rendering, UI checks
  fees: number;
  costs: number;
  netPnL: number;

  // CLMM specific
  amountSOL?: number;
  amountUSDC?: number;
  lpValue?: number;
  hodlValue?: number;
  hodlPnL?: number;
  ilUSD?: number;
  ilPercent?: number;
  lpDelta?: number;
  netDelta?: number;
  rangeStatus?: RangeStatus;
  totalPnLAfterCosts?: number; // combined + fees - costs
}
