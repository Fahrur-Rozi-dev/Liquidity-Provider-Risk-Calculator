import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Alerts" };

const route = getRouteByPath("/alerts")!;

export default function AlertsPage() {
  return <PlaceholderWorkspace route={route} />;
}
