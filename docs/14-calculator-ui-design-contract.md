# Calculator UI Design Contract

> Status: implementation contract for the `/calculator` workspace.
>
> Related source of truth:
> - `AGENTS.md`
> - `docs/03-design.md`
> - `docs/01-vision.md`
> - `docs/02-structure.md`
> - `docs/04-math-and-finance.md`
> - `docs/05-data-model.md`
> - `docs/07-do-and-donts.md`
> - `docs/10-quality-gates.md`
>
> Google Stitch reference: https://stitch.withgoogle.com/projects/7580019220011459367
>
> Access note: the project URL is recorded, but the screen contents were not retrievable from this environment. Treat the actual Stitch screens as authoritative; do not infer exact styling from this contract alone. If the coding agent cannot open the project while authenticated, export the screens from Stitch and commit screenshots/HTML under `docs/design/screenshots/`.
>
> Important: this document defines UX behavior and visual guardrails. Once the approved Stitch design URL/screenshots are attached, they are the visual source of truth. Do not invent a competing visual direction.

## 1. Goal

Design the LP Calculator as a professional concentrated-liquidity research workspace. The user should be able to understand, in this order:

1. What pool, pair, position, and price range are being analyzed?
2. Which assumptions and costs are being used?
3. What is the current position worth and what tokens does it contain?
4. What happens at different future prices?
5. How do LP, HODL, fees, and optional hedge outcomes compare?
6. What risks, data limitations, and assumptions explain the result?

This is a read-only analysis and decision-support product. It is not a trading terminal and must never execute trades, connect wallets, or manage liquidity.

## 2. Design principles

- **Reference-first:** follow the approved Stitch screens instead of generating a generic dashboard.
- **Numbers before decoration:** important financial outputs must be visible without opening charts or secondary panels.
- **Explainability:** show assumptions, units, price orientation, data source, freshness, and model limitations near the relevant result.
- **Progressive disclosure:** group advanced controls logically; do not place every input in one visually overwhelming form.
- **Consistent density:** this is a research tool, so compact data is appropriate, but spacing and hierarchy must keep it scannable.
- **One coherent product:** reuse the existing application shell, design tokens, components, and navigation.
- **Honest state:** unknown, stale, unavailable, estimated, and calculated values must be visually distinguishable. Never represent unknown data as zero.
- **Responsive by design:** preserve the hierarchy on smaller screens; do not merely shrink the desktop layout.
- **Accessible:** keyboard-operable controls, visible focus, semantic labels, readable contrast, and no color-only meaning.

## 3. Page shell and hierarchy

Use the shared app shell defined by the project. Do not create a separate shell for the calculator.

### Page header

The header should communicate:
- Page title: **LP Calculator**
- A short description of the current analysis
- Relevant pool/market data freshness when live data is involved
- Primary page actions only when they already exist in product requirements

Do not add decorative hero banners, oversized marketing headlines, or arbitrary KPI cards above the actual calculator.

### Main workspace

Use the approved Stitch layout when available. Keep these conceptual areas distinct, regardless of whether Stitch uses columns, tabs, panels, or stacked sections:

1. **Position and pool context**
2. **Configuration and assumptions**
3. **Current-position summary**
4. **Scenario analysis**
5. **Detailed breakdown and diagnostics**

Do not force this into a particular grid if the approved Stitch screen specifies a different arrangement.

## 4. Input groups and behavior

Inputs must be grouped by user intent. Use the existing domain types and validation rules; UI code must not implement financial formulas.

### A. Pool and pair

Display or collect the pool/pair identity and relevant pool parameters supported by the existing application. When values come from a provider, indicate source and freshness. Clearly distinguish provider data from user-entered overrides.

### B. Position

Group the existing position inputs together. Use explicit labels, units, sensible formatting, and validation messages. Preserve the current domain model; do not invent unsupported inputs or silently change their meaning.

### C. Price range

Keep lower and upper range boundaries visually associated. Validate that values are valid and correctly ordered. Show the current range status as **Below range**, **In range**, or **Above range**, where the calculation engine can determine it.

### D. Fees and costs

