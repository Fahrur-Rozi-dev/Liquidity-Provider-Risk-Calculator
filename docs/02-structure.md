# System Structure

## High-Level Architecture

Data flows from external sources toward normalized contracts, then through application orchestration into reusable domain engines and product workspaces.

```
External Public APIs
        ↓
Provider Adapters
        ↓
Normalized Data Contracts
        ↓
Application Services
        ↓
Domain Engines
        ↓
UI / Product Workspaces
```

The calculation/domain layer must not depend on React components or provider SDKs.

## Product Workspaces

Routes represent product capabilities, not roadmap phases.

```
/
/calculator
/hedge
/backtest
/pools
/analytics
/monitor
/alerts
/settings
```

Capabilities are activated and expanded across phases. A route must not be considered owned by a single phase.

## Suggested Source Tree

```
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
    scenario/
    historical/
    analytics/
    pools/
  providers/
    pool/
    market/
    historical/
    funding/
    fixtures/
  services/
  types/
  utils/
  config/

tests/
  unit/
  integration/
  fixtures/

docs/
```

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
Position valuation, HODL benchmark, IL, exposure, and scenario analysis.

### Scenario
Forward-looking what-if analysis over user-defined future prices or paths.

It answers:
- what happens if price rises/falls?
- when does the position leave range?
- how does token composition change?
- what are LP, hedge, and combined PnL outcomes?

Scenario analysis is a core product capability, not a trading strategy engine.

### Hedge
Short positions, hedge ratio, dynamic target, thresholds, tranches, funding, rebalance costs.

### Historical
Historical data analysis and sequential replay used to understand how candidate LP configurations would have behaved under past market conditions.

Historical analysis is supporting evidence, not a promise of future performance and not a trading bot.

### Pools
Provider abstraction and normalized pool snapshots.

### Analytics
LVR, volatility, range efficiency, fee/risk analysis, and comparative research.

### Realtime
Read-only live data and derived state.

### Alerts
Rules and informational recommendations based on realtime derived state.

## State Design

Do not create one giant global CalculatorState.

Prefer explicit configs:
- LPPositionConfig
- CLMMConfig
- ScenarioConfig
- HedgeConfig
- RebalanceConfig
- FeeConfig
- HistoricalAnalysisConfig
- PoolConfig
- RealtimeConfig

Compose them only where a workflow genuinely needs multiple domains.
