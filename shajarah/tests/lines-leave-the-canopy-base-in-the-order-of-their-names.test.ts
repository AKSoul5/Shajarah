// Lines leaving the canopy base's centre leave it in the order their names
// stand round it, far enough apart that a thick limb's start never sweeps
// across a thinner brother's line. Found on a private 340-person family at
// 2A0 (here anonymised: every name replaced by an invented one of the same
// length, so every name measures the same): the limb to its second son,
// bent round a name, set out at about 30° above the horizontal, below the
// line to its third son (47°), whose name stands lower; the limb swept
// across it just past the medallion, the poster's one problem ("crossing
// between siblings"), so it was never clean.
//
// (The recipe below is that poster's, made before the fix: replayed, it is
// laid out by the same attempt of the search.)
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computePosterLayout, replayLayout, type LayoutRecipe, type PosterLayout } from "@/lib/layout/botanical";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/family-340-anonymised.json", import.meta.url), "utf8"));
const family = { ...fixture, id: "anonymised-340", sources: [], citations: [], media: [] } as TreeDTO;

/** Each line from the canopy base's centre: the angle it sets out at and the angle of its name, above the horizontal on its side. */
function baseLines(l: PosterLayout) {
  const o = l.origin;
  return l.edges
    .filter((e) => e.parentId === l.base?.id && Math.hypot(e.points[0].x - o.x, e.points[0].y - o.y) < 0.5)
    .map((e) => {
      const end = e.points.at(-1)!;
      const side = end.x >= o.x ? 1 : -1;
      const elev = (v: { x: number; y: number }) => Math.atan2(-v.y, side * v.x);
      return { id: e.childId, side, start: elev({ x: e.points[1].x - o.x, y: e.points[1].y - o.y }), end: elev({ x: end.x - o.x, y: end.y - o.y }) };
    });
}

/** Whether, on each side, the lines set out in the order their names stand (the highest name, the highest start). */
function inOrder(l: PosterLayout) {
  for (const side of [1, -1]) {
    const lines = baseLines(l).filter((b) => b.side === side && Math.abs(b.end - Math.PI / 2) > 0.02).sort((a, b) => b.end - a.end);
    for (let i = 1; i < lines.length; i++) if (lines[i].start >= lines[i - 1].start) return false;
  }
  return true;
}

const crossingsAtBase = (l: PosterLayout) =>
  l.clarity.issues.filter((i) => i.kind === "crossing" && i.edge?.[0] === l.base?.id && (i.other as string[] | undefined)?.[0] === l.base?.id);

describe("lines leave the canopy base in the order of their names", () => {
  it("the 340-person family's poster at 2A0: no crossing between brothers at the base", () => {
    const l = replayLayout(family, fixture.recipe2A0 as LayoutRecipe);
    expect(crossingsAtBase(l)).toEqual([]);
    expect(l.clarity.issues.filter((i) => i.detail === "between siblings")).toEqual([]);
    expect(inOrder(l)).toBe(true);
    // (and clean: with the crossing gone, the untangling had nothing left
    // to move and stopped before its last drawing, which bends clear a line
    // under one of a woman's four husbands' boxes; now drawn while any
    // problem is left)
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
  });

  it("the line moved below the limb never sets out lower than the way to its own name", () => {
    const l = replayLayout(family, fixture.recipe2A0 as LayoutRecipe);
    // (the third son's line: had it set out below its own name's direction,
    // it would dip and then rise to the name)
    const third = baseLines(l).find((b) => b.id === "cmve7c5c9004qqexfv0oza7fv")!;
    const second = baseLines(l).find((b) => b.id === "cmve7aw5s004bqexfqvd1edv7")!;
    expect(third.start).toBeLessThan(second.start);
    expect(third.start).toBeGreaterThanOrEqual(third.end);
  });

  it("the families of the layout QA keep their base lines in order", { timeout: 600_000 }, () => {
    for (const make of [QA_FIXTURES.A, QA_FIXTURES.B]) {
      const tree = { ...make(), settings: { showFemales: true, theme: { preset: "classic", v: 2, motherNames: true } } } as TreeDTO;
      const l = computePosterLayout(tree, { showFemales: true, ...layoutOptionsFor(resolveTheme(tree.settings), "A1") });
      expect(inOrder(l), tree.name).toBe(true);
      expect(crossingsAtBase(l), tree.name).toEqual([]);
    }
  });
});
