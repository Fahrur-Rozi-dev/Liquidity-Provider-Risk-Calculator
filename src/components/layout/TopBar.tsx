"use client";

import { usePathname } from "next/navigation";

import { DataStatusBadge } from "@/components/ui/DataStatusBadge";
import { getRouteByPath } from "@/config/navigation";

/**
 * Top bar: page title + data status (docs/03-design.md). Phase 0 has no data
 * providers yet, so the badge honestly reports "No live data" instead of
 * implying a live connection (docs/07-do-and-donts.md).
 */
export function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const route = getRouteByPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Toggle navigation menu"
        className="rounded-md border border-border p-1.5 text-muted hover:text-text lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {/* Styled as a span, not h1: the page's PageHeader owns the document h1. */}
      <span className="truncate text-sm font-semibold">{route?.title ?? "Overview"}</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden font-mono text-[11px] uppercase tracking-wide text-faint sm:inline">
          Data status
        </span>
        <DataStatusBadge status="unavailable" />
      </div>
    </header>
  );
}
