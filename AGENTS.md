# AI Coding Agent Instructions

This repository is a read-only LP research and decision-support platform.

## Source of Truth

Before writing code:
1. Read `AGENTS.md`.
2. Read the current Linear issue/task being implemented.
3. Read only the docs relevant to that issue.
4. Search the existing code before creating new files or abstractions.
5. Do NOT read the entire repository by default.

Core docs:
- docs/01-vision.md
- docs/02-structure.md
- docs/03-design.md
- docs/04-math-and-finance.md
- docs/05-data-model.md
- docs/06-roadmap.md
- docs/07-do-and-donts.md
- docs/08-agent-workflow.md
- docs/09-realtime-boundaries.md
- docs/10-quality-gates.md
- docs/11-phase-checklists.md
- docs/12-current-rebuild.md
- docs/13-data-architecture.md

For Phase 3 provider/data work, `docs/05-data-model.md` and `docs/13-data-architecture.md` are mandatory.

If code, Linear, and docs conflict, STOP and report the conflict. Do not silently reinterpret the specification.

## Core Rule

Build the product incrementally. A new phase must ADD capability; it must never replace, erase, or silently change an earlier phase.

## Product

A read-only LP Risk & Hedge Intelligence Platform for concentrated-liquidity research, simulation, forward scenario analysis, historical context, pool analytics, realtime monitoring, and alerts.

The primary user question is:

> "Given the current pool/position and my assumptions, what could happen if price moves?"

Historical data supports this question; it is not the product's primary purpose.

## Hard Security Boundary

This product must never:
- connect to a user's wallet
- request seed phrases/private keys
- sign transactions
- place/cancel trades
- add/remove/rebalance liquidity automatically
- execute futures hedges automatically
- move funds
- perform autonomous financial transactions

Realtime features are DATA + ANALYSIS + ALERTS only.

## Engineering Principles

- Keep calculation engines independent from UI and provider SDKs.
- Use explicit domain types.
- Prefer deterministic pure functions for financial calculations.
- Never hide assumptions inside calculations.
- Preserve price convention: stable-token value per 1 volatile token.
- Use Decimal.js or equivalent decimal-safe arithmetic for financial calculations.
- Do not claim an approximation is exact.
- Do not introduce protocol-specific math into generic CLMM modules.
- Forward scenarios are projections, not predictions.
- Historical analysis is contextual evidence, not a guarantee of future performance.
- Unknown/unavailable data must never be converted to zero.
- Do not over-engineer future phases before their phase begins.
- Add tests with every non-trivial calculation change.

## Before Coding

Inspect the relevant docs and current repository state. Identify the smallest change that satisfies the current Linear issue.

For provider/data tasks:
- inspect existing provider interfaces first
- reuse normalized contracts
- keep provider adapters read-only
- do not place financial calculations inside adapters
- use fixtures only through production interfaces

For scenario tasks:
- reuse the existing exact CLMM/domain engines
- keep scenario calculations deterministic
- make assumptions explicit
- do not introduce trading execution logic

## Before Finishing

Run lint/typecheck/tests/build as applicable. Report what passed, what failed, and any assumptions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`.

<!-- END:nextjs-agent-rules -->
