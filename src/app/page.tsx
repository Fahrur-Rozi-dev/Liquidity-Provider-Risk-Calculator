"use client";

import React, { useState, useMemo } from "react";
import { CalculatorState } from "@/types";
import { InputForm } from "@/components/InputForm";
import { SimulationResults } from "@/components/SimulationResults";
import { runSimulation } from "@/lib/simulation/simulator";

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

  lpFeeIncome: 0,
  fundingCost: 0,

  openShortCost: 0,
  closeShortCost: 0,
  rebalanceCost: 0,

  targetPrice: 100,

  // Phase 3 Configuration
  strategyMode: 'THRESHOLD',
  targetHedgeRatio: 75,
  rebalanceLowerThreshold: 60,
  rebalanceUpperThreshold: 90,
  minimumRebalanceNotional: 0,
  rebalanceCooldownSteps: 0,
  rebalanceFeeRate: 0.05,
  slippageRate: 0.05,
  fundingRatePerStep: 0,
  simulationPath: [105, 110, 115, 120, 125, 130, 140, 150]
};

export default function Home() {
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

  const handleChange = (field: keyof CalculatorState, value: string | number | boolean | number[]) => {
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

  const simulatedResults = useMemo(() => {
    return {
      fixed: runSimulation({ ...state, strategyMode: 'FIXED' }),
      dynamic: runSimulation({ ...state, strategyMode: 'DYNAMIC' }),
      threshold: runSimulation({ ...state, strategyMode: 'THRESHOLD' }),
    };
  }, [state]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">LP Risk & Dynamic Hedge Simulator</h1>
          <p className="text-zinc-500 mt-1">Simulate deterministic paths for Fixed, Dynamic, and Threshold hedging over Concentrated Liquidity.</p>
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
            {state.simulationPath.length > 0 ? (
              <SimulationResults
                state={state}
                results={simulatedResults}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 border-dashed">
                <p>Please enter a simulation price path to view results.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
