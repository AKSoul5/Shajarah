// Each generation keeps to one arc whatever the design and its foundation.
//
// A canopy that has reached the page's width and is given more height (a
// short foundation such as the paragraph, or none at all) grew taller
// instead, and on a canopy taller than wide each generation's names stepped
// along its sides: the same family was on smooth arcs in one design and
// stepped in another (found on an 8A0 poster in the paragraph foundation;
// measured on the invented families below: fanKink 0.54-0.63 against 0.24
// in the default design). It is laid out again no taller than wide, kept
// only when it is as clean and as legible, with names at least 90% of their
// size, and smoother.
import { describe, expect, it } from "vitest";
import { computePosterLayout, fanKink } from "@/lib/layout/botanical";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { naturalFamily } from "@/lib/samples/natural";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

const layoutIn = (t: TreeDTO, preset: string, soil: string, paper: "A1" | "A0", extra = {}) => {
  const settings = { ...t.settings, theme: { preset } } as TreeDTO["settings"];
  return computePosterLayout({ ...t, settings }, { ...layoutOptionsFor(resolveTheme(settings), paper), showFemales: true, soilStyle: soil as never, ...extra });
};
const clean = (l: ReturnType<typeof computePosterLayout>) => l.overlaps === 0 && l.clarity.ok && l.clarity.clearCrossings === 0;

describe("each generation on one arc, in every design and foundation", () => {
  const filled = kalaliFilledTree();
  const cases: [string, TreeDTO, string, string, "A1" | "A0"][] = [
    ["a family with a long lineage, default design, paragraph foundation", filled, "refined", "paragraph", "A0"],
    ["the same in Heritage (paragraph foundation)", filled, "heritage", "paragraph", "A1"],
    ["a large family with no lineage under the trunk, default design", naturalFamily(350, 23), "refined", "column", "A0"],
  ];
  for (const [what, t, preset, soil, paper] of cases) {
    it(what, { timeout: 120_000 }, () => {
      const l = layoutIn(t, preset, soil, paper);
      // (the poster as it was: the canopy free to grow taller than wide)
      const tall = layoutIn(t, preset, soil, paper, { crownRatioCap: 1e9 });
      expect(tall.crown.ry).toBeGreaterThan(tall.crown.rx);
      expect(clean(l)).toBe(true);
      expect(l.legibility.ok).toBe(true);
      expect(l.crown.ry).toBeLessThanOrEqual(l.crown.rx);
      expect(fanKink(l)).toBeLessThan(0.3);
      expect(l.legibility.smallestTextMm).toBeGreaterThanOrEqual(tall.legibility.smallestTextMm * 0.9);
    });
  }
  it("as smooth as the default design's foundation, in the paragraph one", { timeout: 120_000 }, () => {
    const column = fanKink(layoutIn(filled, "refined", "column", "A0"));
    const paragraph = fanKink(layoutIn(filled, "refined", "paragraph", "A0"));
    expect(paragraph).toBeLessThanOrEqual(column + 0.05);
  });
});
