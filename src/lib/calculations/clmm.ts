import Decimal from "decimal.js";
import { LPResult, RangeStatus } from "@/types";

/**
 * Gets the token amounts (amountSOL, amountUSDC) given Liquidity L, range, and current price.
 */
export function getPositionAtPrice(
  liquidity: Decimal,
  lowerPrice: Decimal,
  upperPrice: Decimal,
  currentPrice: Decimal
) {
  const sqrtP = currentPrice.sqrt();
  const sqrtPa = lowerPrice.sqrt();
  const sqrtPb = upperPrice.sqrt();

  let amountSOL = new Decimal(0);
  let amountUSDC = new Decimal(0);
  let status: RangeStatus = 'IN_RANGE';

  if (currentPrice.lte(lowerPrice)) {
    // CASE A: Price Below Range
    // amountSOL = L * (sqrt(Pb) - sqrt(Pa)) / (sqrt(Pa) * sqrt(Pb))
    status = 'BELOW_RANGE';
    amountSOL = liquidity.mul(sqrtPb.minus(sqrtPa)).div(sqrtPa.mul(sqrtPb));
    amountUSDC = new Decimal(0);
  } else if (currentPrice.gte(upperPrice)) {
    // CASE C: Price Above Range
    // amountUSDC = L * (sqrt(Pb) - sqrt(Pa))
    status = 'ABOVE_RANGE';
    amountSOL = new Decimal(0);
    amountUSDC = liquidity.mul(sqrtPb.minus(sqrtPa));
  } else {
    // CASE B: Price Inside Range
    // amountSOL = L * (sqrt(Pb) - sqrt(P)) / (sqrt(P) * sqrt(Pb))
    // amountUSDC = L * (sqrt(P) - sqrt(Pa))
    status = 'IN_RANGE';
    amountSOL = liquidity.mul(sqrtPb.minus(sqrtP)).div(sqrtP.mul(sqrtPb));
    amountUSDC = liquidity.mul(sqrtP.minus(sqrtPa));
  }

  const solValue = amountSOL.mul(currentPrice);
  const usdcValue = amountUSDC;
  const totalValue = solValue.plus(usdcValue);

  return {
    sqrtP,
    amountSOL,
    amountUSDC,
    solValue,
    usdcValue,
    totalValue,
    status
  };
}

/**
 * Determines Liquidity L from a given initial capital amount at the entry price.
 * Solves: positionValue(entryPrice, L) = initialCapital
 */
export function calculateLiquidityFromCapital(
  capital: number | Decimal,
  entryPrice: number | Decimal,
  lowerPrice: number | Decimal,
  upperPrice: number | Decimal
) {
  const cap = new Decimal(capital);
  const entryP = new Decimal(entryPrice);
  const lowP = new Decimal(lowerPrice);
  const upP = new Decimal(upperPrice);

  const sqrtP = entryP.sqrt();
  const sqrtPa = lowP.sqrt();
  const sqrtPb = upP.sqrt();

  // Find L for 1 unit of liquidity to get proportion
  let solPerL = new Decimal(0);
  let usdcPerL = new Decimal(0);

  if (entryP.lte(lowP)) {
    solPerL = sqrtPb.minus(sqrtPa).div(sqrtPa.mul(sqrtPb));
  } else if (entryP.gte(upP)) {
    usdcPerL = sqrtPb.minus(sqrtPa);
  } else {
    solPerL = sqrtPb.minus(sqrtP).div(sqrtP.mul(sqrtPb));
    usdcPerL = sqrtP.minus(sqrtPa);
  }

  const valuePerL = solPerL.mul(entryP).plus(usdcPerL);

  // L = capital / valuePerL
  // Prevent division by zero if bounds are invalid (handled by validation elsewhere but good to safeguard)
  const liquidity = valuePerL.isZero() ? new Decimal(0) : cap.div(valuePerL);

  const initialAmountSOL = liquidity.mul(solPerL);
  const initialAmountUSDC = liquidity.mul(usdcPerL);

  const initialSolValue = initialAmountSOL.mul(entryP);
  const initialUsdcValue = initialAmountUSDC;

  const solAllocationPercent = cap.isZero() ? new Decimal(0) : initialSolValue.div(cap).mul(100);
  const usdcAllocationPercent = cap.isZero() ? new Decimal(0) : initialUsdcValue.div(cap).mul(100);

  return {
    liquidity,
    initialAmountSOL,
    initialAmountUSDC,
    initialSolValue,
    initialUsdcValue,
    solAllocationPercent,
    usdcAllocationPercent,
  };
}

/**
 * Main calculation for CLMM LP position.
 * Replaces Phase 1 simplified calculation when modelType = 'clmm'.
 */
export function calculateCLMM(
  totalCapital: number | Decimal,
  entryPrice: number | Decimal,
  lowerPrice: number | Decimal,
  upperPrice: number | Decimal,
  targetPrice: number | Decimal
): LPResult {
  const init = calculateLiquidityFromCapital(totalCapital, entryPrice, lowerPrice, upperPrice);
  const current = getPositionAtPrice(init.liquidity, new Decimal(lowerPrice), new Decimal(upperPrice), new Decimal(targetPrice));

  // HODL Benchmark at target price
  // hodlValue = initialSOL * targetPrice + initialUSDC
  const tPrice = new Decimal(targetPrice);
  const hodlValue = init.initialAmountSOL.mul(tPrice).plus(init.initialAmountUSDC);

  // Impermanent Loss
  const ilUSD = current.totalValue.minus(hodlValue);
  const ilPercent = hodlValue.isZero() ? new Decimal(0) : current.totalValue.div(hodlValue).minus(1).mul(100);

  // LP PnL relative to initial capital
  const assetPnL = current.totalValue.minus(new Decimal(totalCapital));

  // LP Delta (approximate instantaneous USD exposure to SOL)
  const lpDelta = current.amountSOL.mul(tPrice);

  return {
    initialVolatileValue: init.initialSolValue,
    initialStableValue: init.initialUsdcValue,
    volatileQuantity: current.amountSOL, // Current inventory of SOL
    currentVolatileValue: current.solValue, // Current USD value of SOL
    lpValue: current.totalValue,
    assetPnL,

    // CLMM specific fields
    liquidity: init.liquidity,
    amountUSDC: current.amountUSDC,
    hodlValue,
    ilUSD,
    ilPercent,
    rangeStatus: current.status,
    lpDelta,

    // Initial inventory for benchmarks
    initialVolatileQuantity: init.initialAmountSOL,
    initialStableQuantity: init.initialAmountUSDC,
    volatileAllocationPercent: init.solAllocationPercent,
    stableAllocationPercent: init.usdcAllocationPercent,
  };
}