Keep fee assumptions separate from price/position configuration. Distinguish estimated fees from realized fees. Where relevant and already supported, show funding and rebalance costs separately rather than combining them into an opaque total.

### E. Hedge (optional)

Hedge inputs must be clearly optional and must not make an unhedged LP analysis appear incomplete. Show hedge-related outputs separately from LP-only outputs and identify the resulting combined exposure. This page calculates and explains scenarios only; it never executes a hedge.

### F. Scenario assumptions

Make user-defined scenario prices and other supported assumptions explicit. Identify outputs as projections/scenarios, not forecasts or guarantees. Reuse the existing scenario engine.

### Input interaction requirements

- Preserve entered values when switching between relevant panels or viewing results.
- Avoid recalculating on every keystroke if that causes unstable or expensive updates; follow the existing application pattern.
- Provide clear validation and recovery messages.
- Do not silently clamp, rewrite, or discard invalid user input.
- Do not add reset, save, import, export, or preset actions unless they exist in requirements or are explicitly approved.

## 5. Results hierarchy

The result area should answer the user's main question before showing secondary diagnostics.

### Primary result group

Prioritize the metrics supported by the current domain engine:
- Current price and range status
- LP position value
- HODL benchmark value
- IL / relative performance against the correct benchmark
- LP delta / exposure
- Hedge notional and hedge PnL, when enabled
- Net PnL and residual/net delta, when supported

Do not fabricate a metric when its inputs are missing. Show an explicit unavailable state and explain the missing dependency.

### Token composition

Show the current token balances and units clearly. Ensure the user can distinguish token quantities from their quote-currency values.

### Scenario table

When scenario outputs are available, provide an exact-value table in addition to any chart. It should show supported values per scenario price, such as:
- Scenario price
- Range status
- Token composition
- LP value
- HODL value
- IL / relative performance
- Hedge PnL and combined PnL, if hedge is enabled
- Delta / residual exposure, if supported

The table's columns must adapt responsibly to screen size. Do not hide the only source of exact numbers behind a chart tooltip.

### Charts

Charts should reveal patterns across price scenarios, not replace the underlying values. Use consistent units, clearly labeled axes, and explicit zero/baseline semantics. Do not add chart types solely for decoration. Keep chart calculations in the domain/application layer rather than embedding formulas in React components.

### Assumptions and calculation details

Keep the relevant assumptions accessible near the outputs they affect. Clearly distinguish:
- User inputs
- Provider-sourced values
- Derived calculations
- Estimates or approximations
- Missing/unavailable values

Never describe an approximate model as exact CLMM math.

## 6. Visual language

The existing product direction in `docs/03-design.md` remains authoritative. Apply it consistently:

- Restrained financial-terminal aesthetic
- Neutral base colors with a deliberate, limited accent
- Clear typography hierarchy and compact controls
- Tabular numerals for prices, balances, percentages, and PnL
- Consistent alignment of labels and numeric values
- Semantic green/red only where they communicate financial direction; include text or symbols so meaning is not conveyed by color alone
- Subtle borders and surface distinctions where they improve grouping
- Minimal animation and no unnecessary decorative effects

Avoid these AI-slop patterns:
- Generic crypto-dashboard templates unrelated to the Stitch reference
- Excessive gradients, glassmorphism, glow effects, or giant rounded cards
- Arbitrary icon usage or emoji in financial data
- Randomly changing colors, spacing, radii, or component styles between sections
- Large empty hero areas that push the calculator below the fold
- KPI cards that repeat the same information already shown in a table
- Fake data, unexplained sample numbers, or fabricated provider status
- Dense walls of inputs with no grouping or progressive disclosure

**Do not hardcode exact color hex values, font sizes, spacing values, or border radii in this document.** Derive those from the approved Stitch reference and/or the existing shared design tokens. Once measured or exported, record them in the design system rather than inventing new values per component.

## 7. States that must be designed

Implement states relevant to each existing feature; do not display all states simultaneously.

- Initial / no position configured
- Valid input and calculated result
- Input validation error
- Loading / recalculating
- Provider unavailable
- Stale provider data
- Partial data / some outputs unavailable
- Empty scenario result
- Calculation error with a useful recovery action
- Narrow viewport / mobile layout

