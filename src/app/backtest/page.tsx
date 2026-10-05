import { PlaceholderWorkspace } from "@/components/layout/PlaceholderWorkspace";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Backtest" };

const route = getRouteByPath("/backtest")!;

export default function BacktestPage() {
  return <PlaceholderWorkspace route={route} />;
}
