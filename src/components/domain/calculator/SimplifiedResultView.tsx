import type { ScenarioSet } from "@/services/calculator";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { cn } from "@/utils/cn";
import { formatNumber, formatSigned } from "@/utils/format";

import { ScenarioChartCard } from "./ScenarioChartCard";

/**
 * Phase 1 results — simplified constant-product model (docs/06-roadmap.md
 * Phase 1). Preserved as Phase 2 adds the exact CLMM view alongside it;
 * every number here is a "Simplified model" estimate (docs/04).
 */
export function SimplifiedResultView({
  scenario,
  stable,
  volatile,
}: {
  scenario: ScenarioSet;
  stable: string;
  volatile: string;
}) {
  const series = [
    {
      name: "LP PnL",
      strokeClass: "stroke-faint",
      points: scenario.points.map((p) => ({ x: p.price, y: p.lpPnl })),
    },
    {
      name: "Hedge PnL",
      strokeClass: "stroke-warn",
      points: scenario.points.map((p) => ({ x: p.price, y: p.hedgePnl })),
    },
    {
      name: "Combined PnL",
      strokeClass: "stroke-accent",
      points: scenario.points.map((p) => ({ x: p.price, y: p.combinedPnl })),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Initial LP value"
          value={formatNumber(scenario.summary.initialLpValue, 2)}
          sub={stable}
        />
        <StatTile
          label="Hedge notional (entry)"
          value={formatNumber(scenario.summary.hedgeNotionalAtEntry, 2)}
          sub={`${formatNumber(scenario.summary.hedgeQuantity, 4)} ${volatile} short`}
        />
        <StatTile
          label="Hedge quantity"
          value={formatNumber(scenario.summary.hedgeQuantity, 4)}
          sub={volatile}
        />
      </div>

      <ScenarioChartCard
        series={series}
        xLabel={`Price (${stable})`}
        ariaLabel={`Line chart of LP PnL, hedge PnL and combined PnL from ${stable} per ${volatile} prices (simplified model)`}
      />

      <Card>
        <CardHeader
          title={`Scenario table (${stable} per 1 ${volatile})`}
          actions={<Badge variant="warn">Simplified model</Badge>}
        />
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-4 py-2 font-medium">Price</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {volatile} amount
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {stable} amount
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  LP value
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  LP PnL
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Hedge PnL
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Combined PnL
                </th>
              </tr>
            </thead>
            <tbody>
              {scenario.points.map((point, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-mono tabular-nums">
                    {formatNumber(point.price, 2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                    {formatNumber(point.amountVolatile, 4)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                    {formatNumber(point.amountStable, 2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatNumber(point.lpValue, 2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatSigned(point.lpPnl, 2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatSigned(point.hedgePnl, 2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right font-mono font-medium tabular-nums",
                      point.combinedPnl > 0 && "text-profit",
                      point.combinedPnl < 0 && "text-loss",
                    )}
                  >
                    {formatSigned(point.combinedPnl, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
