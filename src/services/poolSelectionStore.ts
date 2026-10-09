/**
 * Explicit pool-selection hand-off from /pools to /calculator (Phase 3,
 * docs/06 "calculator integration with pool selection").
 *
 * A tiny, typed sessionStorage bridge — deliberately NOT a global calculator
 * state (docs/02: no giant shared state object). The stored record is a
 * suggestion only: the calculator shows it as a banner and the user applies
 * or dismisses it. Pure session scope; nothing persists beyond the tab.
 */

import type { PoolSelection } from "@/services/poolData";

const STORAGE_KEY = "lp-platform.pool-selection.v1";

/** Flat, serializable snapshot of a pool selection. */
export interface StoredPoolSelection {
  /** Canonical pool key (protocol:chain:address). */
  poolKey: string;
  volatileSymbol: string;
  stableSymbol: string;
  entryPrice: number;
  feeTier: number;
  tvlUsd: number | null;
  source: string;
}

export function toStoredPoolSelection(selection: PoolSelection): StoredPoolSelection {
  return {
    poolKey: selection.metadata.key,
    volatileSymbol: selection.volatileSymbol,
    stableSymbol: selection.stableSymbol,
    entryPrice: selection.entryPrice,
    feeTier: selection.feeTier,
    tvlUsd: selection.tvlUsd,
    source: selection.source,
  };
}

/** Stores a selection for this tab. No-op outside the browser. */
export function savePoolSelection(selection: PoolSelection): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStoredPoolSelection(selection)));
  } catch {
    // Storage unavailable (private mode/quota) — the hand-off is optional, stay silent.
  }
}

/** Structural guard for records read back from storage. */
function isStoredPoolSelection(value: unknown): value is StoredPoolSelection {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.poolKey === "string" &&
    record.poolKey.length > 0 &&
    typeof record.volatileSymbol === "string" &&
    typeof record.stableSymbol === "string" &&
    typeof record.entryPrice === "number" &&
    Number.isFinite(record.entryPrice) &&
    record.entryPrice > 0 &&
    typeof record.feeTier === "number" &&
    (record.tvlUsd === null || typeof record.tvlUsd === "number") &&
    typeof record.source === "string"
  );
}

/** Reads the stored selection, or null when absent/invalid. Never throws. */
export function readPoolSelection(): StoredPoolSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredPoolSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Clears the stored selection (used when the user dismisses the banner). */
export function clearPoolSelection(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures — clearing is best-effort.
  }
}
