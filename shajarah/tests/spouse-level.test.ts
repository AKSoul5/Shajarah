// A partner's spouses on one arc, as each generation is (botanical.ts,
// after the untangling): a daughter's four husbands, each placed where it
// found room, stood at different depths, one clearly lower than the
// others. They are brought onto one ring of the canopy's fan, each keeping
// its own direction from her, when the poster stays as clear. Nothing about
// the family changes.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { validateRelationships } from "@/lib/layout/clarity";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** A daughter with four husbands (one, one, two and three children by each), in a family of about seventy. */
function fourHusbands() {
  const b = new Builder("lv", AR);
  const top = b.trunk(6);
  const head = b.person("MALE", { father: top });
  const sons = [0, 1, 2, 3].map(() => b.person("MALE", { father: head }));
  for (const s of sons.slice(1)) for (let j = 0; j < 4; j++) {
    const g = b.person(j === 3 ? "FEMALE" : "MALE", { father: s });
    if (j < 2) for (let k = 0; k < 3; k++) b.person("MALE", { father: g });
  }
  const kids: MemberDTO[] = [];
  for (let j = 0; j < 9; j++) kids.push(b.person(j % 3 === 2 ? "FEMALE" : "MALE", { father: sons[0] }));
  const her = kids[2];
  const husbands = ["سامر الأول", "ماهر الثاني", "ناصر الثالث", "باسم الرابع"].map((name) => b.person("MALE", { name }));
  husbands.forEach((h, i) => {
    b.marry(her, h);
    for (let k = 0; k < [1, 1, 2, 3][i]; k++) b.person(k % 2 ? "FEMALE" : "MALE", { father: h, mother: her });
  });
  for (const k of [kids[0], kids[4]]) for (let j = 0; j < 3; j++) b.person("MALE", { father: k });
  const tree = b.tree("شجرة", head);
  tree.settings = { showFemales: true, familiesThrough: [her.id], theme: { preset: "emerald", v: 2, motherNames: true } } as unknown as TreeDTO["settings"];
  return { tree, her, husbands };
}

const depths = (l: PosterLayout, partner: string) =>
  l.spouses.filter((h) => h.partnerId === partner && !h.knot).map((h) => Math.hypot(h.x - l.origin.x, h.y - l.origin.y));
const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

describe("a partner's spouses on one arc", () => {
  it("a daughter's four husbands, one set lower than the rest, are brought onto one ring; the poster stays clean", () => {
    const { tree, her, husbands } = fourHusbands();
    const before = JSON.stringify(tree.members.map((m) => [m.id, m.fatherId, m.motherId]));
    for (const paper of ["A1", "A0"] as const) {
      const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true };
      const each = computePosterLayout(tree, { ...opts, levelSpouses: false });
      const level = computePosterLayout(tree, opts);
      // (left where each found room: well over a name's height apart)
      expect(spread(depths(each, her.id)), paper).toBeGreaterThan(each.spouses[0].fontSize * 2);
      // on one ring (what is left is the fan's own curve between them)
      expect(spread(depths(level, her.id)), paper).toBeLessThan(spread(depths(each, her.id)) / 3);
      expect(level.clarity.ok && level.overlaps === 0, paper).toBe(true);
      expect(validateRelationships(level, tree).issues, paper).toEqual([]);
      // every husband is still drawn as hers, with exactly his own children
      for (const h of husbands) {
        const frame = level.spouses.find((s) => s.partnerId === her.id && s.member.id === h.id)!;
        expect(frame, h.name).toBeDefined();
        expect(new Set(frame.childIds)).toEqual(new Set(tree.members.filter((m) => m.fatherId === h.id).map((m) => m.id)));
      }
    }
    expect(JSON.stringify(tree.members.map((m) => [m.id, m.fatherId, m.motherId]))).toBe(before);
  }, 600_000);
});
