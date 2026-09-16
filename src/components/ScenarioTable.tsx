import React from "react";
import { ScenarioRow } from "@/types";

interface ScenarioTableProps {
  scenarios: ScenarioRow[];
  isClmm: boolean;
}

export function ScenarioTable({ scenarios, isClmm }: ScenarioTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold">Scenario Analysis</h3>
        <span className="text-xs text-zinc-500">Values calculated at target prices</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
            <tr>
              <th className="px-3 py-3 font-medium">Price Change</th>
              <th className="px-3 py-3 font-medium">Target Price</th>
              {isClmm && <th className="px-3 py-3 font-medium">Status</th>}
              <th className="px-3 py-3 font-medium">SOL</th>
              {isClmm && <th className="px-3 py-3 font-medium">USDC</th>}
              <th className="px-3 py-3 font-medium">LP Value</th>
              {isClmm && <th className="px-3 py-3 font-medium">IL $</th>}
              <th className="px-3 py-3 font-medium">Net Delta</th>
              <th className="px-3 py-3 font-medium">Hedge Ratio</th>
              <th className="px-3 py-3 font-medium">Total Net PnL</th>
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
                  <td className={`px-3 py-3 font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {row.priceChangePercent > 0 ? '+' : ''}{row.priceChangePercent}%
                    {isCurrent && ' (Current)'}
                  </td>
                  <td className="px-3 py-3">${row.targetPrice.toFixed(2)}</td>

                  {isClmm && (
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        row.rangeStatus === 'IN_RANGE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {row.rangeStatus === 'IN_RANGE' ? 'IN' : row.rangeStatus === 'BELOW_RANGE' ? 'BELOW' : 'ABOVE'}
                      </span>
                    </td>
                  )}

                  <td className="px-3 py-3">{row.amountSOL?.toFixed(4)}</td>

                  {isClmm && (
                    <td className="px-3 py-3">${row.amountUSDC?.toFixed(2)}</td>
                  )}

                  <td className="px-3 py-3">${row.lpValue?.toFixed(2)}</td>

                  {isClmm && (
                    <td className={`px-3 py-3 ${row.ilUSD! < 0 ? 'text-rose-500' : ''}`}>
                      {row.ilUSD?.toFixed(2)}
                      <span className="text-[10px] text-zinc-400 ml-1">({row.ilPercent?.toFixed(1)}%)</span>
                    </td>
                  )}

                  <td className="px-3 py-3">${row.netDelta?.toFixed(2)}</td>

                  <td className="px-3 py-3">{row.effectiveHedgeRatio.toFixed(1)}%</td>

                  <td className={`px-3 py-3 font-semibold ${row.totalPnLAfterCosts! > 0 ? 'text-emerald-500' : row.totalPnLAfterCosts! < 0 ? 'text-rose-500' : ''}`}>
                    {row.totalPnLAfterCosts! > 0 ? '+' : ''}{row.totalPnLAfterCosts?.toFixed(2)}
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
