import { PHASES } from "@/config/phases";

describe("phase registry", () => {
  it("registers phases 0..8 in order", () => {
    expect(PHASES.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("marks phases 0–1 complete, phase 2 in progress, everything else planned", () => {
    // Completed phases must never regress below complete.
    expect(PHASES[0].status).toBe("complete");
    expect(PHASES[1].status).toBe("complete");
    // Phase 2 (Exact CLMM) is the active phase.
    expect(PHASES[2].status).toBe("in-progress");
    // Future phases stay planned until their phase begins.
    expect(PHASES.slice(3).every((p) => p.status === "planned")).toBe(true);
  });
});
