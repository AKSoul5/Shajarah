// With the space round the canopy base's name removed, the base's lines
// under a wife's box on the stem leave the sides of the trunk's neck, level
// with the base's name, rather than from under the stem (they came out of
// its side as if from the wife on it). The clarity check accepts such a
// start as attached, as it does a trunk ancestor's line leaving the trunk
// at his row. This holds that exception to exactly that: the canopy base's
// own lines, from the side of its neck, at its row; nothing else.
import { describe, expect, it } from "vitest";
import type { Edge, PosterLayout, PosterNode } from "@/lib/layout/botanical";
import { validateRelationships } from "@/lib/layout/clarity";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const member = (id: string, fatherId: string | null): MemberDTO => ({
  id, name: id, laqab: null, gender: "MALE", birthYear: null, deathYear: null, isDeceased: false,
  birthOrder: 0, generation: 0, notes: null, fatherId, motherId: null,
});
const tree: TreeDTO = {
  id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: "P",
  crownBaseId: "P", trunkStartId: null, soilText: null, settings: null, marriages: [], sources: [], citations: [], media: [],
  members: [member("P", null), member("A", "P"), member("A1", "A")],
};
const node = (id: string, x: number, y: number, w: number, h: number, parentId: string | null): PosterNode => ({
  id, member: tree.members.find((m) => m.id === id)!, x, y, depth: id === "P" ? 0 : 1, generation: 0, w, h, fontSize: 16,
  shape: id === "P" ? "medallion" : "pill", label: id, subLabel: null, terminal: id === "A1", angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1, parentId,
});
const line = (parentId: string, childId: string, a: { x: number; y: number }, b: { x: number; y: number }): Edge => ({
  parentId, childId, w0: 4, w1: 3,
  points: Array.from({ length: 17 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 16, y: a.y + ((b.y - a.y) * i) / 16 })),
});

// The canopy base P (an oval 80 × 50 at 500, 800) on a neck 200 wide; its
// son A up and to the left, A's son A1 further out.
const P = node("P", 500, 800, 80, 50, null);
const A = node("A", 200, 600, 60, 24, "P");
const A1 = node("A1", 100, 400, 60, 24, "A");
const neck = { w: 200, top: 775, bottom: 800 };
const drawing = (pa: { x: number; y: number }, opts: { neck?: typeof neck | null; aStart?: { x: number; y: number } } = {}) => ({
  nodes: [A, A1], stubs: [], base: P, trunkLabels: [], spouses: [],
  edges: [line("P", "A", pa, A), line("A", "A1", opts.aStart ?? A, A1)],
  origin: { x: 500, y: 800 }, trunkWidth: 240, neck: opts.neck === undefined ? neck : opts.neck,
}) as unknown as PosterLayout;
const misattached = (l: PosterLayout, parent: string) =>
  validateRelationships(l, tree).issues.filter((i) => i.kind === "misattached" && i.detail === "start" && i.edge?.[0] === parent);

describe("only the canopy base's own lines may leave the side of its neck", () => {
  it("the base's line from the side of its neck, at its row: attached", () => {
    expect(misattached(drawing({ x: 400, y: 800 }), "P")).toEqual([]);
    // (anywhere along its row on the neck's side, within the name's height)
    expect(misattached(drawing({ x: 400, y: 780 }), "P")).toEqual([]);
  });
  it("the base's line from its neck's side but below its row: not attached", () => {
    expect(misattached(drawing({ x: 400, y: 860 }), "P")).toHaveLength(1);
  });
  it("the base's line from beyond the neck's width: not attached", () => {
    expect(misattached(drawing({ x: 380, y: 800 }), "P")).toHaveLength(1);
  });
  it("with no neck, the same start is not attached", () => {
    expect(misattached(drawing({ x: 400, y: 800 }, { neck: null }), "P")).toHaveLength(1);
  });
  it("anyone else's line starting there is not attached", () => {
    expect(misattached(drawing({ x: 500, y: 800 }, { aStart: { x: 400, y: 800 } }), "A")).toHaveLength(1);
  });
});
