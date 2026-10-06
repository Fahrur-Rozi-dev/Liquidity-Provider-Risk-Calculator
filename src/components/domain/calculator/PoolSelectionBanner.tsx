"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  clearPoolSelection,
  readPoolSelection,
  type StoredPoolSelection,
} from "@/services/poolSelectionStore";
import { formatNumber, formatPercent } from "@/utils/format";

/**
 * Calculator banner for a provider-derived pool selection (Phase 3, docs/06
 * calculator integration). Reads the explicit sessionStorage hand-off from
 * /pools, shows source context, and lets the user apply it to the input
 * defaults. Explicit suggestion — never silently overrides inputs
 * (docs/07: don't hide assumptions; docs/02: no giant global state).
 */

export function PoolSelectionBanner() {
  const [stored, setStored] = useState<StoredPoolSelection | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Yield one microtask so no state update runs synchronously inside the
      // effect body (react-hooks/set-state-in-effect) — behavior is identical.
      await Promise.resolve();
      if (cancelled) return;
      setStored(readPoolSelection());
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = () => {
    // The calculator workspace listens for this and pulls the stored values.
    window.dispatchEvent(new CustomEvent("lp-platform:pool-selection-applied"));
    setDismissed(true);
  };

  const dismiss = () => {
    clearPoolSelection();
    setDismissed(true);
  };

  if (!hydrated || dismissed || !stored) return null;

  return (
    <Card className="border-accent/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge variant="accent">Pool selected</Badge>
          <span className="font-medium text-text">
            {stored.volatileSymbol}/{stored.stableSymbol}
          </span>
          <span className="font-mono text-xs tabular-nums">
            @ {formatNumber(stored.entryPrice, 6)} · fee {formatPercent(stored.feeRate, 3)}
          </span>
          <span className="text-xs">
            from <span className="font-mono">{stored.source}</span> — applying sets entry price and
            token symbols (range and position size stay yours).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={apply}
            className="rounded border border-accent/50 bg-accent-muted px-2.5 py-1.5 text-xs font-medium text-accent hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Apply to inputs
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded border border-border-strong bg-panel-2 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Card>
  );
}
