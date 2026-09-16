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
  ReferenceLine
} from "recharts";
import { ScenarioRow } from "@/types";

interface ChartsProps {
  scenarios: ScenarioRow[];
}

export function Charts({ scenarios }: ChartsProps) {
  // Add an unhedged Net PnL column to data for comparison
  const data = scenarios.map(s => ({
    ...s,
    // Unhedged = Net PnL - shortPnL
    unhedgedPnL: s.netPnL - s.shortPnL
  }));

  return (
    <div className="space-y-6 mt-8">
      {/* PnL vs Price Chart */}
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
                name="Hedged Strategy Net PnL"
                dataKey="netPnL"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                name="Unhedged LP (Baseline)"
                dataKey="unhedgedPnL"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hedge Ratio vs Price Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-6">Effective Hedge Ratio vs Asset Price</h3>
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
                tickFormatter={(value) => `${value}%`}
                stroke="#9ca3af"
                fontSize={12}
                tickMargin={10}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value: unknown) => {
                  if (typeof value === 'number') return [`${value.toFixed(1)}%`, 'Hedge Ratio'];
                  return [`${value}%`, 'Hedge Ratio'];
                }}
                labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />

              <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '50%', fill: '#fbbf24', fontSize: 10 }} />
              <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '75%', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '100% (Fully Hedged)', fill: '#ef4444', fontSize: 10 }} />

              <Line
                type="monotone"
                name="Effective Hedge %"
                dataKey="effectiveHedgeRatio"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
