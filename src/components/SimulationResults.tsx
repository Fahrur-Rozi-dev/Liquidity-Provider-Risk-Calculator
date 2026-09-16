import React from 'react';
import { SimulationResult, CalculatorState, BacktestMetrics } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";

interface Props {
  state: CalculatorState;
  results: {
    fixed: SimulationResult;
    dynamic: SimulationResult;
    threshold: SimulationResult;
  };
}

export function SimulationResults({ state, results }: Props) {
  // Use the active strategy mode for charts and logs
  const activeResult = results[state.strategyMode.toLowerCase() as keyof typeof results];

  const chartData = activeResult.snapshots.map(s => ({
    stepIndex: s.stepIndex,
    price: s.price,
    effectiveHedgeRatio: s.effectiveHedgeRatio || 0,
    netDeltaUSD: s.netDeltaUSD,
    cumulativePnL: s.cumulativePnL,
    lpPnL: s.lpPnL,
    shortPnL: s.shortPnL,
    fundingCost: s.fundingCost,
    tradingCosts: s.rebalanceCost + s.slippageCost,
    cumulativeTradingCosts: 0 // Will map cumulatively below
  }));

  let cumTC = 0;
  chartData.forEach(d => {
    cumTC += d.tradingCosts;
    d.cumulativeTradingCosts = cumTC;
  });

  return (
    <div className="space-y-8 mt-8">

      {/* Strategy Comparison Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold">Strategy Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium text-right">Fixed</th>
                <th className="px-4 py-3 font-medium text-right">Dynamic</th>
                <th className="px-4 py-3 font-medium text-right">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {[
                { label: 'Final LP Value', key: 'finalLpValue', isCurrency: true },
                { label: 'LP PnL', key: 'lpPnL', isCurrency: true },
                { label: 'Short PnL', key: 'totalShortPnL', isCurrency: true },
                { label: 'Funding Paid', key: 'totalFundingPaid', isCurrency: true },
                { label: 'Rebalance Costs', key: 'totalRebalanceFees', isCurrency: true },
                { label: 'Slippage', key: 'totalSlippage', isCurrency: true },
                { label: 'Total Hedge Cost', key: 'totalHedgeTradingCosts', isCurrency: true },
                { label: 'Combined PnL', key: 'combinedPnL', isCurrency: true },
                { label: 'Total Net PnL', key: 'totalNetPnL', isCurrency: true, isBold: true },
                { label: 'Avg Hedge Ratio', key: 'avgHedgeRatio', isPercent: true },
                { label: 'Max Abs Net Delta', key: 'maxAbsNetDelta', isCurrency: true },
                { label: 'Number of Rebalances', key: 'numberOfRebalances' },
                { label: 'Total Notional Traded', key: 'totalNotionalTraded', isCurrency: true },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                  <td className={`px-4 py-2 text-zinc-500 ${row.isBold ? 'font-bold text-zinc-900 dark:text-white' : ''}`}>
                    {row.label}
                  </td>
                  {(['fixed', 'dynamic', 'threshold'] as const).map(mode => {
                    const val = results[mode].metrics[row.key as keyof BacktestMetrics] as number;
                    return (
                      <td key={mode} className={`px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                        {row.isCurrency && val < 0 ? '-' : ''}
                        {row.isCurrency ? '$' : ''}
                        {Math.abs(val).toFixed(2)}
                        {row.isPercent ? '%' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Hedge Ratio vs Step */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-6">Hedge Ratio vs Step ({state.strategyMode})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="stepIndex" fontSize={10} tickMargin={10} />
                <YAxis fontSize={10} tickMargin={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />

                <ReferenceLine y={state.targetHedgeRatio} stroke="#9ca3af" strokeDasharray="3 3" />
                {state.strategyMode === 'THRESHOLD' && (
                  <>
                    <ReferenceLine y={state.rebalanceLowerThreshold} stroke="#fbbf24" strokeDasharray="3 3" />
                    <ReferenceLine y={state.rebalanceUpperThreshold} stroke="#fbbf24" strokeDasharray="3 3" />
                  </>
                )}

                <Line type="stepAfter" dataKey="effectiveHedgeRatio" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Delta vs Step */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-6">Net Delta USD vs Step ({state.strategyMode})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="stepIndex" fontSize={10} tickMargin={10} />
                <YAxis fontSize={10} tickMargin={10} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="#9ca3af" />

                <Area type="monotone" dataKey="netDeltaUSD" fill="#6366f1" stroke="#4f46e5" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative PnL vs Step */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold mb-6">Cumulative PnL Components ({state.strategyMode})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="stepIndex" fontSize={10} tickMargin={10} />
                <YAxis fontSize={10} tickMargin={10} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <ReferenceLine y={0} stroke="#9ca3af" />

                <Line type="monotone" name="LP PnL" dataKey="lpPnL" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Short PnL" dataKey="shortPnL" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Cum. Trading Costs" dataKey="cumulativeTradingCosts" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Total Net PnL" dataKey="cumulativePnL" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rebalance Events Log */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Rebalance Events Log ({state.strategyMode})</h3>
          <span className="text-xs text-zinc-500">{activeResult.events.length} events</span>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Step</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Prev Short</th>
                <th className="px-4 py-3 font-medium">Adjustment</th>
                <th className="px-4 py-3 font-medium">Target Short</th>
                <th className="px-4 py-3 font-medium">HR Shift</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Realized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {activeResult.events.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-4 text-center text-zinc-500">No rebalance events occurred.</td></tr>
              ) : (
                activeResult.events.map((ev, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2">{ev.timestamp}</td>
                    <td className="px-4 py-2">${ev.price.toFixed(2)}</td>
                    <td className="px-4 py-2">${ev.previousShortNotional.toFixed(2)}</td>
                    <td className={`px-4 py-2 font-medium ${ev.hedgeAdjustment.gt(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {ev.hedgeAdjustment.gt(0) ? '+' : ''}{ev.hedgeAdjustment.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">${ev.targetShortNotional.toFixed(2)}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {ev.previousHedgeRatio.toFixed(1)}% → {ev.newHedgeRatio.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-rose-500">${ev.tradingCost.plus(ev.slippageCost).toFixed(2)}</td>
                    <td className={`px-4 py-2 ${ev.realizedPnL.gt(0) ? 'text-emerald-500' : ev.realizedPnL.lt(0) ? 'text-rose-500' : ''}`}>
                      {ev.realizedPnL.gt(0) ? '+' : ''}{ev.realizedPnL.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
