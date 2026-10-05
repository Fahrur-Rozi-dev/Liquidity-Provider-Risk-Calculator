import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Pools" };

const route = getRouteByPath("/pools")!;

export default function PoolsPage() {
  return <PlaceholderWorkspace route={route} />;
}
