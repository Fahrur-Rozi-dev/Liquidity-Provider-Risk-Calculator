import Decimal from "decimal.js";

export type ModelType = 'simplified' | 'clmm';
export type RangeStatus = 'BELOW_RANGE' | 'IN_RANGE' | 'ABOVE_RANGE';

// --- Phase 3 Types ---

export type HedgeStrategyMode = "FIXED" | "DYNAMIC" | "THRESHOLD";

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
  realizedPnL: Decimal;
}

export interface SimulationSnapshot {
  stepIndex: number;
  price: number;

  // LP
  amountSOL: number;
  amountUSDC: number;
  lpValue: number;
  lpPnL: number;
  hodlValue: number;
  ilUSD: number;

  // Hedge
  shortNotional: number;
  shortPnL: number;
  effectiveHedgeRatio: number | null;
  targetHedgeRatio: number;
  netDeltaUSD: number;
  netDeltaPercent: number;

  // Rebalance
  rebalanceTriggered: boolean;
  hedgeAdjustment: number;
  rebalanceCost: number;
  slippageCost: number;

  // Funding
  fundingCost: number;

  // Combined
  combinedPnL: number;
  cumulativePnL: number;
}

export interface SimulationMetrics {
  // LP Metrics
  initialCapital: number;
  finalLpValue: number;
  lpPnL: number;
  hodlValue: number;
  ilUSD: number;

  // Hedge Metrics
  initialShort: number;
  finalShort: number;
  totalShortPnL: number;
  realizedShortPnL: number;
  unrealizedShortPnL: number;
  avgHedgeRatio: number;
  minHedgeRatio: number;
  maxHedgeRatio: number;

  // Cost Metrics
  totalFundingPaid: number;
  totalRebalanceFees: number;
  totalSlippage: number;
  totalHedgeTradingCosts: number;

  // Risk Metrics
  maxAbsNetDelta: number;
  maxPositiveNetDelta: number;
  maxNegativeNetDelta: number;
  maxHedgeError: number;
  numberOfRebalances: number;
  totalNotionalTraded: number;

  // Combined Metrics
  combinedPnL: number;
  totalNetPnL: number; // combinedPnL + lpFees - funding - tradingCosts
}

export interface SimulationResult {
  snapshots: SimulationSnapshot[];
  events: RebalanceEvent[];
  metrics: SimulationMetrics;
}

// --- Combined State ---
export interface CalculatorState {
  modelType: ModelType;
  pairName: string;
  totalCapital: number;
  volatileAllocation: number;
  stableAllocation: number;
  entryPrice: number;
  lowerPrice: number;
  upperPrice: number;

  // Base Hedge
  hedgeRatio: number;
  shortEntryPrice: number;
  isAutoShortNotional: boolean;
  manualShortNotional: number;

  // Base Costs
  lpFeeIncome: number;
  fundingCost: number;
  openShortCost: number;
  closeShortCost: number;
  rebalanceCost: number;

  // Single step target
  targetPrice: number;

  // --- Phase 3 Strategy Config ---
  strategyMode: HedgeStrategyMode;
  targetHedgeRatio: number; // Phase 3 target
  rebalanceLowerThreshold: number; // e.g. 60
  rebalanceUpperThreshold: number; // e.g. 90
  minimumRebalanceNotional: number; // e.g. 5
  rebalanceCooldownSteps: number;

  // Phase 3 Costs
  rebalanceFeeRate: number; // e.g. 0.05
  slippageRate: number; // e.g. 0.05
  fundingRatePerStep: number; // e.g. 0.01

  // Phase 3 Path
  simulationPath: number[];
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
