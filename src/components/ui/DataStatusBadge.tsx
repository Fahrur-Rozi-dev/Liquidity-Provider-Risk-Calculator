import { cn } from "@/utils/cn";
import type { DataFreshness } from "@/types";

import { Badge, type BadgeVariant } from "./Badge";

const statusConfig: Record<DataFreshness, { label: string; dotClass: string; variant: BadgeVariant }> = {
  live: { label: "Live", dotClass: "bg-profit", variant: "profit" },
  updating: { label: "Updating", dotClass: "bg-accent", variant: "accent" },
  stale: { label: "Stale", dotClass: "bg-warn", variant: "warn" },
  error: { label: "Provider error", dotClass: "bg-loss", variant: "loss" },
  unavailable: { label: "No live data", dotClass: "bg-faint", variant: "muted" },
};

/**
 * Freshness indicator for realtime views (docs/03-design.md, docs/09-realtime-boundaries.md).
 * The colored dot is aria-hidden; state is always conveyed by the text label,
 * never by color alone.
 */
export function DataStatusBadge({
  status = "unavailable",
  className,
}: {
  status?: DataFreshness;
  className?: string;
}) {
  const { label, dotClass, variant } = statusConfig[status];
  return (
    <Badge variant={variant} className={className}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass)} />
      {label}
    </Badge>
  );
}
