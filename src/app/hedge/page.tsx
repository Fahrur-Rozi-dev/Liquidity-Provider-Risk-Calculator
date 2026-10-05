import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Dynamic Hedge" };

const route = getRouteByPath("/hedge")!;

export default function HedgePage() {
  return <PlaceholderWorkspace route={route} />;
}
