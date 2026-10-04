# Data Model & Contracts

## Core Types

### Token
- symbol
- decimals
- address
- chain

### Pool
- id/address
- protocol
- chain
- pool type
- token0
- token1
- fee rate
- current price
- liquidity
- TVL
- volume
- fees
- timestamp
- source

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

### PricePoint
- timestamp
- price
- source
- quality/freshness metadata

### PoolSnapshot
- timestamp
- price
- TVL
- liquidity
- volume
- fees
- fee rate
- source

## Provider Abstraction

All external data must pass through adapters.

Conceptually:

interface PoolDataProvider {
  getPool(...)
  getPoolSnapshot(...)
  getPoolHistory(...)
  searchPools(...)
}

Do not couple the domain engine directly to a provider SDK.

## Data Quality
Every external dataset should carry:
- source
- fetchedAt
- observedAt when available
- freshness
- estimated flag where relevant
- error/status

## Fee Classification

Never mix these concepts:
1. Pool-reported fees
2. Estimated pool fees
3. Historical realized fee yield
4. Position-level estimated fees
5. Projected fee yield

If position-level fees cannot be observed exactly, show an estimate and expose the methodology.

## Normalization
Normalize:
- token ordering
- price orientation
- decimals
- timestamps
- protocol identifiers
- fee units

Canonical internal price remains stable per volatile.

## Realtime
Realtime data is read-only and normalized before reaching UI.

## Persistence
Do not add a database merely because a future phase might need one. Introduce persistence when a concrete requirement exists.
