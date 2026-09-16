import React from "react";
import { CalculatorState, TotalResult } from "@/types";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Info } from "lucide-react";

interface DashboardProps {
  state: CalculatorState;
  result: TotalResult;
}

export function Dashboard({ state, result }: DashboardProps) {
  const hr = result.hedgeResult.effectiveHedgeRatio.toNumber();
  const isOverHedged = hr > 1.0;
  const isHighHedge = hr > 0.8 && !isOverHedged;
  const isTargetHedge = hr >= 0.5 && hr <= 0.8;


  const isNetProfit = result.netPnL.greaterThanOrEqualTo(0);

  const isClmm = state.modelType === 'clmm';

  return (
    <div className="space-y-6">
      {/* Visual Hedge Status Indicator */}
      <div className={`border rounded-lg p-4 flex items-start gap-3 ${
        isOverHedged ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' :
        isHighHedge ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
        isTargetHedge ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
      }`}>
        {isOverHedged || isHighHedge ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
        <div className="text-sm">
          <strong>
            {isOverHedged ? 'Status: Overhedged' :
             isHighHedge ? 'Status: High Hedge Ratio' :
             isTargetHedge ? 'Status: Target Hedge Ratio' :
             'Status: Underhedged'}
          </strong>
          <p className="mt-1">
            Current Effective Hedge Ratio: {(hr * 100).toFixed(1)}%.
            {isOverHedged && ' Your short hedge exceeds the current volatile asset exposure.'}
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-zinc-500 text-xs mb-1">Total Net PnL</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${isNetProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isNetProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            ${result.netPnL.toFixed(2)}
          </div>
          <div className={`text-sm mt-1 ${isNetProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
            {isNetProfit ? '+' : ''}{result.netPnLPercentage.toFixed(2)}% relative to capital
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-zinc-500 text-xs mb-1">Current Position Value</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-1">
            <DollarSign className="w-5 h-5 text-zinc-400" />
            {(state.totalCapital + result.lpResult.assetPnL.toNumber()).toFixed(2)}
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            {isClmm && result.lpResult.ilPercent ? (
              <span className="text-rose-500">LP vs HODL: {result.lpResult.ilPercent.toFixed(2)}%</span>
            ) : (
              `Initial Capital: $${state.totalCapital.toFixed(2)}`
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex justify-between">
            <span>LP Exposure</span>
            {isClmm && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                result.lpResult.rangeStatus === 'IN_RANGE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {result.lpResult.rangeStatus?.replace('_', ' ')}
              </span>
            )}
          </h3>
          <div className="space-y-2 text-sm flex-grow">
            <div className="flex justify-between">
              <span className="text-zinc-500">Current SOL</span>
              <span className="font-medium">
                {result.lpResult.volatileQuantity.toFixed(4)} SOL
                <span className="text-zinc-400 text-xs ml-1">(${result.lpResult.currentVolatileValue.toFixed(2)})</span>
              </span>
            </div>

            {isClmm && result.lpResult.amountUSDC !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Current USDC</span>
                <span className="font-medium">${result.lpResult.amountUSDC.toFixed(2)}</span>
              </div>
            )}

            {!isClmm && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Stablecoin Value</span>
                <span className="font-medium">${result.lpResult.initialStableValue.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">LP Delta (USD)</span>
              <span className="font-medium text-indigo-500">
                ${(result.lpResult.lpDelta || result.lpResult.currentVolatileValue).toFixed(2)}
              </span>
            </div>

            {isClmm && result.lpResult.liquidity && (
               <div className="flex justify-between pt-1">
                 <span className="text-zinc-500">Liquidity (L)</span>
                 <span className="font-medium">{result.lpResult.liquidity.toFixed(2)}</span>
               </div>
            )}

            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-500">Gross Asset PnL</span>
              <span className={`font-medium ${result.lpResult.assetPnL.greaterThanOrEqualTo(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${result.lpResult.assetPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
          <h3 className="text-sm font-semibold mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Hedge Strategy</h3>
          <div className="space-y-2 text-sm flex-grow">
            <div className="flex justify-between">
              <span className="text-zinc-500">Short Notional</span>
              <span className="font-medium">${result.hedgeResult.shortNotional.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Effective Hedge Ratio</span>
              <span className="font-medium">{(hr * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">Net Directional Delta</span>
              <span className="font-medium text-indigo-500">
                ${((result.lpResult.lpDelta || result.lpResult.currentVolatileValue).minus(result.hedgeResult.shortNotional)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-auto">
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
        <p><strong>Disclaimer:</strong> This calculator is a scenario analysis tool and does not guarantee profitability. Actual LP returns depend on trading fees, incentives, adverse selection (LVR), gas, swap costs, funding rates, and execution prices which are not perfectly modeled here.</p>
        {isClmm && <p className="mt-1">&quot;LP vs HODL&quot;quot;LP vs HODL&quot;LP vs HODL&quot;quot;quot;LP vs HODL&quot;LP vs HODL&quot;quot;LP vs HODL&quot;LP vs HODL&quot;quot;quot; (Impermanent Loss) measures the LP performance difference relative to holding the initial assets; it is not the total economic cost.</p>}
      </div>
    </div>
  );
}
