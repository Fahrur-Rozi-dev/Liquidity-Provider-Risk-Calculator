# LP Risk & Hedge Intelligence Platform

A **read-only** research and decision-support platform for concentrated liquidity (CLMM) providers:
position valuation, scenario analysis, LP delta, short/dynamic hedging, historical backtesting,
pool analytics, realtime monitoring, and alerts.

> **Security boundary:** this product never connects wallets, requests keys or seed phrases,
> signs transactions, places trades, or rebalances liquidity. Realtime features are
> DATA + ANALYSIS + ALERTS only.

## Documentation (source of truth)

Read in order before coding:

1. [docs/01-vision.md](docs/01-vision.md)
2. [docs/02-structure.md](docs/02-structure.md)
3. [docs/03-design.md](docs/03-design.md)
4. [docs/04-math-and-finance.md](docs/04-math-and-finance.md)
5. [docs/05-data-model.md](docs/05-data-model.md)
6. [docs/06-roadmap.md](docs/06-roadmap.md)
7. [docs/07-do-and-donts.md](docs/07-do-and-donts.md)
8. [docs/08-agent-workflow.md](docs/08-agent-workflow.md)
9. [docs/09-realtime-boundaries.md](docs/09-realtime-boundaries.md)
10. [docs/10-quality-gates.md](docs/10-quality-gates.md)

Plus: [docs/11-phase-checklists.md](docs/11-phase-checklists.md),
[docs/12-current-rebuild.md](docs/12-current-rebuild.md).

## Commands

| Command            | Purpose                     |
| ------------------ | --------------------------- |
| `npm run dev`      | Development server          |
| `npm run build`    | Production build            |
| `npm run lint`     | ESLint                      |
| `npm run typecheck`| TypeScript (`tsc --noEmit`) |
| `npm test`         | Jest unit/integration tests |

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS v4 — restrained financial-terminal design system
- Jest — unit & integration tests (`tests/unit`, `tests/integration`, `tests/fixtures`)

## Phase status

See `/` (Overview) in the running app, or [docs/06-roadmap.md](docs/06-roadmap.md).
