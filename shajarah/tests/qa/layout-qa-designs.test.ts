// Layout QA, node designs: each of the seven designs drawn from an outline
// (src/lib/layout/nodeGeometry.ts) on the three families in every display
// mode (Botanical Classic, A2), and on the complex family with everything
// shown in all seven poster designs. A new design must be clean outright:
// no defect of any kind, and no names or rings touching. See run.ts.
import { describe, expect, it } from "vitest";
import { DESIGNS } from "@/lib/layout/nodeGeometry";
import { ENABLED, MODES, THEMES, runCase, type Mode } from "./run";

const SHAPES = Object.keys(DESIGNS);

describe.skipIf(!ENABLED)("layout QA · node designs", () => {
  const cases: [fixture: "A" | "B" | "C", mode: Mode, theme: (typeof THEMES)[number], shape: string][] = [];
  for (const shape of SHAPES) {
    for (const fixture of ["A", "B", "C"] as const) for (const mode of Object.keys(MODES) as Mode[]) cases.push([fixture, mode, "classic", shape]);
    for (const theme of THEMES) if (theme !== "classic") cases.push(["B", "all", theme, shape]);
  }
  for (const [fixture, mode, theme, shape] of cases) {
    it(`${fixture}_${mode}_${theme}_A2_${shape}`, () => {
      const r = runCase(fixture, mode, theme, "A2", undefined, shape);
      expect(r.defects, `${r.id}: ${JSON.stringify(r.counts)}`).toBe(0);
      expect(r.counts["decor-overlap"] ?? 0, r.id).toBe(0);
      expect(r.counts["decor-tight"] ?? 0, r.id).toBe(0);
    }, 600_000);
  }
});
