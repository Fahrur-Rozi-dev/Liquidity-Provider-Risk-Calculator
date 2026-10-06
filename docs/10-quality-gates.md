# Quality Gates

A phase is complete only when its acceptance criteria pass.

## Functional
- All required routes exist.
- Earlier routes still work.
- Core workflows work from clean state.
- Loading/error/empty states exist where needed.
- Scenario outputs clearly distinguish inputs, assumptions, and calculated results.

## Mathematical
- Boundary cases tested.
- Below-range tested.
- In-range tested.
- Above-range tested.
- HODL benchmark tested.
- Hedge PnL tested.
- Funding tested where applicable.
- Rebalance costs tested where applicable.
- Forward scenario paths are deterministic for identical inputs.
- Historical replay, when present, does not look ahead.

## Data
- Provider data normalized.
- Source and timestamps retained.
- Fresh/stale/partial/unavailable/error states are explicit.
- Unknown/unavailable values are never silently converted to zero.
- Estimates are clearly labeled.
- Provider-specific response shapes do not leak into domain/UI contracts.

## Architecture
- UI does not own core financial formulas.
- Domain calculations are reusable.
- Forward scenario logic is reusable by Calculator, Hedge, and Historical Analysis where applicable.
- Provider adapters are isolated.
- Application services orchestrate providers and domain engines.
- No phase-specific code destroys another phase.
- No giant shared state object.
- Fixtures use the same contracts as production providers.

## Security
For Phase 7–8:
- no wallet connection
- no signing
- no execution
- no private keys
- no automatic rebalance
- no automatic hedge

## UX
- navigation works
- page hierarchy is clear
- key metrics are visible
- tables/charts are readable
- mobile/responsive behavior is acceptable
- accessibility basics pass
- data freshness/status is visible wherever stale or partial data can affect decisions

## Engineering
- typecheck passes
- lint passes
- tests pass
- production build passes

## Regression Gate
Before merging a phase:
- compare route list before vs after
- compare major feature list before vs after
- confirm no existing phase was replaced
- confirm no existing domain calculation path was duplicated

A green build alone is NOT sufficient.
