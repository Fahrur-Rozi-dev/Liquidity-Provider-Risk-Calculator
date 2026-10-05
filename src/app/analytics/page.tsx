import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Analytics" };

const route = getRouteByPath("/analytics")!;

export default function AnalyticsPage() {
  return <PlaceholderWorkspace route={route} />;
}
