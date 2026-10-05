# Roadmap

## Product Strategy

The project is built as one product with shared domain engines and shared normalized data contracts.

**Core rule: production architecture first.**

Do not intentionally build a temporary architecture and postpone replacing it later. If a capability is a known dependency of the final product, establish its interface and data contract early.

Mocks/manual fixtures are allowed for deterministic tests and offline development, but they must sit **behind the same interfaces used by production providers**. They must never create a second domain model or duplicate calculation path.

### Target architecture

```
Production Providers
  ├─ Pool / Market Data
  ├─ Historical Data
  └─ Funding Data
          ↓
Normalized Data Contracts
          ↓
Shared Domain Engines
  ├─ Exact CLMM
  ├─ Hedge
  ├─ Fees / Funding
  └─ Backtest
          ↓
Product Workspaces
  ├─ Calculator
  ├─ Hedge
  ├─ Backtest
  ├─ Pools
  ├─ Analytics
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
**This phase replaces the old Phase 5 position in the roadmap.**

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

The provider layer supplies data. The domain layer calculates.

Do not put CLMM math, hedge math, fee math, or backtest logic inside provider adapters.

## Phase 4 — Dynamic Hedge
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

## Phase 5 — Historical Backtest
Build historical replay using the same provider contracts and domain engines.

Deliver:
- historical provider implementation
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

Backtest must reuse production domain engines rather than creating separate backtest math.

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

## Cross-Phase Rules

1. Never delete or replace an earlier workspace to implement a later phase.
2. Never duplicate domain calculations across calculator, hedge, backtest, analytics, and realtime.
3. Production data contracts must be established before building features that depend on them.
4. Provider adapters must remain outside the domain layer.
5. Mocks/fixtures must implement production interfaces.
6. Prefer extending existing contracts over creating parallel models.
7. Preserve price/token conventions once established.
8. Any protocol-specific behavior must be explicit.
9. Every data-driven UI must expose source/freshness when relevant.
10. If a prerequisite is objectively necessary, implement the minimum prerequisite rather than building a temporary substitute.

## Current Execution Point

Phase 0–2 are complete/in progress in the current rebuild.

**Next implementation target: Phase 3 — Production Data Foundation.**

Do not restart Phase 0–2.
