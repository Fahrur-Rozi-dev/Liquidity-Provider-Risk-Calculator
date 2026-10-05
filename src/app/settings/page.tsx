import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Settings" };

const route = getRouteByPath("/settings")!;

export default function SettingsPage() {
  return <PlaceholderWorkspace route={route} />;
}
