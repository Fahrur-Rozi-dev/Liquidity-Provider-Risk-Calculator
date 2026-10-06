import { PageHeader } from "@/components/layout/PageHeader";
import { PoolsWorkspace } from "@/components/domain/pools/PoolsWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Pools" };

const route = getRouteByPath("/pools")!;

/**
 * Pools workspace route (Phase 3 — Production Data Foundation, docs/06).
 *
 * The server component renders only serializable props; the workspace creates
 * its provider instance client-side (class instances cannot cross the
 * server→client boundary). It depends on the PoolDataProvider INTERFACE only —
 * the deterministic fixture is the documented Phase 3 default (docs/06:
 * fixtures implement the same interfaces as production adapters) and can be
 * swapped for the live Raydium adapter later without touching the workspace.
 */
export default function PoolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader route={route} />
      <PoolsWorkspace />
    </div>
  );
}
