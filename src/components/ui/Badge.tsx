import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export type BadgeVariant = "neutral" | "accent" | "profit" | "loss" | "warn" | "muted";

const badgeStyles: Record<BadgeVariant, string> = {
  neutral: "border-border-strong bg-panel-2 text-text",
  accent: "border-accent/40 bg-accent-muted text-accent",
  profit: "border-profit/40 bg-profit/10 text-profit",
  loss: "border-loss/40 bg-loss/10 text-loss",
  warn: "border-warn/40 bg-warn/10 text-warn",
  muted: "border-border bg-transparent text-muted",
};

/** Compact status/label chip. Color is always paired with readable text. */
export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
