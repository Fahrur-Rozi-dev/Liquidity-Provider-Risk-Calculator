# Current Rebuild Contract

## Starting Point

The previous repository suffered from phase-overwrite problems:
- later phases replaced the visible application
- routing was not treated as a first-class architecture
- UI and domain evolution became coupled
- one phase could effectively erase another phase's user experience

This rebuild intentionally starts from zero.

## Important

Do not import old source files simply because they exist in Git history.

The current implementation and current documentation are the source of truth.

## Architecture Contract

The product is a single application composed of multiple research workspaces.

Shared layers:

1. **Provider layer**
   - public data acquisition
   - provider-specific parsing
   - caching/rate-limit handling
   - freshness/error metadata

2. **Normalized data layer**
   - canonical pool snapshots
   - canonical prices
   - token metadata
   - fee metadata
   - historical points
   - funding data

3. **Domain layer**
   - exact CLMM math
   - LP state
   - hedge state
   - fees/funding
   - PnL
   - backtest/replay

4. **Product layer**
   - Calculator
   - Hedge
   - Backtest
   - Pools
   - Analytics
   - Realtime Monitor
   - Alerts
   - Settings

Provider code must not contain domain calculations.

Product workspaces must reuse domain engines.

## Data Strategy

Real public data is introduced early rather than postponed to a late phase.

The project may use deterministic fixtures during development, but fixtures must implement the same provider interfaces as production adapters.

This gives us:

- one data contract
- one domain calculation path
- one production integration path
- lower future rework
- lower AI-agent token usage

## First Build Target

The foundation is already established.

Phase 0–2 provide:
1. project scaffold
2. application shell
3. route architecture
4. shared UI primitives
5. domain boundaries
6. testing foundation
7. simplified calculator
8. exact CLMM engine

The next foundation is the production data layer.

## Expected End State

The application should feel like one coherent product with multiple research workspaces:

Overview
Calculator
Hedge
Backtest
Pools
Analytics
Realtime Monitor
Alerts
Settings

All workspaces share consistent navigation and domain engines without becoming one giant application state.

## Success Definition

The project is successful when:
- adding later phases never deletes earlier workspaces
- real data flows through normalized contracts
- domain engines are reused across all workspaces
- provider-specific APIs do not leak into domain logic
- mocks/fixtures do not create parallel architectures
- realtime remains strictly read-only
