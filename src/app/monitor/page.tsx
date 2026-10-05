import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Realtime Monitor" };

const route = getRouteByPath("/monitor")!;

export default function MonitorPage() {
  return <PlaceholderWorkspace route={route} />;
}
