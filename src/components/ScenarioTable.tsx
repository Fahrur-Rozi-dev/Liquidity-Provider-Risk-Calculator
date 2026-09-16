import React from "react";
import { ScenarioRow } from "@/types";

interface ScenarioTableProps {
  scenarios: ScenarioRow[];
}

export function ScenarioTable({ scenarios }: ScenarioTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold">Scenario Analysis</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Price Change</th>
              <th className="px-4 py-3 font-medium">Target Price</th>
              <th className="px-4 py-3 font-medium">Asset Value</th>
              <th className="px-4 py-3 font-medium">Asset PnL</th>
              <th className="px-4 py-3 font-medium">Short PnL</th>
              <th className="px-4 py-3 font-medium">Effective Hedge</th>
              <th className="px-4 py-3 font-medium">Fees</th>
              <th className="px-4 py-3 font-medium">Costs</th>
              <th className="px-4 py-3 font-medium">Net PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {scenarios.map((row, i) => {
              const isCurrent = row.priceChangePercent === 0;
              return (
                <tr
                  key={i}
                  className={isCurrent ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors"}
                >
                  <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {row.priceChangePercent > 0 ? '+' : ''}{row.priceChangePercent}%
                    {isCurrent && ' (Current)'}
                  </td>
                  <td className="px-4 py-3">${row.targetPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">${row.assetValue.toFixed(2)}</td>
                  <td className={`px-4 py-3 ${row.assetPnL > 0 ? 'text-emerald-500' : row.assetPnL < 0 ? 'text-rose-500' : ''}`}>
                    {row.assetPnL > 0 ? '+' : ''}{row.assetPnL.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 ${row.shortPnL > 0 ? 'text-emerald-500' : row.shortPnL < 0 ? 'text-rose-500' : ''}`}>
                    {row.shortPnL > 0 ? '+' : ''}{row.shortPnL.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">{row.effectiveHedgeRatio.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-emerald-500">${row.fees.toFixed(2)}</td>
                  <td className="px-4 py-3 text-rose-500">${row.costs.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-semibold ${row.netPnL > 0 ? 'text-emerald-500' : row.netPnL < 0 ? 'text-rose-500' : ''}`}>
                    {row.netPnL > 0 ? '+' : ''}{row.netPnL.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
