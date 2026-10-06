# Data Model & Contracts

## Core Types

The normalized data model separates stable metadata from time-varying observations.

### Token
- symbol
- decimals
- address
- chain

### PoolId
- protocol
- chain
- address

### PoolMetadata
- id
- protocol
- chain
- pool type
- token0
- token1
- fee tier
- source

### PoolSnapshot
- pool id
- observedAt
- current price
- liquidity when available
- TVL when available
- volume when available
- fees when available
- fee tier when available
- data quality metadata

### PricePoint
- timestamp
- price
- source
- data quality metadata

### LiquiditySnapshot
- timestamp
- liquidity
- source
- data quality metadata

### FundingPoint
- timestamp
- funding rate
- source
- data quality metadata

### LPPosition
- pool reference
- lower price
- upper price
- entry price
- liquidity or initial token amounts
- valuation currency
- created timestamp

### HedgePosition
- mode
- target ratio
- current notional
- tranches
- funding
- costs

### DataQuality

All externally sourced observations must use one canonical quality model:

- status: `fresh | stale | partial | unavailable | error`
- source
- observedAt when available
- fetchedAt
- freshness information
- warnings
- estimated flag when applicable

Do not invent a separate freshness/error model inside each feature.

## Unknown vs Zero

This is a project-wide invariant:

- `0` means the source measured or calculated a real zero.
- `null` / unavailable means the value is unknown or not supplied.
- estimated values must be explicitly marked as estimated.
- stale values remain known values but must be marked stale.

Never convert unavailable volume, fees, TVL, funding, liquidity, or historical observations into zero merely to simplify UI or calculations.

## Provider Abstraction

All external data must pass through adapters.

Conceptually:

```ts
interface PoolDataProvider {
  discoverPools(...)
  getPoolMetadata(...)
  getPoolSnapshot(...)
  getPoolHistory(...)
}
```

Other read-only provider interfaces may exist for:
- market/price data
- historical data
- funding data

Do not couple the domain engine directly to a provider SDK.

## Normalization

Normalize:
- token ordering
- price orientation
- decimals
- timestamps
- protocol identifiers
- fee units
- missing-data semantics

Canonical internal price remains stable-token value per 1 volatile token.

## Fee Classification

Never mix these concepts:
1. Pool-reported fees
2. Estimated pool fees
3. Historical realized fee yield
4. Position-level estimated fees
5. Projected fee yield

If position-level fees cannot be observed exactly, show an estimate and expose the methodology.

## Data Integrity

Provider adapters must validate:
- required identifiers
- token ordering
- decimals
- price orientation
- timestamps
- fee units
- impossible negative values where the source contract forbids them

Invalid provider data must fail explicitly or be marked with the appropriate quality state. It must not silently enter the domain engine.

## Persistence

Do not add a database merely because a future phase might need one.

Phase 3 may use provider → normalization → application service → domain flow with bounded in-memory/cache behavior. Introduce persistent storage only when a concrete product requirement exists.

## Realtime

Realtime data is read-only and normalized before reaching application services or UI.

The UI must never silently present stale data as live.
