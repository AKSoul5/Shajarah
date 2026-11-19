// With wives shown, the canopy base's wife who bore the centred son was set
// towards the middle of her children. When most of them were on one side,
// her box leaned off the trunk's axis, close against her husband's name, and
// the main limb bent through it: on a private 340-person family at A0, 33°
// off, 26 mm left of the axis. She now stands straight above her husband,
// clear of his name, her children's lines fanning out from her to both sides
// and her centred son's rising straight on; the poster stays clean and its
// names no smaller.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { TreeDTO } from "@/lib/types";

/** A founder with two wives; the second bore the centred son, with most of her other children before him (invented names). */
function twoWives(): TreeDTO {
  const b = new Builder("upright", AR);
  const top = b.trunk(5);
  const head = b.person("MALE", { father: top });
  const first = b.person("FEMALE"), second = b.person("FEMALE");
  b.marry(head, first);
  b.marry(head, second);
  let order = 0;
  for (let i = 0; i < 3; i++) b.person("MALE", { father: head, mother: first, order: order++ });
  for (let i = 0; i < 4; i++) b.person("MALE", { father: head, order: order++ });
  for (let i = 0; i < 5; i++) {
    const s = b.person(i % 2 ? "FEMALE" : "MALE", { father: head, mother: second, order: order++ });
    if (i === 2) for (let j = 0; j < 3; j++) b.person("MALE", { father: s, order: j });
  }
  const centred = b.person("MALE", { father: head, mother: second, order: order++ });
  for (let i = 0; i < 4; i++) {
    const g = b.person("MALE", { father: centred, order: i });
    for (let j = 0; j < 3; j++) b.person("MALE", { father: g, order: j });
  }
  for (let i = 0; i < 2; i++) {
    const s = b.person("MALE", { father: head, mother: second, order: order++ });
    for (let j = 0; j < 4; j++) b.person("MALE", { father: s, order: j });
  }
  return { ...b.tree("upright", head), settings: { showFemales: true, theme: { preset: "classic", v: 2, motherNames: true } } } as TreeDTO;
}

describe("the centred son's mother stands upright above her husband", () => {
  for (const paper of ["A1", "A0"] as const) {
    it(`two wives at the canopy base, ${paper}`, { timeout: 300_000 }, () => {
      const tree = twoWives();
      const L = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });
      const base = L.base!;
      const centred = L.nodes.find((n) => n.id === L.centerLine![0])!;
      const mother = L.spouses.find((s) => s.partnerId === base.id && s.childIds.includes(centred.id))!;
      expect(mother).toBeDefined();
      // straight above him, on the trunk's axis, clear of his name
      expect(Math.abs(mother.x - base.x)).toBeLessThan(L.width * 0.002);
      expect(mother.y).toBeLessThan(base.y - base.h / 2 - mother.h / 2);
      // and the centred son above her (within half a percent of the width:
      // the halves' evening-out may set him a hair off the axis)
      expect(Math.abs(centred.x - base.x)).toBeLessThan(L.width * 0.005);
      expect(L.overlaps).toBe(0);
      expect(L.clarity.issues).toEqual([]);
      expect(L.legibility.ok).toBe(true);
    });
  }
});
