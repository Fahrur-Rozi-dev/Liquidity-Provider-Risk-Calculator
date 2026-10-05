import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getRouteByPath, ROUTES } from "@/config/navigation";
import { PHASES, type PhaseStatus } from "@/config/phases";

export const metadata = { title: "Overview" };

const route = getRouteByPath("/")!;

const phaseStatusVariant: Record<PhaseStatus, BadgeVariant> = {
  complete: "profit",
  "in-progress": "accent",
  planned: "muted",
};

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader route={route} />

      {/* Read-only security boundary — stated on every entry point, from day one. */}
      <Card className="border-warn/30">
        <div className="px-4 py-3 text-sm leading-relaxed">
          <span className="font-medium text-warn">Read-only research tool.</span>{" "}
          <span className="text-muted">
            No wallet connection, no key or seed-phrase handling, no transaction signing, no trade
            execution, and no automated liquidity or hedge actions — ever. Realtime features
            provide data, analysis, and alerts only.
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Phase status" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-4 py-2 font-medium">Phase</th>
                <th scope="col" className="px-4 py-2 font-medium">Name</th>
                <th scope="col" className="px-4 py-2 font-medium">Routes</th>
                <th scope="col" className="px-4 py-2 font-medium">Summary</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase) => (
                <tr key={phase.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-muted">
                    {phase.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{phase.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                    {phase.routes.join(", ")}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-muted">{phase.summary}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Badge variant={phaseStatusVariant[phase.status]}>{phase.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Route map" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-4 py-2 font-medium">Route</th>
                <th scope="col" className="px-4 py-2 font-medium">Workspace</th>
                <th scope="col" className="px-4 py-2 font-medium">Phase</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r) => (
                <tr key={r.href} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-accent">
                    {r.href}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{r.title}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                    {r.phaseLabel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Badge variant={r.status === "in-progress" ? "accent" : "muted"}>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
