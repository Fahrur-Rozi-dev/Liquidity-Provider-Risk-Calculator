"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PoolMetadata, PoolSnapshot } from "@/types";
import type { PoolDataProvider, ProviderResult } from "@/providers/types";
import {
  discoverPools,
  loadPoolMetadata,
  loadPoolSnapshot,
  selectPrimaryPool,
  type DiscoveredPool,
} from "@/services/poolData";

/**
 * Read-only state machine for the Phase 3 pool data integration
 * (docs/06): idle → loading → ready | error, for discovery, the selected
 * pool's stable metadata, and its snapshot. Quality (docs/05 DataQuality) is
 * surfaced as-is; requests are sequence-guarded so a stale response can never
 * overwrite a newer one. Explicit loading/error/empty states, no fabricated
 * defaults (docs/03, docs/07).
 */

export type RequestStatus = "idle" | "loading" | "ready" | "error";

export interface UsePoolDataResult {
  status: RequestStatus;
  /** Normalized discovered pools when ready; null while loading or on error. */
  pools: readonly DiscoveredPool[] | null;
  /** Deterministic primary selection key when ready. */
  primaryPoolKey: string | null;
  selectedKey: string | null;
  /** Canonical quality block of the last completed request. */
  quality: ProviderResult<unknown>["quality"] | null;
  metadataStatus: RequestStatus;
  /** Stable metadata for the selected pool (null until ready). */
  metadata: PoolMetadata | null;
  snapshotStatus: RequestStatus;
  /** Snapshot for the selected pool (null until ready). */
  snapshot: PoolSnapshot | null;
  error: string | null;
  selectPool: (poolKey: string) => void;
  load: () => void;
}

export function usePoolData(provider: PoolDataProvider): UsePoolDataResult {
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [pools, setPools] = useState<readonly DiscoveredPool[] | null>(null);
  const [quality, setQuality] = useState<ProviderResult<unknown>["quality"] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [metadataStatus, setMetadataStatus] = useState<RequestStatus>("idle");
  const [metadata, setMetadata] = useState<PoolMetadata | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<RequestStatus>("idle");
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);

  const requestSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setStatus("loading");
    setMetadataStatus("idle");
    setMetadata(null);
    setSnapshotStatus("idle");
    setSnapshot(null);
    void (async () => {
      const result = await discoverPools(provider, { poolType: "clmm", limit: 50 });
      if (seq !== requestSeqRef.current) return; // superseded
      setQuality(result.quality);
      if (result.data === null) {
        setPools(null);
        setStatus("error");
        return;
      }
      setPools(result.data);
      setStatus("ready");
      const primary = selectPrimaryPool(result.data);
      setSelectedKey(primary ? primary.metadata.key : null);
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
    (poolKey: string) => {
      setSelectedKey(poolKey);
      const seq = ++requestSeqRef.current;
      setMetadataStatus("loading");
      setMetadata(null);
      setSnapshotStatus("loading");
      setSnapshot(null);
      void (async () => {
        const [metadataResult, snapshotResult] = await Promise.all([
          loadPoolMetadata(provider, poolKey),
          loadPoolSnapshot(provider, poolKey),
        ]);
        if (seq !== requestSeqRef.current) return; // superseded
        setQuality(snapshotResult.quality);
        if (metadataResult.data === null) {
          setMetadata(null);
          setMetadataStatus("error");
        } else {
          setMetadata(metadataResult.data);
          setMetadataStatus("ready");
        }
        if (snapshotResult.data === null) {
          setSnapshot(null);
          setSnapshotStatus("error");
        } else {
          setSnapshot(snapshotResult.data);
          setSnapshotStatus("ready");
        }
      })();
    },
    [provider],
  );

  const primaryPoolKey = useMemo(() => {
    if (!pools) return null;
    return selectPrimaryPool(pools)?.metadata.key ?? null;
  }, [pools]);

  const error =
    status === "error" && quality
      ? `Pool discovery failed — ${quality.error ?? "unknown provider error"}.`
      : (metadataStatus === "error" || snapshotStatus === "error") && quality
        ? `Pool detail failed — ${quality.error ?? "unknown provider error"}.`
        : null;

  return {
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
  };
}
