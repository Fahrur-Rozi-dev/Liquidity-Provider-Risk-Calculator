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
- [ ] Pool provider interface
- [ ] Market/price provider interface where needed
- [ ] Historical provider interface
- [ ] Funding provider interface
- [ ] Fixture providers behind production interfaces
- [ ] Raydium CLMM adapter
- [ ] Pool discovery
- [ ] Pool detail
- [ ] Pool snapshot normalization
- [ ] Token metadata normalization
- [ ] Fee-tier normalization
- [ ] Historical price/pool contract
- [ ] Freshness/data-quality states
- [ ] Provider validation/errors
- [ ] Cache/rate-limit boundary
- [ ] Calculator uses real pool selection
- [ ] Unit/integration/contract tests

## Phase 4 — Forward Scenario & Dynamic Hedge
### Forward Scenario
- [ ] Current-state baseline
- [ ] User-defined future prices
- [ ] Price-path scenarios
- [ ] Below-range / in-range / above-range states
- [ ] Token composition
- [ ] LP value
- [ ] HODL
- [ ] IL
- [ ] Delta/exposure
- [ ] Hedge PnL
- [ ] Combined PnL
- [ ] Scenario tables/charts
- [ ] Range sensitivity

### Dynamic Hedge
- [ ] Fixed hedge
- [ ] Dynamic hedge
- [ ] Threshold hedge
- [ ] Target ratio
- [ ] Tranches
- [ ] FIFO
- [ ] Funding
- [ ] Costs
- [ ] Cooldown/minimum rebalance
- [ ] Event log
- [ ] Residual delta
- [ ] Tests

## Phase 5 — Historical Analysis & Replay
- [ ] Historical provider
- [ ] Validated PricePoint series
- [ ] Historical import where useful
- [ ] Validation
- [ ] No look-ahead
- [ ] Sequential replay
- [ ] Fees/funding where supported
- [ ] Equity
- [ ] Drawdown
- [ ] Range exposure duration
- [ ] In/out-of-range analysis
- [ ] Historical scenario comparison
- [ ] Benchmarks
- [ ] Regime analysis
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
