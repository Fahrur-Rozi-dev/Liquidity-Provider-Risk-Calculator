"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataStatusBadge } from "@/components/ui/DataStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { usePoolData } from "@/hooks/usePoolData";
import { FixturePoolProvider } from "@/providers/fixture";
import type { PoolDataProvider } from "@/providers/types";
import { savePoolSelection } from "@/services/poolSelectionStore";
import { toPoolSelection as buildSelection } from "@/services/poolData";
import type { PoolMetadata } from "@/types";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

/**
 * Pools workspace (Phase 3 — Production Data Foundation, docs/06).
 *
 * Read-only pool research through the normalized provider contracts:
 * discovery, deterministic selection, canonical quality display (docs/05
 * DataQuality), and a snapshot detail view. This workspace contains no
 * financial calculations — all valuation math stays in the domain engines
 * (docs/02, docs/06).
 *
 * Unknown values render as "—" and are never coerced to zero (docs/05
 * Unknown vs Zero). The provider instance is created client-side (class
 * instances cannot cross the server→client boundary); the workspace only
 * depends on the PoolDataProvider INTERFACE, so swapping the fixture for the
 * production Raydium adapter later is a one-line composition change.
 */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function PoolRow({
  metadata,
  selected,
  onSelect,
}: {
  metadata: PoolMetadata;
  selected: boolean;
  onSelect: (poolKey: string) => void;
}) {
  return (
    <tr className={selected ? "bg-accent-muted/40" : undefined}>
      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
        {metadata.token0.symbol}/{metadata.token1.symbol}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted">
        {formatPercent(metadata.feeTier, 3)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{metadata.id.address.slice(0, 6)}…</td>
      <td className="whitespace-nowrap px-4 py-2.5">
        <button
          type="button"
          onClick={() => onSelect(metadata.key)}
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
    primaryPoolKey,
    selectedKey,
    quality,
    metadataStatus,
    metadata,
    snapshotStatus,
    snapshot,
    error,
    selectPool,
    load,
  } = usePoolData(resolvedProvider);

  const visibleKey = selectedKey ?? primaryPoolKey;

  const detail = useMemo(() => {
    if (!metadata) return null;
    const hasSnapshot = snapshotStatus === "ready" && snapshot !== null;
    return {
      key: metadata.key,
      pair: `${metadata.token0.symbol}/${metadata.token1.symbol}`,
      protocol: metadata.id.protocol,
      poolType: metadata.poolType.toUpperCase(),
      price: hasSnapshot && snapshot ? snapshot.price : null,
      feeTier: hasSnapshot && snapshot && snapshot.feeTier !== null ? snapshot.feeTier : metadata.feeTier,
      tvlUsd: hasSnapshot && snapshot ? snapshot.tvlUsd : null,
      liquidity: hasSnapshot && snapshot ? snapshot.liquidity : null,
      observedAt: hasSnapshot && snapshot ? snapshot.observedAt : null,
      warnings: hasSnapshot && snapshot ? snapshot.quality.warnings : quality?.warnings ?? [],
    };
  }, [metadata, snapshot, snapshotStatus, quality]);

  const onSelect = (poolKey: string) => {
    selectPool(poolKey);
  };

  // Hand off the joined selection to the calculator (explicit suggestion).
  const sendToCalculator = () => {
    if (!metadata || snapshotStatus !== "ready" || !snapshot) return;
    savePoolSelection(buildSelection(metadata, snapshot));
  };

  const statusLine = quality
    ? `${quality.source}${quality.fetchedAt ? ` · fetched ${dateFormatter.format(quality.fetchedAt)}` : ""}`
    : resolvedProvider.id;

  return (
    <div className="space-y-6">
      {/* Data status — source + canonical quality are first-class UI (docs/05, docs/09). */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <DataStatusBadge status={quality?.status ?? "unavailable"} />
            <span>
              Source: <span className="font-mono text-xs">{statusLine}</span>
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
        {quality && quality.warnings.length > 0 ? (
          <ul className="border-t border-border px-4 py-2.5 text-xs text-warn">
            {quality.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
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
                    <th scope="col" className="px-4 py-2 font-medium">Fee tier</th>
                    <th scope="col" className="px-4 py-2 font-medium">Pool</th>
                    <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Select</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((item) => (
                    <PoolRow
                      key={item.metadata.key}
                      metadata={item.metadata}
                      selected={item.metadata.key === visibleKey}
                      onSelect={onSelect}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {primaryPoolKey ? (
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
                Deterministic primary selection (provider-ranked first pool):{" "}
                <span className="font-mono text-xs text-text">{primaryPoolKey}</span> — reusable as
                the calculator default (provider-first architecture, docs/06).
              </p>
            ) : null}
          </Card>

          {detail ? (
            <Card>
              <CardHeader
                title={`Detail — ${detail.pair}`}
                actions={
                  <>
                    <Badge variant="neutral">{detail.protocol}</Badge>
                    <Badge variant="neutral">{detail.poolType}</Badge>
                    <DataStatusBadge status={snapshotStatus === "ready" && snapshot ? snapshot.quality.status : snapshotStatus === "loading" ? "partial" : quality?.status ?? "unavailable"} />
                  </>
                }
              />
              {snapshotStatus === "loading" || metadataStatus === "loading" ? (
                <p className="px-4 py-4 text-sm text-muted">Loading pool detail…</p>
              ) : metadataStatus === "error" || snapshotStatus === "error" ? (
                <p className="px-4 py-4 text-sm text-loss">
                  Detail failed — {quality?.error ?? "unknown provider error"}. No data is invented to fill this view.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile
                      label="Price"
                      value={detail.price === null ? "—" : formatNumber(detail.price, 6)}
                      sub={`${detail.pair.split("/")[1]} per 1 ${detail.pair.split("/")[0]}`}
                    />
                    <StatTile label="Fee tier" value={formatPercent(detail.feeTier, 3)} />
                    <StatTile
                      label="TVL"
                      value={detail.tvlUsd === null ? "—" : formatCurrency(detail.tvlUsd, "USD", 0)}
                      sub={detail.tvlUsd === null ? "Unknown — not supplied by the provider" : undefined}
                    />
                    <StatTile
                      label="Liquidity L"
                      value={detail.liquidity === null ? "—" : formatNumber(detail.liquidity, 4)}
                      sub="Raw pool liquidity is not normalized across pool types"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <p className="text-xs text-muted">
                      {detail.observedAt
                        ? `Observed ${dateFormatter.format(detail.observedAt)}.`
                        : "No observation timestamp supplied — data must not be presented as live."}
                    </p>
                    <button
                      type="button"
                      onClick={sendToCalculator}
                      disabled={snapshotStatus !== "ready" || !snapshot}
                      className="rounded border border-accent/50 bg-accent-muted px-2.5 py-1.5 text-xs font-medium text-accent hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use in Calculator
                    </button>
                  </div>
                </>
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
            Provider responses are provider-cached and can lag chain state by minutes; canonical quality (docs/05) is shown per dataset and stale data is never presented as live.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Pool prices are as reported by the provider; Raydium CLMM prices are value of 1 token A in token B, normalized to stable-per-1-volatile for recognized quote assets.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
            Unknown values stay unknown: TVL, volume, fees, and liquidity that a provider does not supply render as &quot;—&quot; and are never replaced with zero.
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
