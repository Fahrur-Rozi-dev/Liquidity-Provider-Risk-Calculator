import React, { ChangeEvent } from "react";
import { CalculatorState } from "@/types";
import { Settings, RefreshCw } from "lucide-react";

interface InputFormProps {
  state: CalculatorState;
  onChange: (field: keyof CalculatorState, value: string | number | boolean | number[]) => void;
  onReset: () => void;
}

export function InputForm({ state, onChange, onReset }: InputFormProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handlePathChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n');
    const path = lines.map(l => parseFloat(l.trim())).filter(n => !isNaN(n) && n > 0);
    onChange('simulationPath', path);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm overflow-y-auto max-h-[90vh]">
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

        {/* Model Selector */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            Strategy Model
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange('modelType', 'simplified')}
              className={`py-2 text-sm rounded border ${
                state.modelType === 'simplified'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 font-medium'
                : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400'
              }`}
            >
              Simplified Model
            </button>
            <button
              onClick={() => onChange('modelType', 'clmm')}
              className={`py-2 text-sm rounded border ${
                state.modelType === 'clmm'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 font-medium'
                : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400'
              }`}
            >
              Concentrated Liquidity
            </button>
          </div>
        </div>

        {/* Strategy Mode Selector */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            Hedge Strategy Mode
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(['FIXED', 'DYNAMIC', 'THRESHOLD'] as const).map(mode => (
               <button
                 key={mode}
                 onClick={() => onChange('strategyMode', mode)}
                 className={`py-2 text-xs rounded border ${
                   state.strategyMode === mode
                   ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 font-medium'
                   : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400'
                 }`}
               >
                 {mode}
               </button>
            ))}
          </div>
        </div>

        {/* Hedge Strategy Config */}
        <div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs text-zinc-500 mb-1">Target Hedge Ratio (%)</label>
               <input
                 type="number"
                 name="targetHedgeRatio"
                 value={state.targetHedgeRatio}
                 onChange={handleChange}
                 min="0"
                 max="200"
                 className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
               />
             </div>

             {state.strategyMode === 'THRESHOLD' && (
                <>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Lower Threshold (%)</label>
                    <input
                      type="number"
                      name="rebalanceLowerThreshold"
                      value={state.rebalanceLowerThreshold}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Upper Threshold (%)</label>
                    <input
                      type="number"
                      name="rebalanceUpperThreshold"
                      value={state.rebalanceUpperThreshold}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
             )}

             {(state.strategyMode === 'DYNAMIC' || state.strategyMode === 'THRESHOLD') && (
               <>
                 <div>
                   <label className="block text-xs text-zinc-500 mb-1">Min Rebalance Notional</label>
                   <input
                     type="number"
                     name="minimumRebalanceNotional"
                     value={state.minimumRebalanceNotional}
                     onChange={handleChange}
                     className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   />
                 </div>
                 <div>
                   <label className="block text-xs text-zinc-500 mb-1">Cooldown Steps</label>
                   <input
                     type="number"
                     name="rebalanceCooldownSteps"
                     value={state.rebalanceCooldownSteps}
                     onChange={handleChange}
                     className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   />
                 </div>
               </>
             )}
           </div>
        </div>

        {/* LP Position */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            LP Initial State
          </h3>
          <div className="grid grid-cols-2 gap-4">
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

            {state.modelType === 'simplified' && (
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
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Entry Price (USD/SOL)</label>
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

        {/* CLMM Range */}
        {state.modelType === 'clmm' && (
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Lower Price</label>
                <input
                  type="number"
                  name="lowerPrice"
                  value={state.lowerPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Upper Price</label>
                <input
                  type="number"
                  name="upperPrice"
                  value={state.upperPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Trading Costs & Funding */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            Trading Costs & Funding
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs text-zinc-500 mb-1">Rebalance Fee Rate (%)</label>
               <input
                 type="number"
                 name="rebalanceFeeRate"
                 value={state.rebalanceFeeRate}
                 onChange={handleChange}
                 step="0.01"
                 className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
               />
            </div>
            <div>
               <label className="block text-xs text-zinc-500 mb-1">Slippage Rate (%)</label>
               <input
                 type="number"
                 name="slippageRate"
                 value={state.slippageRate}
                 onChange={handleChange}
                 step="0.01"
                 className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
               />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Funding Rate / Step (%)
              </label>
              <input
                type="number"
                name="fundingRatePerStep"
                value={state.fundingRatePerStep}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">LP Fees (Total USD)</label>
              <input
                type="number"
                name="lpFeeIncome"
                value={state.lpFeeIncome}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Simulation Path Editor */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded flex justify-between">
            <span>Simulation Path (Absolute Prices)</span>
          </h3>
          <textarea
            className="w-full h-32 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={state.simulationPath.join('\n')}
            onChange={handlePathChange}
            placeholder="Enter one price per line..."
          />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => onChange('simulationPath', [105, 110, 115, 120, 125, 130, 140, 150])} className="text-[10px] px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">Uptrend</button>
            <button type="button" onClick={() => onChange('simulationPath', [95, 90, 85, 80, 75, 70, 60, 50])} className="text-[10px] px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">Downtrend</button>
            <button type="button" onClick={() => onChange('simulationPath', [110, 120, 110, 100, 90, 80, 90, 100])} className="text-[10px] px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">Mean Reversion</button>
            <button type="button" onClick={() => onChange('simulationPath', [115, 95, 125, 85, 110, 90, 105, 100])} className="text-[10px] px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">Volatile</button>
          </div>
        </div>

      </div>
    </div>
  );
}
