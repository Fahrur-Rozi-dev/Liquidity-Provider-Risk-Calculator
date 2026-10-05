import { LineChart, type ChartSeries } from "@/components/charts/LineChart";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

/**
 * Chart card shared by the calculator result views (docs/03-design.md: charts
 * illustrate patterns, tables carry the exact values).
 */
export function ScenarioChartCard({
  series,
  ariaLabel,
  xLabel,
  yLabel = "PnL",
}: {
  series: readonly ChartSeries[];
  ariaLabel: string;
  xLabel: string;
  yLabel?: string;
}) {
  return (
    <Card>
      <CardHeader
        title="PnL vs price"
        actions={
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn("inline-block h-0.5 w-4", s.strokeClass)}
                />
                {s.name}
              </span>
            ))}
          </div>
        }
      />
      <div className="px-2 py-3">
        <LineChart
          series={series}
          xLabel={xLabel}
          yLabel={yLabel}
          includeZero
          ariaLabel={ariaLabel}
        />
      </div>
    </Card>
  );
}
