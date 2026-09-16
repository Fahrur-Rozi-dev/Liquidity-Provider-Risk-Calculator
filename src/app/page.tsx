"use client";

import React, { useState, useMemo } from "react";
import { CalculatorState } from "@/types";
import { InputForm } from "@/components/InputForm";
import { Dashboard } from "@/components/Dashboard";
import { ScenarioTable } from "@/components/ScenarioTable";
import { Charts } from "@/components/Charts";
import { generateScenarios } from "@/lib/calculations/scenarios";
import { calculateLPPosition } from "@/lib/calculations/lp";
import { calculateAutoShortNotional, calculateHedge } from "@/lib/calculations/hedge";
import { calculateTotalPnL } from "@/lib/calculations/pnl";

const INITIAL_STATE: CalculatorState = {
  pairName: "SOL/USDC",
  totalCapital: 200,
  volatileAllocation: 50,
  stableAllocation: 50,
  entryPrice: 100,

  hedgeRatio: 75,
  shortEntryPrice: 100,
  isAutoShortNotional: true,
  manualShortNotional: 75, // $75 out of $100 vol asset

  lpFeeIncome: 0,
  fundingCost: 0,

  openShortCost: 0,
  closeShortCost: 0,
  rebalanceCost: 0,

  targetPrice: 100, // Current state mapped to entry price
};

export default function Home() {
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

  const handleChange = (field: keyof CalculatorState, value: string | number | boolean) => {
    setState(prev => {
      const next = { ...prev, [field]: value };

      // Auto-balance stable allocation if volatile changes
      if (field === 'volatileAllocation') {
        next.stableAllocation = 100 - (value as number);
      }

      // Sync short entry with asset entry if they are exactly matching
      // (a convenience, optional but good for testing)
      if (field === 'entryPrice' && prev.entryPrice === prev.shortEntryPrice) {
        next.shortEntryPrice = value as number;
      }

      return next;
    });
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  // Calculate current state (price change = 0%)
  const currentResult = useMemo(() => {
    const lpResult = calculateLPPosition(
      state.totalCapital,
      state.volatileAllocation,
      state.entryPrice,
      state.entryPrice
    );

    let shortNotional = state.manualShortNotional;
    if (state.isAutoShortNotional) {
      shortNotional = calculateAutoShortNotional(
        lpResult.initialVolatileValue,
        state.hedgeRatio
      ).toNumber();
    }

    const hedgeResult = calculateHedge(
      shortNotional,
      state.shortEntryPrice,
      state.entryPrice,
      lpResult.currentVolatileValue
    );

    return calculateTotalPnL(
      lpResult,
      hedgeResult,
      state.lpFeeIncome,
      state.fundingCost,
      state.openShortCost,
      state.closeShortCost,
      state.rebalanceCost,
      state.totalCapital
    );
  }, [state]);

  // Generate scenario table
  const scenarios = useMemo(() => {
    return generateScenarios(state);
  }, [state]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">LP Risk & Hedge Calculator</h1>
          <p className="text-zinc-500 mt-1">Simulate concentrated liquidity baseline exposure with short hedges.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Form */}
          <div className="lg:col-span-4 space-y-6">
            <InputForm
              state={state}
              onChange={handleChange}
              onReset={handleReset}
            />
          </div>

          {/* Right Column: Results & Charts */}
          <div className="lg:col-span-8 space-y-8">
            <Dashboard
              state={state}
              result={currentResult}
            />

            <Charts scenarios={scenarios} />

            <ScenarioTable scenarios={scenarios} />
          </div>

        </div>
      </div>
    </div>
  );
}
