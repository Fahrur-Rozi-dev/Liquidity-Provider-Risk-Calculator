# AI Coding Agent Instructions

This repository is being rebuilt from zero.

## Source of Truth
Before writing code, read these files in order:
1. docs/01-vision.md
2. docs/02-structure.md
3. docs/03-design.md
4. docs/04-math-and-finance.md
5. docs/05-data-model.md
6. docs/06-roadmap.md
7. docs/07-do-and-donts.md
8. docs/08-agent-workflow.md
9. docs/09-realtime-boundaries.md
10. docs/10-quality-gates.md

If code and docs conflict, STOP and report the conflict. Do not silently reinterpret the specification.

## Core Rule
Build the product incrementally. A new phase must ADD capability; it must never replace, erase, or silently change an earlier phase.

## Product
A read-only LP Risk & Hedge Intelligence Platform for concentrated liquidity research, simulation, backtesting, pool analytics, realtime monitoring, and alerts.

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
- Keep calculation engines independent from UI.
- Use explicit domain types.
- Prefer deterministic pure functions for financial calculations.
- Never hide assumptions inside calculations.
- Preserve price convention: stable-token value per 1 volatile token.
- Use Decimal.js or equivalent decimal-safe arithmetic for financial calculations.
- Do not claim an approximation is exact.
- Do not introduce protocol-specific math into generic CLMM modules.
- Do not over-engineer future phases before their phase begins.
- Add tests with every non-trivial calculation change.

## Before Coding
Inspect the relevant docs and current repository state. Identify the smallest change that satisfies the current phase.

## Before Finishing
Run lint/typecheck/tests/build as applicable. Report what passed, what failed, and any assumptions.
