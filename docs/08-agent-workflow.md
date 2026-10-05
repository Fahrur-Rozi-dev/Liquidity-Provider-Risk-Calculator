# AI Agent Workflow

## Mission

Implement the project with minimum unnecessary token usage, minimum rework, and maximum reuse of existing architecture.

The agent is an implementer, not a reason to redesign completed work.

## Step 1 — Read Only What Is Relevant

Always read:
- AGENTS.md
- the requested Linear issue
- the specific docs named by the issue
- directly relevant source files

Do NOT read the entire repository by default.

Search for existing contracts, engines, components, and tests before creating new ones.

## Step 2 — Understand the Current State

Before editing, identify:
- current phase
- issue acceptance criteria
- affected domains
- affected routes
- existing contracts
- existing tests
- dependencies
- files that must remain stable

The current repository state is authoritative over assumptions from older phases.

## Step 3 — Reuse Before Creating

Before adding a new abstraction:
1. search for an existing equivalent
2. reuse it if compatible
3. extend it if necessary
4. create a new abstraction only when the existing one cannot safely support the requirement

Never create duplicate:
- price models
- pool models
- CLMM math
- hedge math
- PnL calculations
- provider contracts
- scenario engines

## Step 4 — Production Architecture First

If a feature will eventually use real external data, establish the production-facing contract before building feature-specific mocks.

Allowed:
- deterministic fixture providers
- fake providers for unit tests
- local fixtures for offline development

Required:
- fixtures implement the same interfaces as production providers
- normalized types are shared
- domain engines do not know whether data came from a fixture or production provider

Forbidden:
- temporary provider models that will later be discarded
- separate mock-only calculation paths
- hardcoded sample data embedded in domain logic
- provider-specific response shapes leaking into UI/domain code

## Step 5 — Plan

Before implementation, define:
1. files to add
2. files to modify
3. files that must not change
4. existing contracts to reuse
5. tests needed
6. acceptance criteria

If the issue conflicts with the architecture docs, stop and flag the conflict instead of silently redesigning.

## Step 6 — Implement in Small Units

Preferred order:
1. contracts/types
2. domain/service logic
3. provider adapter
4. tests
5. UI integration
6. polish

Do not implement future phases unless they are a necessary prerequisite.

## Step 7 — Validate

Run the smallest useful validation first:
- focused unit tests
- focused integration tests

Then run:
- typecheck
- lint
- full unit tests
- production build

Do not repeatedly run the full suite after every tiny edit.

## Step 8 — Review for Regressions

Check:
- Did any route disappear?
- Did any existing capability disappear?
- Did any domain calculation get duplicated?
- Did provider concerns leak into domain/UI code?
- Did price/token conventions change?
- Did an estimate become mislabeled?
- Did a new dependency create unnecessary coupling?
- Did realtime security boundaries change?
- Is stale data clearly distinguishable from live data?

## Step 9 — Report

Final report must include:
- implemented
- files changed
- tests run
- known limitations
- assumptions
- next recommended issue

Keep the report concise.

## Linear Workflow

Linear is the project management source of truth.

Each implementation task should correspond to a Linear issue with:
- clear scope
- acceptance criteria
- relevant docs
- explicit non-goals
- test requirements

Recommended flow:

```
Linear Issue
   ↓
Agent reads issue + targeted docs
   ↓
Search existing code
   ↓
Implement
   ↓
Test
   ↓
Review
   ↓
PR / merge
   ↓
Close Linear issue
```

Do not give the coding agent a vague instruction such as "implement Phase 3". Give it one bounded issue at a time.

## Phase Discipline

Only implement the requested issue.

If a prerequisite is necessary:
1. explain why
2. create or reference the prerequisite issue
3. implement only the minimum required prerequisite
4. do not silently expand scope

## Rebuild Rule

The current rebuild is the source of truth.

Do not recover old application code from Git history unless explicitly requested.
