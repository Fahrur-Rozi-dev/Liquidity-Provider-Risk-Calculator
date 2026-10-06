"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataStatusBadge } from "@/components/ui/DataStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { usePoolData } from "@/hooks/usePoolData";
import { FixturePoolProvider } from "@/providers/fixture";
import type { PoolDataProvider } from "@/providers/types";
import type { DiscoveredPool } from "@/services/poolData";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

/**
 * Pools workspace (Phase 3 — Production Data Foundation, docs/06).
 *
 * Read-only pool research through the normalized provider contracts:
 * discovery, deterministic selection, freshness/provenance display, and a
 * snapshot detail view. This workspace contains no financial calculations —
 * all valuation math stays in the domain engines (docs/02, docs/06).
 *
 * The provider instance is created client-side (class instances cannot cross
 * the server→client boundary); the workspace only depends on the
 * PoolDataProvider INTERFACE, so swapping the fixture for the production
 * Raydium adapter later is a one-line composition change.
 */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function PoolRow({
  item,
  selected,
  onSelect,
}: {
  item: DiscoveredPool;
  selected: boolean;
  onSelect: (poolId: string) => void;
}) {
  const { pool } = item;
  return (
    <tr className={selected ? "bg-accent-muted/40" : undefined}>
      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
        {pool.token0.symbol}/{pool.token1.symbol}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {formatPercent(pool.feeRate, 3)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {formatNumber(pool.currentPrice, 6)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {pool.tvlUsd === null ? "—" : formatCurrency(pool.tvlUsd, "USD", 0)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {pool.volume24hUsd === null ? "—" : formatCurrency(pool.volume24hUsd, "USD", 0)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {pool.fees24hUsd === null ? "—" : formatCurrency(pool.fees24hUsd, "USD", 0)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5">
        <button
          type="button"
          onClick={() => onSelect(pool.id)}
          className="rounded border border-border-strong bg-panel-2 px-2 py-1 text-xs font-medium text-text hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          aria-pressed={selected}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </td>
    </tr>
  );
}

export function PoolsWorkspace({ provider }: { provider?: PoolDataProvider } = {}) {
  // Composition lives here (client-side) until a Settings phase chooses
  // providers explicitly; the deterministic fixture is the documented
  // Phase 3 default (docs/06: fixtures behind production interfaces).
  const resolvedProvider = useMemo(() => provider ?? new FixturePoolProvider(), [provider]);
  const {
    status,
    pools,
    primary,
    selectedId,
    provenance,
    snapshotStatus,
    snapshot,
    error,
    selectPool,
    load,
  } = usePoolData(resolvedProvider);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const onSelect = (poolId: string) => {
    setLastSelected(poolId);
    selectPool(poolId);
  };

  const selectedPool = useMemo(
    () => pools?.find((item) => item.pool.id === (lastSelected ?? selectedId)) ?? null,
    [pools, lastSelected, selectedId],
  );
  // Snapshot tiles work on PoolSnapshot; discovery rows on Pool. Show the
  // selection's own (fresh) values when no snapshot has loaded yet.
  const detail = useMemo(() => {
    if (!selectedPool) return null;
    const hasSnapshot = snapshotStatus === "ready" && snapshot !== null;
    return {
      volatileSymbol: selectedPool.pool.token0.symbol,
      stableSymbol: selectedPool.pool.token1.symbol,
      protocol: selectedPool.pool.protocol,
      poolType: selectedPool.pool.poolType,
      price: hasSnapshot && snapshot ? snapshot.price : selectedPool.pool.currentPrice,
      feeRate: hasSnapshot && snapshot ? snapshot.feeRate : selectedPool.pool.feeRate,
      tvlUsd: hasSnapshot && snapshot ? snapshot.tvlUsd : selectedPool.pool.tvlUsd,
      liquidity: hasSnapshot && snapshot ? snapshot.liquidity : null,
    };
  }, [selectedPool, snapshot, snapshotStatus]);

  return (
    <div className="space-y-6">
      {/* Data status — source + freshness are first-class UI here (docs/05, docs/09). */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <DataStatusBadge status={provenance?.freshness ?? "unavailable"} />
            <span>
              Source: <span className="font-mono text-xs">{provenance?.source ?? resolvedProvider.id}</span>
              {provenance?.fetchedAt ? ` · fetched ${dateFormatter.format(provenance.fetchedAt)}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded border border-border-strong bg-panel-2 px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Reload
          </button>
        </div>
        {error ? (
          <p className="border-t border-loss/30 bg-loss/10 px-4 py-2.5 text-sm text-loss">{error}</p>
        ) : null}
      </Card>

      {status === "loading" ? (
        <EmptyState title="Loading pools…" description={`Querying ${resolvedProvider.label} through the normalized provider contract.`} />
      ) : status === "error" ? (
        <EmptyState
          title="Provider error"
          description="No pool data is shown because the provider request failed — invented data is never displayed (docs/07). Fix connectivity or switch providers in Settings, then reload."
        />
      ) : status === "ready" && pools && pools.length === 0 ? (
        <EmptyState
          title="No canonically oriented pools found"
          description="The provider returned no CLMM pools expressible as stable-per-1-volatile. Pairs priced the other way around are rejected rather than silently re-oriented (docs/04 price convention)."
        />
      ) : status === "ready" && pools ? (
        <>
          <Card>
            <CardHeader
              title="Pool discovery"
              actions={<Badge variant="muted">{pools.length} normalized CLMM</Badge>}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                    <th scope="col" className="px-4 py-2 font-medium">Pair</th>
                    <th scope="col" className="px-4 py-2 font-medium">Fee</th>
                    <th scope="col" className="px-4 py-2 font-medium">Price ({selectedPool ? `${selectedPool.pool.token1.symbol} per 1 ${selectedPool.pool.token0.symbol}` : "stable per volatile"})</th>
                    <th scope="col" className="px-4 py-2 font-medium">TVL</th>
                    <th scope="col" className="px-4 py-2 font-medium">Volume 24h</th>
                    <th scope="col" className="px-4 py-2 font-medium">Fees 24h</th>
                    <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Select</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((item) => (
                    <PoolRow
                      key={item.pool.id}
                      item={item}
                      selected={item.pool.id === (lastSelected ?? selectedId)}
                      onSelect={onSelect}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {primary ? (
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
                Deterministic primary selection (highest TVL):{" "}
                <span className="font-medium text-text">
                  {primary.volatileSymbol}/{primary.stableSymbol}
                </span>{" "}
                @ {formatNumber(primary.entryPrice, 6)} — reusable as the calculator default
                (provider-first architecture, docs/06).
              </p>
            ) : null}
          </Card>

          {detail ? (
            <Card>
              <CardHeader
                title={`Detail — ${detail.volatileSymbol}/${detail.stableSymbol}`}
                actions={
                  <>
                    <Badge variant="neutral">{detail.protocol}</Badge>
                    <Badge variant="neutral">{detail.poolType.toUpperCase()}</Badge>
                    <DataStatusBadge status={snapshotStatus === "ready" ? (provenance?.freshness ?? "unavailable") : snapshotStatus === "loading" ? "updating" : provenance?.freshness ?? "unavailable"} />
                  </>
                }
              />
              {snapshotStatus === "loading" ? (
                <p className="px-4 py-4 text-sm text-muted">Loading snapshot…</p>
              ) : snapshotStatus === "error" ? (
                <p className="px-4 py-4 text-sm text-loss">
                  Snapshot failed — {provenance?.error ?? "unknown provider error"}. No data is invented to fill this view.
                </p>
              ) : (
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile
                    label="Price"
                    value={formatNumber(detail.price, 6)}
                    sub={`${detail.stableSymbol} per 1 ${detail.volatileSymbol}`}
                  />
                  <StatTile label="Fee rate" value={formatPercent(detail.feeRate, 3)} />
                  <StatTile
                    label="TVL"
                    value={detail.tvlUsd === null ? "—" : formatCurrency(detail.tvlUsd, "USD", 0)}
                  />
                  <StatTile
                    label="Liquidity L"
                    value={detail.liquidity === null ? "Not exposed" : formatNumber(detail.liquidity, 4)}
                    sub="Raw pool liquidity is not normalized across pool types"
                  />
                </div>
              )}
            </Card>
          ) : null}
        </>
      ) : null}

      <Card>
        <CardHeader title="Data provenance & limitations" />
        <ul className="grid gap-2 px-4 py-4 text-sm text-muted sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Provider responses are provider-cached and can lag chain state by minutes; freshness is shown per dataset and stale data is never presented as live.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Pool prices are as reported by the provider; Raydium CLMM prices are value of 1 token A in token B, normalized to stable-per-1-volatile for recognized quote assets.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Fee/volume/TVL figures are pool-level provider-reported aggregates — not position-level estimates.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Read-only: this workspace fetches public data only. No wallet, no signing, no execution, no automated actions — ever.
          </li>
        </ul>
      </Card>
    </div>
  );
}
