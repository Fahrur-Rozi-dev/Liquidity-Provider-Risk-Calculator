import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Area
} from "recharts";
import { ScenarioRow } from "@/types";

interface ChartsProps {
  scenarios: ScenarioRow[];
  isClmm: boolean;
}

export function Charts({ scenarios, isClmm }: ChartsProps) {
  // Chart 1: LP Value vs Price (Portfolio Value)
  // Chart 2: Net PnL vs Price (Total Combined PnL)
  // Chart 3: SOL Inventory vs Price

  const data = scenarios.map(s => {
    return {
      ...s,
      lpPlusHedgeValue: (s.lpValue || 0) + s.shortPnL,
      unhedgedPnL: (s.totalPnLAfterCosts || 0) - s.shortPnL,
      hodlValuePlot: s.hodlValue || 0,
      hodlPnLPlot: s.hodlPnL || 0
    };
  });

  return (
    <div className="space-y-6 mt-8">

      {/* Chart 1: LP Value vs Price */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-6">Portfolio Value vs Asset Price</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="targetPrice"
                tickFormatter={(value) => `$${value}`}
                stroke="#9ca3af"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                stroke="#9ca3af"
                fontSize={12}
                tickMargin={10}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip
                formatter={(value: unknown) => {
                  if (typeof value === 'number') return [`$${value.toFixed(2)}`, ''];
                  return [`$${value}`, ''];
                }}
                labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Line
                type="monotone"
                name="LP Value"
                dataKey="lpValue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6' }}
              />

              {isClmm && (
                <Line
                  type="monotone"
                  name="HODL Value"
                  dataKey="hodlValuePlot"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              <Line
                type="monotone"
                name="LP + Short Hedge Value"
                dataKey="lpPlusHedgeValue"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Net PnL vs Price */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-6">Net PnL vs Asset Price</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="targetPrice"
                tickFormatter={(value) => `$${value}`}
                stroke="#9ca3af"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                stroke="#9ca3af"
                fontSize={12}
                tickMargin={10}
              />
              <Tooltip
                formatter={(value: unknown) => {
                  if (typeof value === 'number') return [`$${value.toFixed(2)}`, ''];
                  return [`$${value}`, ''];
                }}
                labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />

              <Line
                type="monotone"
                name="LP Only PnL"
                dataKey="unhedgedPnL"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />

              {isClmm && (
                <Line
                  type="monotone"
                  name="HODL PnL"
                  dataKey="hodlPnLPlot"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}

              <Line
                type="monotone"
                name="Combined LP + Hedge PnL"
                dataKey="totalPnLAfterCosts"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: SOL Inventory vs Price (CLMM Only) */}
      {isClmm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-6">SOL Inventory vs Asset Price</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="targetPrice"
                  tickFormatter={(value) => `$${value}`}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickMargin={10}
                />
                <YAxis
                  tickFormatter={(value) => `${value} SOL`}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickMargin={10}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    if (typeof value === 'number') return [`${value.toFixed(4)} SOL`, 'Inventory'];
                    return [`${value}`, ''];
                  }}
                  labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />

                <Area
                  type="monotone"
                  dataKey="amountSOL"
                  fill="#818cf8"
                  stroke="#4f46e5"
                  fillOpacity={0.2}
                  name="SOL Amount"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
