import { cn } from "@/utils/cn";
import type { DataQualityStatus } from "@/types";

import { Badge, type BadgeVariant } from "./Badge";

/**
 * Canonical data-status indicator (docs/05 DataQuality, docs/03 Realtime UX).
 * The colored dot is aria-hidden; state is always conveyed by the text label,
 * never by color alone.
 */
const statusConfig: Record<DataQualityStatus, { label: string; dotClass: string; variant: BadgeVariant }> = {
  fresh: { label: "Live", dotClass: "bg-profit", variant: "profit" },
  stale: { label: "Stale", dotClass: "bg-warn", variant: "warn" },
  partial: { label: "Partial", dotClass: "bg-accent", variant: "accent" },
  error: { label: "Provider error", dotClass: "bg-loss", variant: "loss" },
  unavailable: { label: "No live data", dotClass: "bg-faint", variant: "muted" },
};

export function DataStatusBadge({
  status = "unavailable",
  className,
}: {
  status?: DataQualityStatus;
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
