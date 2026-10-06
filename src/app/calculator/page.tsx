import { PageHeader } from "@/components/layout/PageHeader";
import { CalculatorWorkspace } from "@/components/domain/calculator/CalculatorWorkspace";
import { PoolSelectionBanner } from "@/components/domain/calculator/PoolSelectionBanner";
import { getRouteByPath } from "@/config/navigation";

export const metadata = { title: "Calculator" };

const route = getRouteByPath("/calculator")!;

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader route={route} />
      <PoolSelectionBanner />
      <CalculatorWorkspace />
    </div>
  );
}
