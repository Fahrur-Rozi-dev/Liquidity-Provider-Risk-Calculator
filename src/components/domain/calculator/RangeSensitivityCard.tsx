import { Card, CardHeader } from "@/components/ui/Card";
import { formatNumber, formatSigned } from "@/utils/format";
import type { RangeSensitivityRow } from "@/services/calculator";

/**
 * Phase 4 range-sensitivity table (docs/06 "range sensitivity") — ADDITIVE
 * to the Phase 1–2 calculator. Sweeps candidate ranges around the same entry
 * price and scenario ladder. Explicitly a what-if comparison across candidate
 * settings; it never claims an optimal range (docs/06 Phase 6 rule).
 */
export function RangeSensitivityCard({ rows }: { rows: readonly RangeSensitivityRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Range sensitivity (what-if sweep)"
        actions={<span className="text-[11px] italic text-faint">Scenario comparison — not an optimal-range claim</span>}
      />
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
              <th scope="col" className="px-4 py-2 font-medium">Lower</th>
              <th scope="col" className="px-4 py-2 font-medium">Upper</th>
              <th scope="col" className="px-4 py-2 font-medium">Width</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">In-range share</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Final LP value</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Final combined PnL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.lowerPrice}-${row.upperPrice}`} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 font-mono tabular-nums">{formatNumber(row.lowerPrice, 2)}</td>
                <td className="px-4 py-2 font-mono tabular-nums">{formatNumber(row.upperPrice, 2)}</td>
                <td className="px-4 py-2 font-mono tabular-nums text-muted">
                  {formatNumber((row.upperPrice / row.lowerPrice - 1) * 100, 1)}%
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                  {(row.inRangeShare * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{formatNumber(row.finalLpValue, 2)}</td>
                <td
                  className={
                    row.finalCombinedPnl >= 0
                      ? "px-4 py-2 text-right font-mono font-medium tabular-nums text-profit"
                      : "px-4 py-2 text-right font-mono font-medium tabular-nums text-loss"
                  }
                >
                  {formatSigned(row.finalCombinedPnl, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
