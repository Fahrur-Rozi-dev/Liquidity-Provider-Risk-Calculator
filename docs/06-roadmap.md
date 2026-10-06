# Roadmap

## Product Strategy

The project is a read-only LP research and decision-support platform. Its primary job is to help a user understand the consequences and risks of an LP position **before and during a position**, not to run a trading strategy or autonomous bot.

**Core rule: production architecture first.**

Do not intentionally build a temporary architecture and postpone replacing it later. If a capability is a known dependency of the final product, establish its interface and data contract early.

Mocks/manual fixtures are allowed for deterministic tests and offline development, but they must sit **behind the same interfaces used by production providers**. They must never create a second domain model or duplicate calculation path.

### Target architecture

```
External Public Providers
  ├─ Pool / Market Data
  ├─ Historical Data
  └─ Funding Data
          ↓
Provider Adapters
          ↓
Normalized Data Contracts
          ↓
Application Services
          ↓
Shared Domain Engines
  ├─ Exact CLMM
  ├─ LP / IL / Exposure
  ├─ Forward Scenario
  ├─ Hedge
  └─ Historical Analysis / Replay
          ↓
Product Workspaces
  ├─ Calculator
  ├─ Hedge
  ├─ Pools
  ├─ Analytics
  ├─ Historical Analysis
  └─ Realtime Monitor
```

No workspace may implement its own competing version of a domain calculation.

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

No advanced calculations unless required to prove the architecture.

## Phase 1 — Basic Calculator

Simplified LP model + basic short hedge.

Deliver:
- inputs
- scenario prices
- LP value
- hedge PnL
- combined PnL
- charts/tables

This phase remains useful as a simple sanity-check model. It is not a separate production calculation architecture.

## Phase 2 — Exact CLMM

Exact concentrated-liquidity calculations.

Deliver:
- sqrt price math
- liquidity
- token amounts
- HODL
- IL
- delta
- range status
- scenario engine

The existing Phase 2 implementation is preserved. Do not rebuild it when adding real data.

## Phase 3 — Production Data Foundation

Goal: connect the existing domain engines to real public data without coupling provider logic to financial calculations.

Deliver:
- canonical normalized data contracts
- pool provider interface
- market/price provider interface where needed
- historical provider interface
- funding provider interface
- Raydium CLMM adapter
- pool discovery
- pool detail
- normalized pool snapshots
- token metadata normalization
- fee-tier normalization
- historical price/pool data contract
- timestamps and freshness metadata
- provider errors and validation
- cache/rate-limit boundary
- deterministic fixture provider using the same contracts
- calculator integration with real pool selection

Priority:
1. Raydium CLMM
2. other providers only after the contract is proven

Meteora DLMM is separate protocol-specific work and must not be modeled as if it were CLMM.

### Phase 3 architectural rule

The provider layer supplies data. The application layer orchestrates. The domain layer calculates.

Do not put CLMM math, hedge math, fee math, scenario logic, or historical replay logic inside provider adapters.

## Phase 4 — Forward Scenario & Dynamic Hedge

This is the primary decision-support expansion after real data.

Goal: answer **"If price moves from here, what happens to this LP position and hedge?"**

### Forward Scenario

Deliver:
- current-state baseline
- user-defined future price points
- price-path scenarios
- below-range / in-range / above-range outcomes
- token composition at each scenario
- LP value
- HODL benchmark
- IL
- LP delta/exposure
- fee assumptions where explicitly provided
- hedge PnL
- combined LP + hedge PnL
- scenario tables/charts
- range sensitivity

Scenarios are what-if projections, not predictions.

### Dynamic Hedge

Build hedge behavior on top of the normalized data and existing CLMM engine.

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
- residual delta

All hedge modes must consume the same normalized price/state inputs.

No duplicated CLMM implementation.

## Phase 5 — Historical Analysis & Replay

Historical analysis is **supporting evidence**, not the product's primary purpose.

Goal:
- understand how candidate LP configurations behaved under historical market conditions
- estimate how often price paths would have crossed candidate ranges
- provide context for scenario assumptions

This is not a trading-strategy backtester and does not imply future performance.

Deliver:
- historical provider implementation
- validated PricePoint series
- sequential replay using existing domain/scenario engines
- no look-ahead
- explicit execution convention
- fees/funding where supported
- equity/drawdown
- historical range exposure
- historical in/out-of-range duration
- historical scenario comparison
- benchmarks
- regime analysis
- exports

Avoid building a strategy-optimization framework unless a later product requirement justifies it.

## Phase 6 — Advanced Analytics & Pool Research

Deliver:
- pool explorer
- LVR/adverse selection
- volatility
- range efficiency
- fee vs risk
- sensitivity analysis
- comparative analytics
- pool comparison
- historical context for range selection

Do not claim a universally optimal range.

Protocol-specific models must remain explicit.

## Phase 7 — Realtime Monitoring

Realtime data only:
- live price
- pool metrics
- simulated LP state
- simulated hedge state
- funding
- PnL
- alerts
- freshness/data-quality status

Realtime consumes the existing provider contracts and domain engines.

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

## Priority Principle

When deciding between features, prioritize in this order:

1. Real pool/current data
2. Exact and reusable LP/CLMM calculations
3. Forward scenario/projection
4. Dynamic hedge analysis
5. Historical analysis as supporting evidence
6. Advanced analytics/pool research
7. Realtime monitoring
8. Realtime intelligence

The product is not a trading bot. Historical backtesting must never become the center of the architecture.

## Cross-Phase Rules

1. Never delete or replace an earlier workspace to implement a later phase.
2. Never duplicate domain calculations across calculator, hedge, historical analysis, analytics, and realtime.
3. Production data contracts must be established before building features that depend on them.
4. Provider adapters must remain outside the domain layer.
5. Mocks/fixtures must implement production interfaces.
6. Prefer extending existing contracts over creating parallel models.
7. Preserve price/token conventions once established.
8. Any protocol-specific behavior must be explicit.
9. Every data-driven UI must expose source/freshness when relevant.
10. Unknown/unavailable data must never be silently converted to zero.
11. Scenario projections must be clearly labeled as scenarios, not predictions.
12. Historical analysis must not be presented as evidence that future returns will repeat.
13. If a prerequisite is objectively necessary, implement the minimum prerequisite rather than building a temporary substitute.

## Current Execution Point

Phase 0–2 are complete/in progress in the current rebuild.

**Next implementation target: Phase 3 — Production Data Foundation.**

Do not restart Phase 0–2.
