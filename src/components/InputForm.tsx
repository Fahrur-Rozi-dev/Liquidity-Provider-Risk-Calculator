import React, { ChangeEvent, useRef } from "react";
import { CalculatorState, PricePoint } from "@/types";
import { Settings, RefreshCw, Upload } from "lucide-react";
import { parseHistoricalCSV } from "@/lib/data/csvProvider";

interface InputFormProps {
  state: CalculatorState;
  onChange: (field: keyof CalculatorState, value: string | number | boolean | number[] | PricePoint[]) => void;
  onReset: () => void;
}

export function InputForm({ state, onChange, onReset }: InputFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { data, warnings } = parseHistoricalCSV(text);
        if (warnings.length > 0) {
          console.warn("CSV Import Warnings:", warnings);
          alert(`CSV Import Warnings:\n${warnings.join('\n')}`);
        }
        if (data.length > 0) {
          onChange('historicalData', data);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
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

        {/* Historical Data Source */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded flex justify-between">
            <span>Historical Data Source</span>
          </h3>
          <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Upload CSV</p>
            <p className="text-xs text-zinc-500 mt-1">Must contain timestamp and price headers</p>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
          {state.historicalData.length > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center">
              Loaded {state.historicalData.length} price points
            </p>
          )}
        </div>

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
               <label className="block text-xs text-zinc-500 mb-1">Gas Cost per Reb. (USD)</label>
               <input
                 type="number"
                 name="gasCostPerRebalance"
                 value={state.gasCostPerRebalance}
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
          </div>
        </div>

        {/* LP Fees Models */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
            LP Fee Model
          </h3>
          <div className="flex gap-4 mb-4">
             <label className="text-sm flex items-center gap-2">
               <input type="radio" name="feeModelType" value="MANUAL" checked={state.feeModelType === 'MANUAL'} onChange={() => onChange('feeModelType', 'MANUAL')} className="text-indigo-500 focus:ring-indigo-500" />
               Manual Flat
             </label>
             <label className="text-sm flex items-center gap-2">
               <input type="radio" name="feeModelType" value="ESTIMATED" checked={state.feeModelType === 'ESTIMATED'} onChange={() => onChange('feeModelType', 'ESTIMATED')} className="text-indigo-500 focus:ring-indigo-500" />
               Volume Estimated
             </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {state.feeModelType === 'MANUAL' ? (
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
            ) : (
              <>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Pool Fee Rate (%)</label>
                  <input
                    type="number"
                    name="poolFeeRate"
                    value={state.poolFeeRate}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Estimated LP Share (%)</label>
                  <input
                    type="number"
                    name="estimatedLPShare"
                    value={state.estimatedLPShare}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
