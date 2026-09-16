import React from "react";
import { NormalizedPool } from "@/types";
import { Activity, Clock } from "lucide-react";

interface PoolMetricsProps {
  pool: NormalizedPool;
}

export function PoolMetricsDashboard({ pool }: PoolMetricsProps) {
  const volTvl = pool.volume24hUsd && pool.tvlUsd && !pool.tvlUsd.isZero()
    ? pool.volume24hUsd.div(pool.tvlUsd).toNumber()
    : 0;

  const ageMs = new Date().getTime() - pool.fetchedAt.getTime();
  const ageSeconds = Math.floor(ageMs / 1000);
  const isFresh = ageSeconds < 60;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm mt-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Live Pool Data
          </h3>
          <p className="text-xl font-bold mt-1">{pool.token0.symbol} / {pool.token1.symbol}</p>
          <p className="text-xs text-zinc-500">{pool.protocol} {pool.poolType} • {pool.chain}</p>
        </div>

        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isFresh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          <Clock className="w-3 h-3" />
          {isFresh ? `Fresh (${ageSeconds}s ago)` : `Stale (${Math.floor(ageSeconds/60)}m ago)`}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-xs text-zinc-500">Current Price</div>
          <div className="font-medium">${pool.currentPrice?.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">TVL</div>
          <div className="font-medium">${pool.tvlUsd?.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">24h Volume</div>
          <div className="font-medium">${pool.volume24hUsd?.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Fee Tier</div>
          <div className="font-medium">{pool.feeRate?.toNumber()}%</div>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg text-sm border border-zinc-100 dark:border-zinc-800">
         <h4 className="font-semibold text-xs text-zinc-500 mb-2">Derived Analytics</h4>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div>
             <div className="text-xs text-zinc-500">Vol / TVL</div>
             <div>{volTvl.toFixed(2)}</div>
           </div>
           <div>
             <div className="text-xs text-zinc-500">24h Fees</div>
             <div>${pool.fees24hUsd?.toFixed(0)}</div>
           </div>
           <div>
             <div className="text-xs text-zinc-500">Source APR</div>
             <div>{pool.apr?.toFixed(2)}%</div>
           </div>
           <div>
             <div className="text-xs text-zinc-500">Provider</div>
             <div className="truncate">{pool.source}</div>
           </div>
         </div>
      </div>
    </div>
  );
}
