# Realtime & Security Boundaries

## Product Boundary

Realtime functionality is strictly read-only.

Allowed:
- fetch public market data
- fetch public pool data
- fetch funding rates
- fetch public historical/realtime metrics
- calculate simulated LP state
- calculate simulated hedge state
- generate alerts
- generate analysis
- generate recommendations

Forbidden:
- wallet connection
- wallet discovery
- private keys
- seed phrases
- transaction signing
- order placement
- order cancellation
- deposits
- withdrawals
- adding/removing liquidity
- automatic LP rebalance
- automatic hedge execution
- autonomous trading

## Provider Interfaces

Read-only providers may expose methods such as:
- getPrice
- getPool
- getPoolSnapshot
- getFundingRate
- getHistory

Do NOT create interfaces containing:
- placeOrder
- cancelOrder
- signTransaction
- addLiquidity
- removeLiquidity
- rebalancePosition
- withdraw
- deposit

## Alerts
Alerts may say:
- "LP is near lower bound"
- "Residual delta exceeds target"
- "Funding cost increased"
- "Pool data is stale"
- "Estimated fee yield deteriorated"

Alerts must not execute the suggested action.

## AI Layer
AI may explain and recommend.
AI must not control execution.

## Data Freshness
Every realtime view should expose:
- last update time
- source
- freshness status
- provider error if applicable

Never present stale data as live.
