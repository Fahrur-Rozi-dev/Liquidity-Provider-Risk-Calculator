import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LP Risk & Hedge Intelligence",
    template: "%s · LP Risk & Hedge Intelligence",
  },
  description:
    "Read-only research and decision-support platform for concentrated liquidity providers: valuation, scenarios, hedging, backtesting, pool analytics, realtime monitoring, and alerts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
