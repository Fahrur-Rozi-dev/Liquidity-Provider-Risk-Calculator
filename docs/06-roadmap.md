# Roadmap

## Phase 0 — Foundation
Current rebuild.

Deliver:
- project scaffold
- application shell
- routing
- design system foundations
- domain boundaries
- test infrastructure
- documentation

No advanced calculations yet unless required to prove the architecture.

## Phase 1 — Basic Calculator
Simplified LP model + basic short hedge.

Deliver:
- inputs
- scenario prices
- LP value
- hedge PnL
- combined PnL
- charts/tables

## Phase 2 — Exact CLMM
Replace simplified LP math with exact concentrated-liquidity calculations.

Deliver:
- sqrt price math
- liquidity
- token amounts
- HODL
- IL
- delta
- range status
- scenario engine

## Phase 3 — Dynamic Hedge
Deliver:
- fixed hedge
- dynamic hedge
- threshold mode
- target hedge ratio
- tranches
- FIFO reductions
- funding
- costs
- cooldown/minimum rebalance
- event log

## Phase 4 — Historical Backtest
Deliver:
- CSV/provider abstraction
- validated PricePoint series
- sequential replay
- no look-ahead
- execution convention
- fees/funding
- equity/drawdown
- Sharpe/Sortino
- benchmarks
- regime analysis
- exports

## Phase 5 — Real Pool Data
Deliver:
- provider adapters
- pool discovery
- pool detail
- normalized snapshots
- historical pool data
- fee data
- cache/rate-limit/freshness
- integration with calculator/backtest

Priority:
Raydium CLMM first.
Meteora DLMM only with protocol-specific modeling.

## Phase 6 — Advanced Analytics
Deliver:
- LVR/adverse selection
- volatility
- range efficiency
- fee vs risk
- sensitivity analysis
- comparative analytics

Do not claim a universally optimal range.

## Phase 7 — Realtime Monitoring
Realtime data only:
- price
- pool metrics
- simulated LP state
- simulated hedge state
- funding
- PnL
- alerts

NO wallet.
NO signing.
NO trade.
NO auto-rebalance.

## Phase 8 — Realtime Intelligence
AI/logic layer analyzes normalized realtime data and produces:
- risk explanations
- threshold warnings
- rebalance suggestions
- hedge suggestions
- anomaly alerts
- data-quality warnings

Suggestions are informational only.

## Critical Rule
Each phase adds routes/components/services. It must not overwrite previous phases.
