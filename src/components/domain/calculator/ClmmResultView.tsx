import type { ClmmScenarioSet } from "@/services/calculator";
import type { CLMMConfig, RangeStatus } from "@/domain/clmm";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { cn } from "@/utils/cn";
import { formatNumber, formatSigned } from "@/utils/format";

import { ScenarioChartCard } from "./ScenarioChartCard";

/**
 * Phase 2 results — EXACT CLMM model (docs/06-roadmap.md Phase 2, docs/04
 * math). Results shown per docs/03-design.md: position status, token balances,
 * LP value, HODL value, IL, LP delta, hedge notional/PnL, net PnL, net delta.
 * Every number here is labeled "Exact" (docs/04 assumption labels).
 */

const STATUS_LABEL: Record<RangeStatus, string> = {
  BELOW_RANGE: "Below range",
  IN_RANGE: "In range",
  ABOVE_RANGE: "Above range",
};

export function ClmmResultView({
  scenario,
  clmm,
  stable,
  volatile,
}: {
  scenario: ClmmScenarioSet;
  clmm: CLMMConfig;
  stable: string;
  volatile: string;
}) {
  const { summary, points } = scenario;

  // HODL PnL (hodl value − initial value) contextualizes IL on the chart.
  const series = [
    {
      name: "LP PnL",
      strokeClass: "stroke-faint",
      points: points.map((p) => ({ x: p.price, y: p.lpPnl })),
    },
    {
      name: "HODL PnL",
      strokeClass: "stroke-text",
      points: points.map((p) => ({
        x: p.price,
        y: p.hodlValue - summary.initialLpValue,
      })),
    },
    {
      name: "Hedge PnL",
      strokeClass: "stroke-warn",
      points: points.map((p) => ({ x: p.price, y: p.hedgePnl })),
    },
    {
      name: "Combined PnL",
      strokeClass: "stroke-accent",
      points: points.map((p) => ({ x: p.price, y: p.combinedPnl })),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Entry price"
          value={formatNumber(clmm.entryPrice, 2)}
          sub={`${stable} per 1 ${volatile}`}
        />
        <StatTile
          label="Initial LP value"
          value={formatNumber(summary.initialLpValue, 2)}
          sub={stable}
        />
        <StatTile
          label="Liquidity L"
          value={formatNumber(summary.liquidityL, 2)}
          sub="derived from initial value"
        />
        <StatTile
          label="Initial amounts"
          value={`${formatNumber(summary.initialAmountVolatile, 4)} ${volatile}`}
          sub={`${formatNumber(summary.initialAmountStable, 2)} ${stable}`}
        />
        <StatTile
          label="LP delta (entry)"
          value={formatNumber(summary.lpDeltaAtEntry, 4)}
          sub={`${volatile} per 1 ${stable} of price`}
        />
        <StatTile
          label="Hedge notional (entry)"
          value={formatNumber(summary.hedgeNotionalAtEntry, 2)}
          sub={`${formatNumber(summary.hedgeQuantity, 4)} ${volatile} short`}
        />
        <StatTile
          label="Net delta (entry)"
          value={formatNumber(summary.netDeltaAtEntry, 4)}
          sub="LP delta − short quantity"
        />
        <StatTile
          label="Range"
          value={`${formatNumber(clmm.lowerPrice, 2)} – ${formatNumber(clmm.upperPrice, 2)}`}
          sub={`${stable} per 1 ${volatile}`}
        />
      </div>

      <ScenarioChartCard
        series={series}
        xLabel={`Price (${stable})`}
        ariaLabel={`Line chart of LP PnL, HODL PnL, hedge PnL and combined PnL from ${stable} per ${volatile} prices (exact CLMM model)`}
      />

      <Card>
        <CardHeader
          title={`Scenario table (${stable} per 1 ${volatile})`}
          actions={<Badge variant="profit">Exact</Badge>}
        />
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-4 py-2 font-medium">Price</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
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
                  HODL value
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  IL
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
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  LP delta
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Net delta
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-mono tabular-nums">
                    {formatNumber(point.price, 2)}
                  </td>
                  <td className="px-4 py-2 text-[11px] uppercase tracking-wide text-muted">
                    {STATUS_LABEL[point.rangeStatus]}
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
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                    {formatNumber(point.hodlValue, 2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatSigned(point.il, 2)}
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
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                    {formatNumber(point.lpDelta, 4)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatNumber(point.netDelta, 4)}
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
