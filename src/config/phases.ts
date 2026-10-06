/**
 * Phase registry — docs/06-roadmap.md.
 * Each phase ADDS capability and must never replace or erase an earlier phase.
 */

export type PhaseStatus = "complete" | "in-progress" | "planned";

export interface PhaseInfo {
  id: number;
  name: string;
  status: PhaseStatus;
  /** Routes the phase introduces, if any. */
  routes: readonly string[];
  summary: string;
}

export const PHASES: readonly PhaseInfo[] = [
  {
    id: 0,
    name: "Foundation",
    status: "complete",
    routes: ["/"],
    summary:
      "Scaffold, app shell, route skeleton, design system, domain boundaries, test infrastructure.",
  },
  {
    id: 1,
    name: "Basic Calculator",
    status: "complete",
    routes: ["/calculator"],
    summary:
      "Simplified LP model + basic short hedge: inputs, scenario prices, LP value, hedge PnL, combined PnL.",
  },
  {
    id: 2,
    name: "Exact CLMM",
    status: "complete",
    routes: ["/calculator"],
    summary:
      "Exact concentrated-liquidity math: sqrt price, liquidity, token amounts, HODL, IL, delta, range status, scenario engine.",
  },
  {
    id: 3,
    name: "Production Data Foundation",
    status: "in-progress",
    routes: ["/pools"],
    summary:
      "Normalized data contracts, read-only provider interfaces, Raydium CLMM adapter, deterministic fixtures, pool discovery/detail, calculator integration.",
  },
  {
    id: 4,
    name: "Dynamic Hedge",
    status: "planned",
    routes: ["/hedge"],
    summary:
      "Fixed/dynamic/threshold hedge, target ratio, tranches, FIFO, funding, costs, cooldown, event log — on normalized data and the existing CLMM engine.",
  },
  {
    id: 5,
    name: "Historical Backtest",
    status: "planned",
    routes: ["/backtest"],
    summary:
      "Sequential replay with no look-ahead: historical provider, equity, drawdown, Sharpe/Sortino, benchmarks, regimes, exports.",
  },
  {
    id: 6,
    name: "Advanced Analytics",
    status: "planned",
    routes: ["/analytics"],
    summary:
      "LVR/adverse selection, volatility, range efficiency, fee vs risk, sensitivity, comparative analytics.",
  },
  {
    id: 7,
    name: "Realtime Monitoring",
    status: "planned",
    routes: ["/monitor"],
    summary:
      "Read-only realtime price, pool metrics, simulated LP/hedge state, funding, PnL, freshness, alerts.",
  },
  {
    id: 8,
    name: "Realtime Intelligence",
    status: "planned",
    routes: ["/alerts"],
    summary:
      "Risk explanations, threshold warnings, suggestions, anomaly and data-quality alerts — informational only.",
  },
];
