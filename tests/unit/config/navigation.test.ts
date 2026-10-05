import { getRouteByPath, ROUTES } from "@/config/navigation";

/**
 * Route regression gate (docs/10-quality-gates.md): the documented route map
 * from docs/02-structure.md must always exist, in this exact order.
 * Adding routes is allowed; removing or replacing them is not.
 */
const DOCUMENTED_ROUTES = [
  "/",
  "/calculator",
  "/hedge",
  "/backtest",
  "/pools",
  "/analytics",
  "/monitor",
  "/alerts",
  "/settings",
];

describe("route registry", () => {
  it("contains exactly the documented routes, in order", () => {
    expect(ROUTES.map((r) => r.href)).toEqual(DOCUMENTED_ROUTES);
  });

  it("gives every route a title, description and phase label", () => {
    for (const route of ROUTES) {
      expect(route.title.trim().length).toBeGreaterThan(0);
      expect(route.description.trim().length).toBeGreaterThan(0);
      expect(route.phaseLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it("never marks a route as complete (routes are only ever added)", () => {
    for (const route of ROUTES) {
      expect(["in-progress", "planned"]).toContain(route.status);
    }
  });
});

describe("getRouteByPath", () => {
  it("matches exact paths", () => {
    expect(getRouteByPath("/calculator")?.id).toBe("calculator");
    expect(getRouteByPath("/")?.id).toBe("overview");
  });

  it("matches nested paths by longest prefix", () => {
    expect(getRouteByPath("/calculator/sub")?.id).toBe("calculator");
  });

  it("returns undefined for unknown roots", () => {
    expect(getRouteByPath("/nonexistent")).toBeUndefined();
    expect(getRouteByPath("/unknown/deep")).toBeUndefined();
  });
});
