# Current Rebuild Contract

## Starting Point
The previous repository suffered from phase-overwrite problems:
- later phases replaced the visible application
- routing was not treated as a first-class architecture
- UI and domain evolution became coupled
- one phase could effectively erase another phase's user experience

This rebuild intentionally starts from zero.

## Important
Do not import old source files simply because they exist in Git history.

The old implementation can be referenced conceptually, but the new implementation should follow this documentation.

## First Build Target
Before implementing advanced financial logic, establish:
1. project scaffold
2. application shell
3. route architecture
4. shared UI primitives
5. domain boundaries
6. testing foundation
7. documentation-driven workflow

Then implement phases sequentially.

## Expected End State

The application should feel like one coherent product with multiple research workspaces:

Overview
Calculator
Hedge
Backtest
Pools
Analytics
Realtime Monitor
Alerts
Settings

All workspaces share consistent navigation and domain engines without becoming one giant application state.

## Success Definition
The project is successful when adding Phase 5, 6, 7, or 8 can never require deleting or replacing the earlier pages.
