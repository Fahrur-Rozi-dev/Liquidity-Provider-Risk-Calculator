# Math & Financial Conventions

## Price Convention
Canonical price:
P = stable token value for 1 unit of volatile token.

Example:
SOL/USDC at 150 means 1 SOL = 150 USDC.

All modules must use the same convention.

## CLMM
Use Uniswap-v3-style concentrated liquidity mathematics where applicable.

Let:
- Pa = lower price
- Pb = upper price
- P = current price
- sa = sqrt(Pa)
- sb = sqrt(Pb)
- s = sqrt(P)

For a position with liquidity L:

If P <= Pa:
amount0 = L * (sb - sa) / (sa * sb)
amount1 = 0

If Pa < P < Pb:
amount0 = L * (sb - s) / (s * sb)
amount1 = L * (s - sa)

If P >= Pb:
amount0 = 0
amount1 = L * (sb - sa)

The implementation must handle token ordering explicitly.

## Range Status
- BELOW_RANGE: P <= Pa
- IN_RANGE: Pa < P < Pb
- ABOVE_RANGE: P >= Pb

Scenario calculations may intentionally use prices outside the entry range.

## Position Creation
For a normal in-range position:
lowerPrice < entryPrice < upperPrice

If a workflow intentionally supports out-of-range entry, it must be explicit.

## HODL Benchmark
HODL means retaining the initial token quantities without LP rebalancing.

LP vs HODL must use the same scenario price.

IL is a comparison between LP value and the HODL benchmark, not a generic price loss.

## Hedge
A short hedge offsets part of the volatile-asset exposure.

Target hedge ratio is configurable.

Default dynamic hedge target:
75%

The system must support:
- fixed hedge
- dynamic hedge
- threshold-based rebalance

## Hedge Tranches
Do not erase historical short entries when resizing a hedge.

Maintain tranches with:
- entry price
- quantity
- direction
- timestamp/index
- funding
- realized PnL when reduced

Reductions use documented FIFO behavior unless a strategy explicitly specifies another method.

## Funding
Funding must be modeled separately from price PnL.

## Rebalance Costs
Track:
- trading fee
- slippage
- optional fixed cost

Do not silently fold these into price PnL.

## LVR
LVR/adverse-selection analytics must be presented as an analytical metric, not as a universal exact loss number unless the underlying data supports that precision.

## Numerical Accuracy
Use decimal-safe arithmetic. Avoid JavaScript binary floating-point for money-critical intermediate calculations.

## Assumptions
Every approximation must be labeled:
- Exact
- Provider-reported
- Estimated
- Simplified model
