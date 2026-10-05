import { Badge } from "@/components/ui/Badge";
import type { AppRoute } from "@/config/navigation";

/** Standard page header: title, phase badge, description — driven by the route registry. */
export function PageHeader({ route }: { route: AppRoute }) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{route.title}</h1>
        <Badge variant={route.status === "in-progress" ? "accent" : "muted"}>
          {route.phaseLabel}
        </Badge>
        {route.status === "planned" ? <Badge variant="muted">Planned</Badge> : null}
      </div>
      <p className="mt-2 max-w-3xl text-sm text-muted">{route.description}</p>
    </header>
  );
}
