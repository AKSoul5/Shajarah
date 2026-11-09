// keepGuarded lays a poster out again, without keeping the foundation's
// nearest ancestors, when the first poster is not legible and clean. Its
// attempts that kept none of them are the same layouts: they are reused
// instead of laid out again (the 350-person bench family laid 10 of its 24
// layouts out twice, about 4.5 s). The posters must not change at all.
import { describe, expect, it } from "vitest";
import { computePosterLayout, layoutInternals, type PosterLayout } from "@/lib/layout/botanical";
import { naturalFamily } from "@/lib/samples/natural";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

const geometry = (l: PosterLayout) => JSON.stringify({
  nodes: l.nodes.map((n) => [n.id, n.x, n.y, n.w, n.h, n.fontSize]),
  spouses: l.spouses.map((s) => [s.id, s.x, s.y]),
  edges: l.edges.map((e) => [e.parentId, e.childId, e.points.length, e.points[0], e.points[e.points.length - 1]]),
  soil: l.soil?.count, crown: l.crown, mm: l.legibility.smallestTextMm, issues: l.clarity.issues.length, overlaps: l.overlaps,
});

function both(tree: TreeDTO, paper: "A3" | "A1" | "A0", extra: Record<string, unknown> = {}) {
  const settings = { ...tree.settings, posterSize: paper } as TreeDTO["settings"];
  const opts = { ...layoutOptionsFor(resolveTheme(settings), paper), showFemales: true, ...extra };
  layoutInternals.reuseRetryAttempts = false;
  const t0 = performance.now();
  const plain = computePosterLayout({ ...tree, settings }, opts);
  const t1 = performance.now();
  layoutInternals.reuseRetryAttempts = true;
  const reused = computePosterLayout({ ...tree, settings }, opts);
  const t2 = performance.now();
  return { plain, reused, msPlain: t1 - t0, msReused: t2 - t1 };
}

describe("the retry reuses the first pass's identical attempts", () => {
  const cases: [string, () => TreeDTO, "A3" | "A1" | "A0", Record<string, unknown>?][] = [
    ["the bench family (350, seed 7) on A1", () => naturalFamily(350, 7), "A1"],
    ["the bench family (350, seed 31) on A1", () => naturalFamily(350, 31), "A1"],
    ["a long lineage, shortened foundation, A1", kalaliFilledTree, "A1", { soilShorten: true }],
    ["QA fixture C on A3", () => QA_FIXTURES.C(), "A3"],
    ["QA fixture B on A1", () => QA_FIXTURES.B(), "A1"],
  ];
  for (const [what, build, paper, extra] of cases) {
    it(`${what}: the same poster`, { timeout: 600_000 }, () => {
      const { plain, reused, msPlain, msReused } = both(build(), paper, extra);
      console.log(`${what}: ${msPlain.toFixed(0)} ms without reuse, ${msReused.toFixed(0)} ms with`);
      expect(geometry(reused)).toBe(geometry(plain));
    });
  }
});
