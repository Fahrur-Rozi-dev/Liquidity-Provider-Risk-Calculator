import React from "react";
import { CalculatorState, TotalResult } from "@/types";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface DashboardProps {
  state: CalculatorState;
  result: TotalResult;
}

export function Dashboard({ state, result }: DashboardProps) {
  const isOverHedged = result.hedgeResult.effectiveHedgeRatio.greaterThan(1);
  const isHighHedge = result.hedgeResult.effectiveHedgeRatio.greaterThan(0.8) && !isOverHedged;
  const isNetProfit = result.netPnL.greaterThanOrEqualTo(0);

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {isOverHedged && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Warning: Overhedged</strong>
            <p>Your short hedge exceeds the current volatile asset exposure in this simplified model.</p>
          </div>
        </div>
      )}

      {isHighHedge && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Notice: High Hedge Ratio</strong>
            <p>Effective hedge ratio is between 80% and 100%.</p>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-zinc-500 text-xs mb-1">Total Net PnL</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${isNetProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isNetProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            ${result.netPnL.toFixed(2)}
          </div>
          <div className={`text-sm mt-1 ${isNetProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
            {isNetProfit ? '+' : ''}{result.netPnLPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-zinc-500 text-xs mb-1">Current Estimated Value</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-1">
            <DollarSign className="w-5 h-5 text-zinc-400" />
            {(state.totalCapital + result.netPnL.toNumber()).toFixed(2)}
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            Initial: ${state.totalCapital.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">LP Exposure</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Initial Volatile Value</span>
              <span className="font-medium">${result.lpResult.initialVolatileValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Current Volatile Value</span>
              <span className="font-medium">${result.lpResult.currentVolatileValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Stablecoin Value</span>
              <span className="font-medium">${result.lpResult.initialStableValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-500">Gross Asset PnL</span>
              <span className={`font-medium ${result.lpResult.assetPnL.greaterThanOrEqualTo(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${result.lpResult.assetPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Hedge Strategy</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Short Notional</span>
              <span className="font-medium">${result.hedgeResult.shortNotional.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Effective Hedge Ratio</span>
              <span className="font-medium">{result.hedgeResult.effectiveHedgeRatio.mul(100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Net Directional Exposure</span>
              <span className="font-medium">${result.hedgeResult.netDirectionalExposure.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-500">Short PnL</span>
              <span className={`font-medium ${result.hedgeResult.shortPnL.greaterThanOrEqualTo(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${result.hedgeResult.shortPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
        <p><strong>Phase 1 Disclaimer:</strong> This calculator uses a simplified hold-based LP model. Concentrated liquidity inventory rebalancing, impermanent loss, leverage, and liquidation risk are not yet included.</p>
        <p className="mt-1">This calculator is a scenario analysis tool and does not guarantee profitability. Actual LP returns depend on concentrated liquidity mechanics, impermanent loss, adverse selection, fees, funding, execution costs, and market conditions.</p>
      </div>
    </div>
  );
}
