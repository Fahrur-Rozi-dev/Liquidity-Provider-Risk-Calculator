# Domain Layer

Pure, deterministic calculation engines — independent from React, providers, and UI.

Boundaries (docs/02-structure.md):

| Folder      | Responsibility                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| `clmm/`     | Exact concentrated-liquidity math: sqrt price, liquidity, amounts, range state |
| `lp/`       | Position valuation, HODL benchmark, IL, scenario analysis                      |
| `hedge/`    | Short positions, hedge ratio, dynamic targets, thresholds, tranches, funding   |
| `backtest/` | Sequential historical replay — no look-ahead                                   |
| `analytics/`| LVR, volatility, range efficiency, fee/risk analysis                           |
| `pools/`    | Pool normalization helpers (data itself arrives via providers)                 |

Rules:

- Price convention everywhere: **stable-token value per 1 volatile token**.
- Decimal-safe arithmetic for money-critical math (Decimal.js when introduced).
- Every approximation labeled: Exact / Provider-reported / Estimated / Simplified.
- No protocol-specific math in generic CLMM modules.
- UI must never own financial formulas.

Folders are populated phase by phase, additively.
