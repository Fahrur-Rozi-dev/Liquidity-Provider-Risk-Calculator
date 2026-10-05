import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Neutral empty/placeholder state used instead of fake data. */
export function EmptyState({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-panel/50 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-text">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {children}
    </div>
  );
}
