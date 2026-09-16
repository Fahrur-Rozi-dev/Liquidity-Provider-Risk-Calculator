import React, { ChangeEvent } from "react";
import { CalculatorState } from "@/types";
import { Settings, RefreshCw } from "lucide-react";

interface InputFormProps {
  state: CalculatorState;
  onChange: (field: keyof CalculatorState, value: string | number | boolean) => void;
  onReset: () => void;
}

export function InputForm({ state, onChange, onReset }: InputFormProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      onChange(name as keyof CalculatorState, checked);
    } else if (type === "number") {
      onChange(name as keyof CalculatorState, parseFloat(value) || 0);
    } else {
      onChange(name as keyof CalculatorState, value);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          Parameters
        </h2>
        <button
          onClick={onReset}
          className="text-sm flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="space-y-6">
        {/* LP Position */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            LP Position
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Pair</label>
              <input
                type="text"
                name="pairName"
                value={state.pairName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Total Capital (USD)</label>
              <input
                type="number"
                name="totalCapital"
                value={state.totalCapital}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Volatile Alloc (%)</label>
              <input
                type="number"
                name="volatileAllocation"
                value={state.volatileAllocation}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Entry Price (USD)</label>
              <input
                type="number"
                name="entryPrice"
                value={state.entryPrice}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Short Hedge */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            Short Hedge
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAutoShortNotional"
                name="isAutoShortNotional"
                checked={state.isAutoShortNotional}
                onChange={handleChange}
                className="rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500"
              />
              <label htmlFor="isAutoShortNotional" className="text-sm text-zinc-700 dark:text-zinc-300">
                Auto calculate short notional
              </label>
            </div>

            {state.isAutoShortNotional ? (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Hedge Ratio (%)</span>
                  <span className="font-medium">{state.hedgeRatio}%</span>
                </div>
                <input
                  type="range"
                  name="hedgeRatio"
                  value={state.hedgeRatio}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="5"
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Manual Short Notional (USD)</label>
                <input
                  type="number"
                  name="manualShortNotional"
                  value={state.manualShortNotional}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Short Entry Price</label>
              <input
                type="number"
                name="shortEntryPrice"
                value={state.shortEntryPrice}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Fees & Funding */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            Income & Costs
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">LP Fees (USD)</label>
              <input
                type="number"
                name="lpFeeIncome"
                value={state.lpFeeIncome}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Funding (USD) <span className="text-zinc-400 text-[10px] ml-1">(+ = cost)</span>
              </label>
              <input
                type="number"
                name="fundingCost"
                value={state.fundingCost}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Trading Costs */}
        <div className="grid grid-cols-3 gap-2">
           <div>
              <label className="block text-xs text-zinc-500 mb-1 text-center">Open Cost</label>
              <input
                type="number"
                name="openShortCost"
                value={state.openShortCost}
                onChange={handleChange}
                className="w-full px-2 py-1 text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1 text-center">Close Cost</label>
              <input
                type="number"
                name="closeShortCost"
                value={state.closeShortCost}
                onChange={handleChange}
                className="w-full px-2 py-1 text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1 text-center">Rebalance Cost</label>
              <input
                type="number"
                name="rebalanceCost"
                value={state.rebalanceCost}
                onChange={handleChange}
                className="w-full px-2 py-1 text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
        </div>
      </div>
    </div>
  );
}
