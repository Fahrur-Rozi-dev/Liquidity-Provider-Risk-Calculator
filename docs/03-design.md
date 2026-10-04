# Product Design

## UX Direction
Professional quantitative research terminal, not a generic crypto dashboard.

Priorities:
1. Information hierarchy
2. Calculation transparency
3. Fast scenario exploration
4. Clear risk states
5. Dense but readable data
6. Consistent navigation

## Application Shell
- Persistent sidebar navigation
- Top bar with page title and data status
- Main content area
- Responsive layout
- Consistent cards/tables/charts
- Clear loading, stale, error and empty states

## Visual Language
Use a restrained financial-terminal aesthetic:
- neutral base
- strong typography hierarchy
- compact controls
- tabular numbers
- restrained semantic colors
- green/red only where they communicate financial direction
- avoid decorative gradients and excessive animation

## Calculator UX

### Input Area
Group inputs into:
- Pool / Pair
- Position
- Price Range
- Hedge
- Costs / Fees
- Scenario

### Results
Show:
- Current price
- Position status: Below / In Range / Above
- Token balances
- LP value
- HODL value
- IL
- LP delta
- Hedge notional
- Hedge PnL
- Net PnL
- Net delta / residual exposure

### Scenario Analysis
Allow scenario prices and display:
- LP composition
- LP value
- HODL value
- IL
- hedge value/PnL
- combined value/PnL
- delta

Do not bury the actual numbers under charts.

## Backtest UX
Show:
- configuration
- data quality
- equity curve
- drawdown
- returns
- risk metrics
- rebalance events
- funding/cost breakdown
- benchmark comparison
- regime breakdown

## Pool UX
Pool discovery → pool detail → normalized data → analytics.

Clearly label:
- source data
- estimated values
- historical realized values
- projections

## Realtime UX
Display freshness:
- Live
- Updating
- Stale
- Provider error

Realtime pages must never imply that the app is executing anything.

## Accessibility
- keyboard navigable
- visible focus
- semantic labels
- readable contrast
- no information conveyed by color alone
