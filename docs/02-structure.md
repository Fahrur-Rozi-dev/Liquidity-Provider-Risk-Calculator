# System Structure

## High-Level Architecture

UI / Routes
    ↓
Application Services / View Models
    ↓
Domain Calculation Engines
    ↓
Data Providers / Historical Data / Realtime Data
    ↓
External APIs

The calculation layer must not depend on React components.

## Route Map

/
  Overview

/calculator
  Phase 1–2 manual LP + CLMM calculator

/hedge
  Phase 3 dynamic hedge

/backtest
  Phase 4 historical backtesting

/pools
  Phase 5 real pool data

/analytics
  Phase 6 advanced LP analytics

/monitor
  Phase 7 realtime monitoring

/alerts
  Phase 8 realtime intelligence and alerts

/settings
  application/provider/settings

Routes are additive. Never replace one route with another phase.

## Suggested Source Tree

src/
  app/
    page.tsx
    calculator/
    hedge/
    backtest/
    pools/
    analytics/
    monitor/
    alerts/
    settings/
  components/
    ui/
    layout/
    charts/
    domain/
  domain/
    clmm/
    lp/
    hedge/
    backtest/
    analytics/
    pools/
  providers/
    historical/
    pool/
    realtime/
  services/
  types/
  utils/
  config/

tests/
  unit/
  integration/
  fixtures/

docs/

Names may evolve when justified, but the separation of concerns must remain.

## Domain Boundaries

### CLMM
Exact concentrated-liquidity math:
- sqrt price
- liquidity
- token amounts
- range state
- position delta
- valuation

### LP
Position valuation, HODL benchmark, IL, scenario analysis.

### Hedge
Short positions, hedge ratio, dynamic target, thresholds, tranches, funding, rebalance costs.

### Backtest
Sequential historical replay. No look-ahead.

### Pools
Provider abstraction and normalized pool snapshots.

### Analytics
LVR, volatility, range efficiency, fee/risk analysis.

### Realtime
Read-only live data and derived state.

### Alerts
Rules and recommendations based on realtime derived state.

## State Design
Do not create one giant global CalculatorState.

Prefer explicit configs:
- LPPositionConfig
- CLMMConfig
- HedgeConfig
- RebalanceConfig
- FeeConfig
- BacktestConfig
- PoolConfig
- RealtimeConfig

Compose them only where a workflow genuinely needs multiple domains.
