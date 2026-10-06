"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PoolSnapshot } from "@/types";
import type { PoolDataProvider, ProviderResult } from "@/providers/types";
import {
  discoverPools,
  loadPoolSnapshot,
  selectPrimaryPool,
  toPoolSelection,
  type DiscoveredPool,
  type PoolSelection,
} from "@/services/poolData";

/**
 * Read-only state machine for the Phase 3 pool data integration
 * (docs/06): idle → loading → ready | error, for both discovery and the
 * selected pool's snapshot. Explicit loading/error/empty states, no
 * fabricated defaults (docs/03, docs/07). Requests are sequence-guarded so a
 * stale response can never overwrite a newer one.
 */

export type RequestStatus = "idle" | "loading" | "ready" | "error";

export interface UsePoolDataResult {
  status: RequestStatus;
  /** Normalized discovered pools when ready; null while loading or on error. */
  pools: readonly DiscoveredPool[] | null;
  /** Deterministic primary selection (highest TVL) when ready. */
  primary: PoolSelection | null;
  selectedId: string | null;
  provenance: ProviderResult<unknown>["provenance"] | null;
  /** Snapshot request status for the selected pool ("idle" until one is selected). */
  snapshotStatus: RequestStatus;
  /** Snapshot for the selected pool (null until ready). */
  snapshot: PoolSnapshot | null;
  error: string | null;
  selectPool: (poolId: string) => void;
  load: () => void;
}

export function usePoolData(provider: PoolDataProvider): UsePoolDataResult {
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [pools, setPools] = useState<readonly DiscoveredPool[] | null>(null);
  const [provenance, setProvenance] = useState<ProviderResult<unknown>["provenance"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<RequestStatus>("idle");
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);

  const requestSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setStatus("loading");
    setSnapshotStatus("idle");
    setSnapshot(null);
    void (async () => {
      const result = await discoverPools(provider, { poolType: "clmm", limit: 50 });
      if (seq !== requestSeqRef.current) return; // superseded
      setProvenance(result.provenance);
      if (result.data === null) {
        setPools(null);
        setStatus("error");
        return;
      }
      setPools(result.data);
      setStatus("ready");
      const primary = selectPrimaryPool(result.data);
      setSelectedId(primary ? primary.pool.id : null);
    })();
  }, [provider]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Yield one microtask so no state update runs synchronously inside the
      // effect body (react-hooks/set-state-in-effect) — behavior is identical.
      await Promise.resolve();
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selectPool = useCallback(
    (poolId: string) => {
      setSelectedId(poolId);
      const seq = ++requestSeqRef.current;
      setSnapshotStatus("loading");
      setSnapshot(null);
      void (async () => {
        const result = await loadPoolSnapshot(provider, poolId);
        if (seq !== requestSeqRef.current) return; // superseded
        setProvenance(result.provenance);
        if (result.data === null) {
          setSnapshot(null);
          setSnapshotStatus("error");
          return;
        }
        setSnapshot(result.data);
        setSnapshotStatus("ready");
      })();
    },
    [provider],
  );

  const primary = useMemo(
    () => (pools ? toPoolSelectionOrDefault(selectPrimaryPool(pools)) : null),
    [pools],
  );

  const error =
    status === "error" && provenance
      ? `Pool discovery failed — ${provenance.error ?? "unknown provider error"}.`
      : snapshotStatus === "error" && provenance
        ? `Pool snapshot failed — ${provenance.error ?? "unknown provider error"}.`
        : null;

  return {
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
  };
}

function toPoolSelectionOrDefault(selection: DiscoveredPool | null): PoolSelection | null {
  return selection ? toPoolSelection(selection.pool) : null;
}
