"use client";

import React, { useState, useMemo } from "react";
import { CalculatorState } from "@/types";
import { InputForm } from "@/components/InputForm";
import { BacktestReport } from "@/components/BacktestReport";
import { runBacktest } from "@/lib/simulation/backtest";

const INITIAL_STATE: CalculatorState = {
  modelType: 'clmm',
  pairName: "SOL/USDC",
  totalCapital: 200,

  volatileAllocation: 50,
  stableAllocation: 50,

  entryPrice: 100,
  lowerPrice: 80,
  upperPrice: 120,

  hedgeRatio: 75,
  shortEntryPrice: 100,
  isAutoShortNotional: true,
  manualShortNotional: 75,

  targetPrice: 100,

  strategyMode: 'THRESHOLD',
  targetHedgeRatio: 75,
  rebalanceLowerThreshold: 60,
  rebalanceUpperThreshold: 90,
  minimumRebalanceNotional: 0,
  rebalanceCooldownSteps: 0,

  rebalanceFeeRate: 0.05,
  slippageRate: 0.05,
  gasCostPerRebalance: 0,

  feeModelType: 'MANUAL',
  lpFeeIncome: 0,
  poolFeeRate: 0.25,
  estimatedLPShare: 0.01,

  fundingRatePerStep: 0,

  simulationPath: [],
  historicalData: [], fundingCost: 0, openShortCost: 0, closeShortCost: 0, rebalanceCost: 0
};

export default function Home() {
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

  const handleChange = (field: keyof CalculatorState, value: string | number | boolean | number[] | PricePoint[]) => {
    setState(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'volatileAllocation') {
        next.stableAllocation = 100 - (value as number);
      }
      if (field === 'entryPrice' && prev.entryPrice === prev.shortEntryPrice) {
        next.shortEntryPrice = value as number;
      }

      return next;
    });
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  // Run backtests if data is available
  const backtestResults = useMemo(() => {
    if (state.historicalData.length === 0) return null;
    return {
      fixed: runBacktest({ ...state, strategyMode: 'FIXED' }, state.historicalData),
      dynamic: runBacktest({ ...state, strategyMode: 'DYNAMIC' }, state.historicalData),
      threshold: runBacktest({ ...state, strategyMode: 'THRESHOLD' }, state.historicalData),
    };
  }, [state]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Historical Backtesting Engine</h1>
          <p className="text-zinc-500 mt-1">Upload CSV data to replay historical performance of deterministic hedging strategies over CLMM.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-4 space-y-6">
            <InputForm
              state={state}
              onChange={handleChange}
              onReset={handleReset}
            />
          </div>

          <div className="lg:col-span-8 space-y-8">
            {backtestResults ? (
              <BacktestReport
                state={state}
                results={backtestResults}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 border-dashed">
                <p>Please upload a CSV file with historical data to run the backtest.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
