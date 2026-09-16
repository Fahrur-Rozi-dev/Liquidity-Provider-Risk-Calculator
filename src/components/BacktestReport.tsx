import React, { useMemo } from 'react';
import { SimulationResult, CalculatorState } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";

interface Props {
  state: CalculatorState;
  results: {
    fixed: SimulationResult;
    dynamic: SimulationResult;
    threshold: SimulationResult;
  };
}

export function BacktestReport({ state, results }: Props) {
  const activeResult = results[state.strategyMode.toLowerCase() as keyof typeof results];

  const chartData = useMemo(() => {
    return activeResult.snapshots.map(s => {
      const date = new Date(s.timestamp).toLocaleDateString() + ' ' + new Date(s.timestamp).toLocaleTimeString();
      return {
        timestampLabel: date,
        timestamp: s.timestamp,
        price: s.price,
        equity: s.equity,
        lpEquity: state.totalCapital + s.lpPnL,
        hodlEquity: s.hodlValue,
        hodlPlusHedgeEquity: s.hodlValue + s.shortPnL,
        drawdownPercent: ((s.equity - Math.max(state.totalCapital, ...activeResult.snapshots.slice(0, s.stepIndex + 1).map(x=>x.equity))) / Math.max(state.totalCapital, ...activeResult.snapshots.slice(0, s.stepIndex + 1).map(x=>x.equity))) * 100
      };
    });
  }, [activeResult, state.totalCapital]);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ state, metrics: activeResult.metrics, snapshots: activeResult.snapshots }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${state.strategyMode}_${new Date().getTime()}.json`;
    a.click();
  };

  const m = activeResult.metrics;

  return (
    <div className="space-y-8 mt-8">

      {/* Configuration & Warnings */}
      {activeResult.warnings.length > 0 && (
         <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-700 dark:text-amber-400 text-xs">
           <strong className="block mb-1">Warnings:</strong>
           <ul className="list-disc pl-5 space-y-1">
             {activeResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
           </ul>
         </div>
      )}

      {/* Equity Curve Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-sm font-semibold">Equity Curve ({state.strategyMode})</h3>
           <button onClick={handleExportJSON} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors">Export JSON</button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="timestampLabel" fontSize={10} tickMargin={10} minTickGap={50} />
              <YAxis fontSize={10} tickMargin={10} tickFormatter={(val) => `$${val}`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Line type="monotone" name="Strategy Equity" dataKey="equity" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line type="monotone" name="LP Only Equity" dataKey="lpEquity" stroke="#3b82f6" strokeWidth={1} dot={false} />
              <Line type="monotone" name="HODL Equity" dataKey="hodlEquity" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" name="HODL + Hedge Equity" dataKey="hodlPlusHedgeEquity" stroke="#6366f1" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drawdown Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-6">Drawdown %</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="timestampLabel" fontSize={10} tickMargin={10} minTickGap={50} />
              <YAxis fontSize={10} tickMargin={10} tickFormatter={(val) => `${val}%`} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="drawdownPercent" fill="#ef4444" stroke="#ef4444" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Backtest Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Return Metrics */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Return Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Initial Capital</span>
              <span className="font-medium">${m.initialCapital.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Final Equity</span>
              <span className="font-medium">${m.finalEquity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Return</span>
              <span className={`font-medium ${m.totalReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {m.totalReturnPercent.toFixed(2)}%
              </span>
            </div>
            {m.annualizedReturnPercent !== null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Annualized Return</span>
                <span className="font-medium">{m.annualizedReturnPercent.toFixed(2)}%</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-500">Win Rate (Positive PnL Periods)</span>
              <span className="font-medium">{m.winRatePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Risk & Volatility</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Max Drawdown</span>
              <span className="font-medium text-rose-500">${m.maxDrawdownUSD.toFixed(2)} ({m.maxDrawdownPercent.toFixed(2)}%)</span>
            </div>
            {m.volatilityAnnualized !== null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Annualized Volatility</span>
                <span className="font-medium">{m.volatilityAnnualized.toFixed(2)}%</span>
              </div>
            )}
            {m.sharpeRatio !== null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Sharpe Ratio</span>
                <span className="font-medium">{m.sharpeRatio.toFixed(2)}</span>
              </div>
            )}
            {m.sortinoRatio !== null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Sortino Ratio</span>
                <span className="font-medium">{m.sortinoRatio.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-500">Max Abs Net Delta</span>
              <span className="font-medium">${m.maxAbsNetDelta.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PnL Attribution / Waterfall */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">PnL Attribution</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">LP Asset PnL</span>
              <span className={`font-medium ${m.lpPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${m.lpPnL.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Short PnL</span>
              <span className={`font-medium ${m.shortPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${m.shortPnL.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Fee Income</span>
              <span className="font-medium text-emerald-500">${m.feeIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Funding (Paid)</span>
              <span className="font-medium text-rose-500">-${m.fundingPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Trading Costs</span>
              <span className="font-medium text-rose-500">-${(m.rebalanceFees + m.slippage + m.gasCosts).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2 font-bold">
              <span className="text-zinc-900 dark:text-zinc-100">Combined Net PnL</span>
              <span className={`${m.combinedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                 ${(m.lpPnL + m.shortPnL + m.feeIncome - m.fundingPaid - m.rebalanceFees - m.slippage - m.gasCosts).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
        <p><strong>Backtesting Limitations:</strong> Historical simulation does not guarantee future results. Fee income may be estimated rather than actual user-earned fees. Execution at candle close does not represent exact intrabar execution pathing. Slippage and gas are modeled assumptions unless actual historical data is supplied.</p>
      </div>
    </div>
  );
}
