// A daughter whose family is shown through her (on dotted lines) never
// heads a branch: her children carry their father's family name, not this
// one. Shown on the first ring she had a son's treatment: a large round
// medallion, a lineage colour of her own, and the heaviest limb of all,
// counting everyone on her dotted lines (on a private 340-person family two
// daughters of the canopy base stood as medallions beside their brothers,
// and a granddaughter's limb was the widest of her mother's children's,
// ending in faint dots). Now she is a name like her sisters, in her
// father's colour, on a limb that carries one person.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { TreeDTO } from "@/lib/types";

/** A founder with two sons with families, a childless daughter, and a daughter with two husbands and children by each (invented names). */
function family(): { tree: TreeDTO; daughter: string; sister: string; son: string } {
  const b = new Builder("daughter", AR);
  const top = b.trunk(4);
  const head = b.person("MALE", { father: top });
  const sons = [0, 1].map((i) => b.person("MALE", { father: head, order: i }));
  for (const s of sons) for (let j = 0; j < 3; j++) b.person("MALE", { father: s, order: j });
  const sister = b.person("FEMALE", { father: head, order: 2 });
  const daughter = b.person("FEMALE", { father: head, order: 3 });
  for (let h = 0; h < 2; h++) {
    const husband = b.person("MALE");
    b.marry(daughter, husband);
    for (let j = 0; j < 3; j++) {
      const c = b.person(j % 2 ? "FEMALE" : "MALE", { father: husband, mother: daughter, order: h * 3 + j });
      if (j === 0) for (let k = 0; k < 2; k++) b.person("MALE", { father: c, order: k });
    }
  }
  const tree = { ...b.tree("شجرة", head), settings: { showFemales: true, familiesThrough: [daughter.id], theme: { preset: "classic", v: 2 } } } as unknown as TreeDTO;
  return { tree, daughter: daughter.id, sister: sister.id, son: sons[0].id };
}

const limbOf = (l: PosterLayout, id: string) => l.edges.find((e) => e.childId === id)!;

describe("a daughter never heads a branch", () => {
  const { tree, daughter, sister, son } = family();
  for (const paper of ["A2", "A0"] as const) {
    it(`${paper}: no medallion, no colour of her own, a limb for one person`, () => {
      const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });
      const her = l.nodes.find((n) => n.id === daughter)!, brother = l.nodes.find((n) => n.id === son)!;
      // (her family is drawn, through her)
      expect(l.nodes.filter((n) => n.parentId === daughter || l.spouses.some((s) => s.partnerId === daughter && s.childIds.includes(n.id))).length).toBeGreaterThan(0);
      expect(brother.shape).toBe("medallion");
      expect(her.shape).not.toBe("medallion");
      expect(brother.lineage).not.toBeNull();
      expect(her.lineage ?? null).toBeNull();
      // her limb carries one person, as her childless sister's (with the
      // first ring's 1.15 for a name with children), lighter than her brother's
      expect(limbOf(l, daughter).w0).toBeLessThanOrEqual(limbOf(l, sister).w0 * 1.15 + 1e-6);
      expect(limbOf(l, daughter).w0).toBeLessThan(limbOf(l, son).w0);
    }, 300_000);
  }
});
