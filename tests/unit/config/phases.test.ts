import { PHASES } from "@/config/phases";

describe("phase registry", () => {
  it("registers phases 0..8 in order", () => {
    expect(PHASES.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("marks phases 0–2 complete, phase 3 in progress, everything else planned", () => {
    // Completed phases must never regress below complete.
    expect(PHASES[0].status).toBe("complete");
    expect(PHASES[1].status).toBe("complete");
    expect(PHASES[2].status).toBe("complete");
    // Phase 3 (Production Data Foundation, docs/06) is the active phase.
    expect(PHASES[3].status).toBe("in-progress");
    // Future phases stay planned until their phase begins.
    expect(PHASES.slice(4).every((p) => p.status === "planned")).toBe(true);
  });

  it("reflects the re-ordered roadmap: phase 3 is Production Data Foundation on /pools", () => {
    // docs/06-roadmap.md: "This phase replaces the old Phase 5 position in the
    // roadmap." Dynamic hedge moved to Phase 4; pools data foundation to Phase 3.
    expect(PHASES[3].name).toBe("Production Data Foundation");
    expect(PHASES[3].routes).toEqual(["/pools"]);
    expect(PHASES[4].name).toBe("Dynamic Hedge");
    expect(PHASES[4].routes).toEqual(["/hedge"]);
  });

  it("gives the data-workspace phases (3+) unique routes", () => {
    // /calculator is legitimately shared by phases 1–2; later workspaces have
    // their own route each.
    const routes = PHASES.slice(3).flatMap((p) => p.routes as readonly string[]);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
    expect(PHASES[3].routes).toEqual(["/pools"]);
  });
});
