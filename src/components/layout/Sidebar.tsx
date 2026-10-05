"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/config/navigation";
import { cn } from "@/utils/cn";

/**
 * Persistent sidebar navigation (docs/03-design.md). Fixed on lg+, slide-in
 * drawer on smaller screens. Additive: new phases register routes in
 * src/config/navigation.ts and appear here automatically.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-panel transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-border px-4 py-4">
          <p className="font-mono text-sm font-semibold tracking-tight">LP Risk &amp; Hedge</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-faint">
            Intelligence Platform
          </p>
        </div>
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {ROUTES.map((route) => {
              const active =
                pathname === route.href ||
                (route.href !== "/" && pathname.startsWith(`${route.href}/`));
              return (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent-muted text-text"
                        : "text-muted hover:bg-panel-2 hover:text-text",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full",
                          active ? "bg-accent" : "bg-border-strong group-hover:bg-faint",
                        )}
                      />
                      {route.label}
                    </span>
                    <span className="font-mono text-[10px] text-faint">{route.phaseLabel}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] leading-relaxed text-faint">
            Read-only research tool. No wallet connection. No execution.
          </p>
        </div>
      </aside>
    </>
  );
}
