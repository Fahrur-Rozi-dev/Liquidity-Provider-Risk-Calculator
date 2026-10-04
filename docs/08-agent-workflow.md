# AI Agent Workflow

## Step 1 — Read
Read:
- AGENTS.md
- relevant docs
- current route/file structure

## Step 2 — Understand
Before editing, identify:
- current phase
- affected domains
- affected routes
- dependencies
- existing contracts that must remain stable

## Step 3 — Plan
Write a short implementation plan internally:
1. files to add
2. files to modify
3. files that must not change
4. tests needed
5. acceptance criteria

If the requested change conflicts with the docs, ask/flag before implementation.

## Step 4 — Implement
Implement in small coherent units.

Prefer:
- domain code first
- tests
- service/provider integration
- UI
- polish

## Step 5 — Validate
Run:
- typecheck
- lint
- unit tests
- integration tests where relevant
- production build

Fix regressions before proceeding.

## Step 6 — Review
Check:
- Did any route disappear?
- Did any existing capability disappear?
- Did price convention change?
- Did an estimate become mislabeled?
- Did a provider concern leak into domain code?
- Did a new dependency create unnecessary coupling?
- Did the change violate realtime security boundaries?

## Step 7 — Report
Final report should include:
- implemented
- files changed
- tests run
- known limitations
- assumptions
- next recommended step

## Phase Discipline
Only implement the requested phase unless a prerequisite is objectively necessary.

If a prerequisite is necessary:
1. explain why
2. implement the minimum prerequisite
3. do not silently expand scope

## Rebuild Rule
Because this project is being rebuilt from zero, do not attempt to recover old application code unless explicitly requested. The old repository is historical context, not an implementation dependency.
