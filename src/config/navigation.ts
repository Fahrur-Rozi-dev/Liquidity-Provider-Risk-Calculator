/**
 * Route registry — single source of truth for navigation, page headers, and the
 * route regression gate (docs/02-structure.md route map + docs/10-quality-gates.md).
 *
 * Routes are ADDITIVE: a new phase adds entries here, it never replaces them.
 */

export type RouteStatus = "in-progress" | "planned";

export interface AppRoute {
  id: string;
  href: string;
  /** Short label used in the sidebar. */
  label: string;
  /** Page title used in the top bar and page header. */
  title: string;
  /** Phase that introduces this workspace, per docs/06-roadmap.md. */
  phaseLabel: string;
  status: RouteStatus;
  description: string;
  /** Planned capabilities, quoted from docs/06-roadmap.md deliverables. */
  deliverables: readonly string[];
}

export const ROUTES: readonly AppRoute[] = [
  {
    id: "overview",
    href: "/",
    label: "Overview",
    title: "Overview",
    phaseLabel: "Phase 0",
    status: "in-progress",
    description:
      "Product status board, build principles, and the read-only security boundary that governs every phase.",
    deliverables: [],
  },
  {
    id: "calculator",
    href: "/calculator",
    label: "Calculator",
    title: "Calculator",
    phaseLabel: "Phase 1–2",
    status: "in-progress",
    description:
      "Manual LP + CLMM calculator: position valuation, scenario prices, LP vs HODL, IL, delta, hedge PnL, and combined PnL.",
    deliverables: [
      "Grouped inputs: pool/pair, position, price range, hedge, costs/fees, scenario",
      "Scenario price engine",
      "LP value vs HODL benchmark and impermanent loss",
      "LP delta, hedge notional, hedge PnL, net PnL",
      "Charts for patterns, tables for exact values",
    ],
  },
  {
    id: "hedge",
    href: "/hedge",
    label: "Hedge",
    title: "Dynamic Hedge",
    phaseLabel: "Phase 4",
    status: "planned",
    description:
      "Dynamic hedge simulator: fixed, dynamic and threshold-based modes with tranches, funding and rebalance costs.",
    deliverables: [
      "Fixed hedge, dynamic hedge and threshold modes",
      "Configurable target hedge ratio (default 75%)",
      "Tranche tracking with FIFO reductions",
      "Funding modeled separately from price PnL",
      "Rebalance costs: trading fee, slippage, optional fixed cost",
      "Cooldown / minimum rebalance constraints and event log",
    ],
  },
  {
    id: "backtest",
    href: "/backtest",
    label: "Backtest",
    title: "Backtest",
    phaseLabel: "Phase 5",
    status: "planned",
    description:
      "Sequential historical replay of LP and hedge strategies with strict no-look-ahead discipline.",
    deliverables: [
      "CSV / provider abstraction for historical price series",
      "Validated PricePoint series with data-quality metadata",
      "Sequential replay engine, no look-ahead",
      "Equity curve, drawdown, Sharpe / Sortino",
      "Benchmarks and regime breakdown",
      "Funding and cost breakdown, exports",
    ],
  },
  {
    id: "pools",
    href: "/pools",
    label: "Pools",
    title: "Pools",
    phaseLabel: "Phase 3",
    status: "in-progress",
    description:
      "Real pool data through a read-only provider abstraction: discovery, detail, normalized snapshots and history.",
    deliverables: [
      "PoolDataProvider abstraction with normalized snapshots",
      "Pool discovery and pool detail",
      "Historical pool data and fee data with clear fee classification",
      "Cache, rate-limit and freshness handling",
      "Integration with calculator and backtest engines",
      "Raydium CLMM first; Meteora DLMM only with protocol-specific modeling",
    ],
  },
  {
    id: "analytics",
    href: "/analytics",
    label: "Analytics",
    title: "Analytics",
    phaseLabel: "Phase 6",
    status: "planned",
    description:
      "Advanced LP analytics: LVR / adverse selection, volatility, range efficiency and fee-vs-risk trade-offs.",
    deliverables: [
      "LVR / adverse selection as analytical metrics",
      "Volatility and range efficiency",
      "Fee vs risk analysis",
      "Sensitivity analysis",
      "Comparative analytics across positions and pools",
    ],
  },
  {
    id: "monitor",
    href: "/monitor",
    label: "Monitor",
    title: "Realtime Monitor",
    phaseLabel: "Phase 7",
    status: "planned",
    description:
      "Read-only realtime monitoring: fresh price and pool metrics with simulated LP and hedge state.",
    deliverables: [
      "Realtime price and pool metrics (read-only)",
      "Simulated LP state and hedge state",
      "Funding and PnL tracking",
      "Explicit freshness: live / updating / stale / provider error",
      "No wallet, no signing, no execution, no auto-rebalance",
    ],
  },
  {
    id: "alerts",
    href: "/alerts",
    label: "Alerts",
    title: "Alerts",
    phaseLabel: "Phase 8",
    status: "planned",
    description:
      "Intelligence layer over normalized realtime data producing explanations, warnings and suggestions — informational only.",
    deliverables: [
      "Risk explanations",
      "Threshold warnings (e.g. LP near lower bound, residual delta above target)",
      "Rebalance and hedge suggestions — never executed",
      "Anomaly alerts",
      "Data-quality warnings",
    ],
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    title: "Settings",
    phaseLabel: "—",
    status: "planned",
    description: "Application, provider and display settings for the workspace.",
    deliverables: [
      "Data provider selection and configuration",
      "Display and formatting preferences",
      "Alert thresholds",
    ],
  },
];

/** Resolve a route from a pathname: exact match first, then longest prefix. */
export function getRouteByPath(pathname: string): AppRoute | undefined {
  const exact = ROUTES.find((route) => route.href === pathname);
  if (exact) return exact;
  return ROUTES.filter((route) => route.href !== "/" && pathname.startsWith(`${route.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
