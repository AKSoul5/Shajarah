// A canopy whose centred son's family spread further on one side than the
// other leaned that way: a private 340-person family at A0 had its names'
// centre 20.5 mm right of the trunk (reaching 229 mm left, 299 mm right).
// His children's slices are now moved across within his span until the
// weight is over the trunk; his brothers, every family's order and its
// share stay as they were, and it is kept only when no name is smaller.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import type { TreeDTO } from "@/lib/types";

/** Five sons, the middle one centred; of his children, the elder ones childless, the two youngest with families (invented names). */
function leaningFamily(childless: number, wide: number, leader: number): TreeDTO {
  const b = new Builder("lean", AR);
  const top = b.trunk(5);
  const head = b.person("MALE", { father: top });
  for (let i = 0; i < 3; i++) b.person("MALE", { father: head, order: i });
  const centred = b.person("MALE", { father: head, order: 3 });
  for (let i = 0; i < 2; i++) b.person("MALE", { father: head, order: 4 + i });
  for (let i = 0; i < childless; i++) b.person("MALE", { father: centred, order: i });
  const lead = b.person("MALE", { father: centred, order: childless });
  for (let i = 0; i < leader; i++) {
    const g = b.person("MALE", { father: lead, order: i });
    for (let j = 0; j < 2; j++) b.person("MALE", { father: g, order: j });
  }
  const far = b.person("MALE", { father: centred, order: childless + 1 });
  for (let i = 0; i < wide; i++) {
    const g = b.person("MALE", { father: far, order: i });
    for (let j = 0; j < 3; j++) b.person("MALE", { father: g, order: j });
  }
  return { ...b.tree("lean", head), settings: {} } as TreeDTO;
}

/** Where the canopy's names are, on average, off the trunk: a share of its half-width. */
const weight = (l: PosterLayout) => {
  const cx = l.origin.x;
  const half = Math.max(...l.nodes.map((n) => Math.abs(n.x - cx)));
  return l.nodes.reduce((s, n) => s + n.x - cx, 0) / l.nodes.length / half;
};
const median = (l: PosterLayout) => {
  const f = l.nodes.map((n) => n.fontSize).sort((a, b) => a - b);
  return f[f.length >> 1];
};
/** Each father's children in order round the trunk, from left to right. */
const orders = (l: PosterLayout) => {
  const by = new Map<string, { id: string; a: number }[]>();
  const angle = (n: { x: number; y: number }) => Math.atan2(l.origin.y - n.y, n.x - l.origin.x);
  for (const n of l.nodes) if (n.parentId) by.set(n.parentId, [...(by.get(n.parentId) ?? []), { id: n.member.id, a: angle(n) }]);
  return new Map([...by].map(([p, ks]) => [p, ks.sort((a, b) => b.a - a.a).map((k) => k.id).join()]));
};

describe("a canopy spreading further one way is set over the trunk", () => {
  const cases: ["A1" | "A0", [number, number, number]][] = [["A1", [6, 4, 6]], ["A0", [8, 5, 7]]];
  for (const [paper, shape] of cases) {
    it(`a centred family leaning to one side, ${paper}`, { timeout: 300_000 }, () => {
      const tree = leaningFamily(...shape);
      const opts = layoutOptionsFor(resolveTheme(tree.settings), paper);
      const set = computePosterLayout(tree, opts);
      const leaned = computePosterLayout(tree, { ...opts, weighOver: false });
      // (leaned 0.17 and 0.19 of the half-width; now within 0.05)
      expect(Math.abs(weight(leaned))).toBeGreaterThan(0.1);
      expect(Math.abs(weight(set))).toBeLessThan(0.05);
      // clean, every name drawn, none smaller, the same families in the same order
      expect(set.overlaps).toBe(0);
      expect(set.clarity.issues).toEqual([]);
      expect(set.legibility.ok).toBe(true);
      expect(set.nodes.map((n) => `${n.member.id}<${n.parentId}`).sort()).toEqual(leaned.nodes.map((n) => `${n.member.id}<${n.parentId}`).sort());
      expect(median(set)).toBeGreaterThanOrEqual(median(leaned) * 0.99);
      expect(set.legibility.smallestTextMm).toBeGreaterThanOrEqual(leaned.legibility.smallestTextMm * 0.99);
      expect(orders(set)).toEqual(orders(leaned));
      // the same names on the trunk (which, as ever, follows the names' size)
      expect(set.trunkLabels.map((t) => t.member.id)).toEqual(leaned.trunkLabels.map((t) => t.member.id));
    });
  }

  it("leaves a canopy already over its trunk as it was", { timeout: 300_000 }, () => {
    const tree = kalaliFilledTree();
    const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), soilShorten: true };
    const a = computePosterLayout(tree, opts), b = computePosterLayout(tree, { ...opts, weighOver: false });
    expect(a.nodes.map((n) => [n.member.id, Math.round(n.x), Math.round(n.y)])).toEqual(b.nodes.map((n) => [n.member.id, Math.round(n.x), Math.round(n.y)]));
  });
});
