import Decimal from "decimal.js";

export type ModelType = 'simplified' | 'clmm';
export type RangeStatus = 'BELOW_RANGE' | 'IN_RANGE' | 'ABOVE_RANGE';
export type HedgeStrategyMode = "FIXED" | "DYNAMIC" | "THRESHOLD";

// --- Phase 4 Types: Data ---
export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
  fundingRate?: number;
}

export interface FundingPoint {
  timestamp: number;
  rate: Decimal;
}

export type FeeModelType = 'MANUAL' | 'ESTIMATED';
export type IntervalType = 'IRREGULAR_INTERVAL' | string;

export interface MarketDataSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  firstTimestamp: number;
  lastTimestamp: number;
  minPrice: number;
  maxPrice: number;
  interval: IntervalType;
}

// --- Phase 3 & 4 Types: Engine ---

export interface HedgeTranche {
  id: string;
  entryPrice: Decimal;
  notional: Decimal;
  openedAtStep: number;
}

export interface RebalanceEvent {
  timestamp: number;
  price: Decimal;
  previousShortNotional: Decimal;
  targetShortNotional: Decimal;
  hedgeAdjustment: Decimal;
  previousHedgeRatio: Decimal;
  newHedgeRatio: Decimal;
  tradingCost: Decimal;
  slippageCost: Decimal;
  gasCost: Decimal;
  realizedPnL: Decimal;
}

export interface SimulationSnapshot {
  stepIndex: number;
  timestamp: number;
  price: number;

  amountSOL: number;
  amountUSDC: number;
  lpValue: number;
  lpPnL: number;
  hodlValue: number;
  hodlPnL: number;
  ilUSD: number;
  ilPercent: number;

  shortNotional: number;
  shortPnL: number;
  effectiveHedgeRatio: number | null;
  targetHedgeRatio: number;
  netDeltaUSD: number;
  netDeltaPercent: number;

  rebalanceTriggered: boolean;
  hedgeAdjustment: number;
  rebalanceCost: number;
  slippageCost: number;
  gasCost: number;

  fundingCost: number;
  feeIncome: number;

  combinedPnL: number;
  cumulativePnL: number;
  equity: number;
}

export interface BacktestMetrics {
  // Config
  initialCapital: number;

  // Return
  finalEquity: number;
  totalReturnPercent: number;
  annualizedReturnPercent: number | null;

  // PnL Breakdown
  lpPnL: number;
  shortPnL: number;
  feeIncome: number;
  fundingPaid: number;
  rebalanceFees: number;
  slippage: number;
  gasCosts: number;
  totalHedgeTradingCosts: number;
  combinedPnL: number;

  // Risk & Drawdown
  maxDrawdownUSD: number;
  maxDrawdownPercent: number;
  volatilityAnnualized: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  winRatePercent: number;

  // Exposure & Range
  timeInRangePercent: number;
  timeBelowRangePercent: number;
  timeAboveRangePercent: number;
  avgHedgeRatio: number;
  minHedgeRatio: number;
  maxHedgeRatio: number;
  maxAbsNetDelta: number;
  numberOfRangeEntries: number;

  // IL & Rebalance
  initialIL: number;
  minILPercent: number;
  maxILPercent: number;
  finalILPercent: number;
  avgILPercent: number;

  numberOfRebalances: number;
  totalHedgeNotionalTraded: number;
  turnover: number;
}

export interface SimulationResult {
  snapshots: SimulationSnapshot[];
  events: RebalanceEvent[];
  metrics: BacktestMetrics;
  warnings: string[];
}

// --- Combined State ---
export interface CalculatorState {
  fundingCost: number;
  openShortCost: number;
  closeShortCost: number;
  rebalanceCost: number;
  modelType: ModelType;
  pairName: string;
  totalCapital: number;

  volatileAllocation: number;
  stableAllocation: number;

  entryPrice: number;
  lowerPrice: number;
  upperPrice: number;

  hedgeRatio: number;
  shortEntryPrice: number;
  isAutoShortNotional: boolean;
  manualShortNotional: number;

  targetPrice: number;

  strategyMode: HedgeStrategyMode;
  targetHedgeRatio: number;
  rebalanceLowerThreshold: number;
  rebalanceUpperThreshold: number;
  minimumRebalanceNotional: number;
  rebalanceCooldownSteps: number;

  // Costs & Funding
  rebalanceFeeRate: number;
  slippageRate: number;
  gasCostPerRebalance: number;

  feeModelType: FeeModelType;
  lpFeeIncome: number; // Manual
  poolFeeRate: number; // Estimated
  estimatedLPShare: number; // Estimated

  fundingRatePerStep: number;

  // Phase 4 Historical Path
  startDate?: number;
  endDate?: number;
  historicalData: PricePoint[];
  simulationPath: number[]; // fallback for Phase 3 simple logic
}

// --- Existing Phase 1/2 Types ---
export interface LPResult {
  initialVolatileValue: Decimal;
  initialStableValue: Decimal;
  volatileQuantity: Decimal;
  currentVolatileValue: Decimal;
  lpValue: Decimal;
  assetPnL: Decimal;
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
  hodlPnL?: Decimal;
  hodlPlusHedgePnL?: Decimal;
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
  totalPnLAfterCosts?: number;
}