A provider error must not be represented as a price or balance of zero. Preserve the distinction between zero, unavailable, stale, and not yet calculated.

## 8. Responsive behavior

Follow the Stitch mobile/tablet references if supplied. At minimum:

- Desktop: preserve the intended workspace hierarchy and efficient use of horizontal space.
- Tablet: reduce columns only when content remains legible; avoid squeezed numeric tables.
- Mobile: stack logical groups, keep labels attached to inputs, and allow tables to use a deliberate horizontal-scroll or alternate compact presentation.
- Keep primary outputs discoverable without requiring excessive scrolling.
- Ensure sidebar/navigation behavior follows the shared app shell.
- Prevent charts, long token names, and numeric values from overflowing their containers.

Do not invent a new mobile navigation pattern just for this page.

## 9. Component and implementation rules

Before adding UI components:

1. Inspect the existing app shell, UI primitives, calculator route, tokens, and styling conventions.
2. Reuse existing components when they satisfy the design.
3. Create shared components only when they have a clear reusable purpose.
4. Keep page composition separate from domain calculations and provider SDKs.
5. Preserve existing routes, state boundaries, calculation behavior, and provider contracts.
6. Avoid a giant page component; split by meaningful workspace sections and reusable components consistent with the existing architecture.
7. Avoid introducing a new UI library or dependency unless justified and approved.
8. Follow the repository's current Next.js guidance and inspect the installed Next.js docs before changing framework-specific APIs.

Suggested conceptual components (names are not mandatory; inspect the codebase first):
- Calculator page header
- Pool / data status summary
- Position configuration section
- Price range controls
- Fee/cost assumptions section
- Optional hedge section
- Primary results summary
- Token composition table
- Scenario controls and results table
- Scenario chart
- Assumptions / diagnostics panel
- Reusable loading, stale, error, and empty states

## 10. Stitch reference handoff

Before implementing a visual task, the task owner should provide or link:
- Approved Stitch project/share URL: https://stitch.withgoogle.com/projects/7580019220011459367
- Screenshot or export for each target page/state
- Desktop viewport dimensions; mobile/tablet references if available
- Which screen is canonical if multiple explorations exist
- Any deliberate deviations required by current product behavior

Place exported reference images under `docs/design/screenshots/` or another documented path, and update this file with their paths. Do not commit credentials, private tokens, or unrelated personal data.

If the Stitch reference cannot be accessed by the agent:
1. Ask for exported screenshots or an accessible export.
2. Continue only on non-visual work that does not require guessing the design.
3. Do not claim pixel-level fidelity without inspecting the reference.

## 11. Visual QA acceptance checklist

A UI task is not complete merely because it compiles.

- [ ] Relevant Stitch reference was inspected.
- [ ] Page structure and visual hierarchy match the approved reference.
- [ ] Shared shell and navigation remain consistent with other routes.
- [ ] Spacing, typography, color, component sizes, and alignment match the reference.
- [ ] All important financial values are visible and correctly labeled.
- [ ] Exact scenario values are available without relying only on chart tooltips.
- [ ] Input groups, validation, and optional hedge behavior are clear.
- [ ] Loading, stale, unavailable, error, and empty states are handled where applicable.
- [ ] Desktop layout checked at the reference viewport.
- [ ] Mobile/tablet behavior checked at relevant widths.
- [ ] No horizontal overflow or clipped numeric content.
- [ ] Existing business logic, domain engines, and provider contracts were not changed unintentionally.
- [ ] No unsupported metrics, fake values, or false claims of live data were added.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` were run as applicable; results are reported.
- [ ] Before/after screenshots were reviewed against the reference, and visible mismatches were fixed.

## 12. Definition of done

The calculator UI task is complete only when:
1. It follows the approved Stitch reference or explicitly documents blockers to accessing it.
2. It reuses the established application design system.
3. Financial calculations and data semantics remain owned by the existing domain/services layers.
4. Relevant functional checks pass, or failures are clearly reported.
5. Visual QA has been performed and remaining deviations are documented.
