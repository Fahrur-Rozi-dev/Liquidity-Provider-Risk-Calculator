# Data Architecture

## Purpose

This document defines the data boundary that all future phases must reuse.

The platform is decision-support software, not a trading bot. Data architecture must support current-state analysis, forward scenario projection, historical context, and realtime monitoring without creating separate calculation systems.

## Flow

```
External Public Providers
        ↓
Provider Adapters
        ↓
Normalized Data Contracts
        ↓
Application Services
        ↓
Domain Engines
        ↓
Product Workspaces
```

## Provider Boundary

Providers are responsible only for retrieving and normalizing external information.

Examples:
- Raydium pool data
- public market prices
- historical price/pool data
- funding rates

Providers must not calculate:
- CLMM liquidity
- LP PnL
- IL
- delta
- hedge PnL
- forward scenario outcomes
- historical performance metrics

## Normalized Contracts

The exact TypeScript shapes may evolve, but the concepts are stable:

- Token
- PoolId
- PoolMetadata
- PoolSnapshot
- PricePoint
- LiquiditySnapshot
- FeeTier
- FundingPoint
- DataQuality
- ProviderError

A normalized contract should contain enough information for downstream engines without exposing provider-specific response formats.

## Data Semantics

The following distinction is mandatory:

- `0` = known/measured zero
- `null` / unavailable = unknown or not supplied
- estimated = explicitly marked
- stale = known data that is not fresh
- error = provider failure

Never manufacture zeros for unavailable data.

## Provider Interfaces

Production interfaces should be read-only.

Typical capabilities:
- discover pools
- get pool metadata
- get current pool snapshot
- get current price
- get historical points
- get funding data where applicable

No execution methods are allowed.

## Fixtures

Fixtures are allowed for:
- deterministic unit tests
- regression tests
- offline development
- reproducing edge cases

Fixtures must implement the same interfaces as production providers.

Example:

```
PoolProvider
  ├── RaydiumPoolProvider
  └── FixturePoolProvider
```

Not:

```
MockPoolModel → temporary UI
RaydiumModel  → future rewrite
```

## Data Semantics

- `0` = known/measured zero
- `null` / unavailable = unknown or not supplied
- estimated = explicitly marked
- stale = known data that is not fresh
- error = provider failure

Never manufacture zeros for unavailable data.

## Freshness and Fallback

Data-driven features must preserve:
- source
- fetchedAt
- source timestamp when available
- freshness status
- provider error state

Fallback policy:

1. fresh provider data
2. recent cached data when explicitly allowed
3. explicit unavailable/error state

Never silently present cached data as live. If cached data is used, expose that it is cached and when it was last observed.

## Forward Scenario Architecture

Forward scenario analysis is a core domain capability.

It must consume:
- normalized current pool/market state
- LP/CLMM position configuration
- scenario assumptions
- hedge configuration when applicable

It must produce:
- scenario state
- LP value
- token composition
- HODL comparison
- IL
- delta/exposure
- hedge PnL when configured
- combined outcomes
- explicit assumptions

Scenario calculations must remain deterministic and provider-independent.

## Forward Scenario Architecture

Forward scenario analysis is a core domain capability. It consumes normalized current state, position configuration, scenario assumptions, and optional hedge configuration. It produces deterministic what-if outcomes. It is a projection tool, not a prediction engine.

Scenario logic must remain provider-independent and reusable by Calculator, Hedge, and Historical Analysis.

## Historical Analysis Architecture

Historical analysis reuses the same domain/scenario engines with historical PricePoint inputs.

It must not create a separate CLMM, LP, or hedge calculation implementation.

Historical results are context, not forecasts. Historical analysis must reuse the same scenario/domain engines rather than creating a separate calculation path.

## Protocol Separation

Raydium CLMM and Meteora DLMM are not interchangeable.

A shared provider contract is acceptable.

A shared protocol-specific math implementation is not.

Protocol-specific domain engines must remain explicit.

## Reuse Rule

Calculator, Hedge, Historical Analysis, Analytics, and Realtime must consume the same normalized data and domain engines wherever the underlying concept is the same.

No duplicate calculation paths.
