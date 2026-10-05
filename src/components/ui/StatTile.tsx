import { cn } from "@/utils/cn";

/** Compact KPI tile for headline numbers. Value text carries the meaning; tone color is secondary. */
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "profit" | "loss";
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-panel px-4 py-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
