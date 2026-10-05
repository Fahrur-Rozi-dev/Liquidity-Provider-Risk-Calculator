import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Base surface: bordered panel used across all workspaces. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-border bg-panel", className)}>{children}</div>;
}

/** Bordered card header strip with an optional title and right-side actions. */
export function CardHeader({
  title,
  actions,
  className,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border px-4 py-3", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
