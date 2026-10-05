# Data Architecture

## Purpose

This document defines the data boundary that all future phases must reuse.

## Flow

```
External Public Providers
        ↓
Provider Adapters
        ↓
Normalized Data Contracts
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
- backtest performance

## Normalized Contracts

The exact TypeScript shapes may evolve, but the concepts are stable:

- Token
- PoolId
- PoolMetadata
- PoolSnapshot
- PricePoint
- FeeTier
- LiquiditySnapshot
- FundingPoint
- DataFreshness
- ProviderError

A normalized contract should contain enough information for downstream engines without exposing provider-specific response formats.

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

## Freshness

Data-driven features should preserve:
- source
- retrievedAt
- source timestamp when available
- freshness status
- provider error state

The UI must never silently represent stale data as live.

## Protocol Separation

Raydium CLMM and Meteora DLMM are not interchangeable.

A shared provider contract is acceptable.

A shared protocol-specific math implementation is not.

Protocol-specific domain engines must remain explicit.

## Reuse Rule

Calculator, Hedge, Backtest, Analytics, and Realtime must consume the same normalized data and domain engines wherever the underlying concept is the same.

No duplicate calculation paths.
