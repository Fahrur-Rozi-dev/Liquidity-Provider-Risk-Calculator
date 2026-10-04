# Do & Don'ts

## DO

### Architecture
- Keep UI, application services, domain calculations and providers separate.
- Reuse domain engines across pages.
- Prefer small composable modules.
- Keep interfaces explicit.
- Document non-obvious financial assumptions.

### Finance
- Use one canonical price convention.
- Compare LP to HODL correctly.
- Track hedge PnL separately.
- Track funding separately.
- Track rebalance costs separately.
- Label estimates.
- Test boundary conditions.

### Data
- Normalize provider data.
- Track timestamps and freshness.
- Handle stale/error states.
- Keep provider-specific code behind adapters.
- Validate historical datasets.

### UI
- Preserve every existing route when adding a phase.
- Make important numbers visible.
- Show assumptions near outputs.
- Use tables for exact values.
- Use charts for patterns, not as the only source of truth.

### Development
- Read docs before coding.
- Make the smallest coherent change.
- Run tests/typecheck/lint/build.
- Update docs when architecture changes.

## DON'T

- Don't delete earlier functionality when implementing a new phase.
- Don't replace /backtest with /pools.
- Don't put all state into one giant object.
- Don't make React components calculate financial formulas directly.
- Don't use floating-point casually for money-critical math.
- Don't call estimated fees "actual fees".
- Don't call a simplified DLMM model an exact CLMM model.
- Don't introduce look-ahead bias.
- Don't silently change price orientation.
- Don't hide assumptions.
- Don't invent protocol data when a provider failed.
- Don't build wallet connection.
- Don't request private keys or seed phrases.
- Don't sign transactions.
- Don't execute trades.
- Don't automate LP rebalances.
- Don't automate futures hedges.
- Don't add execution APIs to provider interfaces.
- Don't add AI merely for marketing; it must improve analysis.
- Don't rebuild the entire app when a focused change is sufficient.

## Anti-Pattern
Phase 5 should never be implemented as:
"Replace current page.tsx with pool dashboard."

Correct:
"Add /pools and integrate the existing calculation engines through shared services."
