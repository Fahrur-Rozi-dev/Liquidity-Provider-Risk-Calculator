# Quality Gates

A phase is complete only when its acceptance criteria pass.

## Functional
- All required routes exist.
- Earlier routes still work.
- Core workflows work from clean state.
- Loading/error/empty states exist where needed.

## Mathematical
- Boundary cases tested.
- Below-range tested.
- In-range tested.
- Above-range tested.
- HODL benchmark tested.
- Hedge PnL tested.
- Funding tested where applicable.
- Rebalance costs tested where applicable.

## Data
- Provider data normalized.
- Source and timestamps retained.
- Stale data detected.
- Errors handled.
- Estimates clearly labeled.

## Architecture
- UI does not own core financial formulas.
- Domain calculations are reusable.
- Provider adapters are isolated.
- No phase-specific code destroys another phase.
- No giant shared state object.

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

A green build alone is NOT sufficient.
