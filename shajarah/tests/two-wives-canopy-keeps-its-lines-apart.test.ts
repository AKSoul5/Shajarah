// A canopy base with two wives and seventeen children (interleaved by birth:
// nine by his first wife, two of her daughters with families shown through
// them on dotted lines, five sons with no mother recorded, three by his
// second wife), with every one shown: his lines to his wives' boxes and to
// his sons with no mother recorded ran together just above him, in four or
// five places (8A0: refined 4 merges and a false junction; emerald 4
// merges; A0 emerald 1 merge), as on a 340-person family. The layout's own
// check read the daughters' dotted lines as detached and never untangled,
// and five problems at one man were more than the untangling takes on.
// The family is invented (src/lib/samples/twoWivesCanopy.ts).
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { TreePoster } from "@/components/poster/TreePoster";
import { twoWivesCanopy } from "@/lib/samples/twoWivesCanopy";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";
(globalThis as unknown as { React: typeof React }).React = React;

const { tree, mothers } = twoWivesCanopy();
const base = tree.crownBaseId!;
const lay = (preset: string, paper: string, all: boolean, soilStyle?: string) => {
  const settings = { showFemales: all, familiesThrough: all ? mothers : [], theme: { preset, motherNames: all, ...(soilStyle ? { soilStyle } : {}) } } as TreeDTO["settings"];
  const theme = resolveTheme(settings);
  return { l: computePosterLayout({ ...tree, settings }, layoutOptionsFor(theme, paper as never)), theme };
};
const dist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)) : 0;
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
};
/** Lines from the base, or from his wives' boxes, whose outer half runs alongside another line for three samples (as drawn: from the layout's edges). */
const runningTogether = (l: PosterLayout) => {
  const mine = l.edges.filter((e) => e.parentId === base || e.parentId.startsWith(`spouse:${base}:`));
  const found: string[] = [];
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 1; j < mine.length; j++) {
      const a = mine[i], b = mine[j];
      // (a line and its continuation meet at the box between them)
      if (a.childId === b.parentId || b.childId === a.parentId) continue;
      // (each line as wide as drawn where it is: tapering from w0 to w1)
      const width = (e: typeof a, k: number, n: number) => e.w0 + (e.w1 - e.w0) * (k / Math.max(1, n - 1));
      const half = Math.floor(a.points.length / 2);
      // (brothers and sisters leave one place together: only their outer halves)
      const from = a.parentId === b.parentId ? Math.floor(b.points.length / 2) : 0;
      let run = 0;
      for (let i2 = half; i2 < a.points.length; i2++) {
        const p = a.points[i2];
        let near = false;
        for (let k = Math.max(1, from); k < b.points.length && !near; k++) {
          near = dist(p, b.points[k - 1], b.points[k]) < (width(a, i2, a.points.length) + width(b, k, b.points.length)) / 2;
        }
        run = near ? run + 1 : 0;
        if (run >= 3) { found.push(`${a.childId} / ${b.childId}`); break; }
      }
    }
  }
  return found;
};

describe("a man with two wives keeps his lines apart", () => {
  it("the family as usually drawn (no daughters, no spouses' boxes)", { timeout: 900_000 }, () => {
    const { l } = lay("refined", "8A0", false);
    expect(l.overlaps).toBe(0);
    expect(l.clarity.issues).toEqual([]);
    expect(l.legibility.ok).toBe(true);
  });
  // (emerald with the paragraph foundation, as the family it was found on)
  for (const [preset, paper, soil] of [["refined", "8A0", undefined], ["emerald", "8A0", "paragraph"], ["emerald", "A0", "paragraph"]] as const) {
    it(`everyone shown, ${preset}${soil ? ` (${soil} foundation)` : ""}, ${paper}: no lines run together at him`, { timeout: 900_000 }, () => {
      const { l, theme } = lay(preset, paper, true, soil);
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
      // both wives' boxes drawn, and his lines apart as drawn
      expect(l.spouses.filter((s) => s.id.startsWith(`spouse:${base}:`))).toHaveLength(2);
      expect(runningTogether(l)).toEqual([]);
      const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout: l, meta: { title: tree.title, subtitle: null, name: "" }, theme }));
      for (const s of l.spouses.filter((x) => x.id.startsWith(`spouse:${base}:`))) expect(svg).toContain(s.member.name);
    });
  }
});
