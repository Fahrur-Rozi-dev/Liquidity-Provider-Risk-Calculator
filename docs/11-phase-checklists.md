# Phase Checklists

## Phase 0
- [ ] Clean repository
- [ ] AGENTS.md
- [ ] docs/
- [ ] Next.js/TypeScript scaffold
- [ ] App shell
- [ ] Route skeleton
- [ ] Domain folders
- [ ] Test setup
- [ ] CI/build validation

## Phase 1
- [ ] Basic LP inputs
- [ ] Basic hedge inputs
- [ ] Scenario prices
- [ ] LP valuation
- [ ] Hedge PnL
- [ ] Combined PnL
- [ ] Charts
- [ ] Tests

## Phase 2
- [ ] Exact CLMM formulas
- [ ] Liquidity calculation
- [ ] Token amounts
- [ ] Range status
- [ ] HODL
- [ ] IL
- [ ] Delta
- [ ] Boundary tests

## Phase 3 — Production Data Foundation
- [ ] Canonical normalized contracts
- [ ] Pool/market/historical/funding provider interfaces
- [ ] Fixture providers behind production interfaces
- [ ] Raydium CLMM adapter
- [ ] Pool discovery/detail
- [ ] Snapshot normalization
- [ ] Token/fee normalization
- [ ] Freshness/data-quality states
- [ ] Provider validation/errors
- [ ] Cache/rate-limit boundary
- [ ] Calculator uses real pool selection
- [ ] Tests

## Phase 4 — Forward Scenario & Dynamic Hedge
### Forward Scenario
- [ ] Current-state baseline
- [ ] User-defined future prices
- [ ] Price-path scenarios
- [ ] Below/in/above-range outcomes
- [ ] Token composition
- [ ] LP value / HODL / IL / delta
- [ ] Hedge PnL and combined PnL
- [ ] Scenario tables/charts
- [ ] Range sensitivity

### Dynamic Hedge
- [ ] Fixed/dynamic/threshold hedge
- [ ] Target ratio
- [ ] Tranches/FIFO
- [ ] Funding/costs
- [ ] Cooldown/minimum rebalance
- [ ] Event log
- [ ] Residual delta
- [ ] Tests

## Phase 5 — Historical Analysis & Replay
- [ ] Historical provider
- [ ] Validated PricePoint series
- [ ] No look-ahead
- [ ] Sequential replay using shared engines
- [ ] Fees/funding where supported
- [ ] Equity/drawdown
- [ ] Range exposure and in/out-of-range duration
- [ ] Historical scenario comparison
- [ ] Benchmarks/regimes
- [ ] Export
- [ ] Tests

## Phase 6 — Advanced Analytics & Pool Research
- [ ] Pool explorer
- [ ] LVR
- [ ] Volatility
- [ ] Range efficiency
- [ ] Fee/risk
- [ ] Sensitivity
- [ ] Comparative analytics
- [ ] Pool comparison
- [ ] Historical context

## Phase 7 — Realtime Monitoring
- [ ] Realtime price
- [ ] Realtime pool data
- [ ] Simulated position state
- [ ] Simulated hedge state
- [ ] Funding
- [ ] PnL
- [ ] Freshness
- [ ] Alerts
- [ ] Read-only enforcement

## Phase 8
- [ ] Intelligence layer
- [ ] Risk explanations
- [ ] Recommendations
- [ ] Anomaly detection
- [ ] Data-quality alerts
- [ ] Audit trail
- [ ] No execution path
