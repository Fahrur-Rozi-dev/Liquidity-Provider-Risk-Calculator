import React, { useState } from "react";
import { NormalizedPool, PoolDataProvider } from "@/types";
import { Search, Loader2 } from "lucide-react";

interface PoolSelectorProps {
  provider: PoolDataProvider;
  onSelectPool: (pool: NormalizedPool) => void;
}

export function PoolSelector({ provider, onSelectPool }: PoolSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await provider.searchPools(query);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-4">Select Real Pool Data</h3>

      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Search by symbol, e.g. SOL/USDC..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm flex items-center justify-center min-w-[80px]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
           <table className="w-full text-xs text-left">
             <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
               <tr>
                 <th className="px-3 py-2 font-medium">Pool</th>
                 <th className="px-3 py-2 font-medium">Protocol</th>
                 <th className="px-3 py-2 font-medium">Type</th>
                 <th className="px-3 py-2 font-medium">Fee</th>
                 <th className="px-3 py-2 font-medium">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
               {results.map(p => (
                 <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                   <td className="px-3 py-2 font-medium">{p.token0.symbol}/{p.token1.symbol}</td>
                   <td className="px-3 py-2">{p.protocol}</td>
                   <td className="px-3 py-2">{p.poolType}</td>
                   <td className="px-3 py-2">{p.feeRate?.toNumber()}%</td>
                   <td className="px-3 py-2">
                     <button
                       onClick={() => onSelectPool(p)}
                       className="text-indigo-600 dark:text-indigo-400 hover:underline"
                     >
                       Select
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
