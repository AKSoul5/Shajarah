// A thin line that comes out from under a brother's thick limb at a narrow
// angle, or never comes out, or turns back down inside the limb that brought
// its father, reads as part of that limb. The check of merging lines asked
// for touching and passed over where brothers' lines leave together, so a
// layout with such lines passed (a man with two wives at the canopy base:
// one son's line ran along his brother's limb, another's inside his
// father's). linesAlongside finds them; a thin line parting at a fair angle
// passes. Lines here are drawn by hand.
import { describe, expect, it } from "vitest";
import type { Edge, PosterLayout } from "@/lib/layout/botanical";
import { linesAlongside } from "@/lib/layout/clarity";

const FS = 20;
const line = (parentId: string, childId: string, from: { x: number; y: number }, to: { x: number; y: number }, w0: number, w1: number, n = 24): Edge =>
  ({ parentId, childId, w0, w1, points: Array.from({ length: n + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n })) }) as Edge;
const node = (id: string, x: number, y: number) => ({ id, x, y, w: FS * 3, h: FS * 1.2, fontSize: FS });
const layoutOf = (edges: Edge[], names: ReturnType<typeof node>[]) =>
  ({ edges, nodes: names, stubs: [], spouses: [], base: null }) as unknown as PosterLayout;

// a father at the origin, a son's thick limb straight up 400 units
const father = node("f", 0, 0);
const son = node("s", 0, -400);
const limb = line("f", "s", { x: 0, y: 0 }, { x: 0, y: -400 }, 40, 28);
/** A brother's thin line from the father, parting from the limb at `deg`. */
const brother = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const to = { x: Math.sin(a) * 400, y: -Math.cos(a) * 400 };
  return { edge: line("f", "b", { x: 0, y: 0 }, to, 3, 3), name: node("b", to.x, to.y) };
};

describe("lines running alongside a limb are found", () => {
  it("a thin brother parting at 8 degrees rides along the limb", () => {
    const b = brother(8);
    expect(linesAlongside(layoutOf([limb, b.edge], [father, son, b.name])).map((x) => x.edge)).toEqual([["f", "b"]]);
  });

  it("a thin brother parting at 30 degrees is clear", () => {
    const b = brother(30);
    expect(linesAlongside(layoutOf([limb, b.edge], [father, son, b.name]))).toEqual([]);
  });

  it("a thin line inside the limb its whole way is found", () => {
    const b = { edge: line("f", "b", { x: 0, y: 0 }, { x: 6, y: -300 }, 3, 3), name: node("b", 6, -330) };
    expect(linesAlongside(layoutOf([limb, b.edge], [father, son, b.name])).map((x) => x.edge)).toEqual([["f", "b"]]);
  });

  it("a grandson's line turning back down inside his father's limb is found", () => {
    // (from the son, back down along the limb that brought him)
    const g = { edge: line("s", "g", { x: 0, y: -400 }, { x: 4, y: -120 }, 3, 3), name: node("g", 4, -100) };
    expect(linesAlongside(layoutOf([limb, g.edge], [father, son, g.name])).map((x) => x.edge)).toEqual([["s", "g"]]);
  });

  it("two thin brothers are not judged by it (the merge check covers them)", () => {
    const b = brother(8);
    const thin = line("f", "s", { x: 0, y: 0 }, { x: 0, y: -400 }, 3, 3);
    expect(linesAlongside(layoutOf([thin, b.edge], [father, son, b.name]))).toEqual([]);
  });
});
