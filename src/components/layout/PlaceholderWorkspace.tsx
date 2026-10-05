import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

import type { AppRoute } from "@/config/navigation";
import { PageHeader } from "./PageHeader";

/**
 * Shared placeholder for workspaces arriving in later phases.
 * It lists the phase's planned capabilities (from the route registry) and an
 * honest empty state — never fake data (docs/07-do-and-donts.md).
 */
export function PlaceholderWorkspace({ route }: { route: AppRoute }) {
  return (
    <div className="space-y-6">
      <PageHeader route={route} />
      {route.deliverables.length > 0 ? (
        <Card>
          <CardHeader title={`Planned capabilities — ${route.phaseLabel}`} />
          <ul className="grid gap-x-6 gap-y-2 px-4 py-4 sm:grid-cols-2">
            {route.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <EmptyState
        title="Not yet implemented"
        description="This workspace is added by its phase without replacing any existing page. Domain engines land first, then services, then UI."
      />
    </div>
  );
}
