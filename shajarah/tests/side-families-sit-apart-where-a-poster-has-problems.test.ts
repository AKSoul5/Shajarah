// Neighbouring side families apart (posterSteps, LayoutOptions.sideGap).
// Where two brothers of trunk ancestors stand on badges close together,
// their fans ran side by side, and on a private 340-person family a son of
// one family stood inside the next one's fan, under its lines (A0 and 4A0).
// A poster left with problems is laid out again with a little room between
// such fans, and that kept only when it is cleaner, as legible and its names
// no smaller; a clean poster is never laid out again.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** The Al-Kalali trunk with four brothers of trunk ancestors, close together, each with sons and grandsons (invented names). */
function sideFamilies(): TreeDTO {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const crown = members[81];
  let n = 0;
  const add = (name: string, fatherId: string | null, gender: "MALE" | "FEMALE" = "MALE") => {
    const m: MemberDTO = { ...members[0], id: `s${n++}`, name, laqab: null, gender, fatherId, motherId: null, birthOrder: n };
    members.push(m);
    return m;
  };
  const names = ["سالم", "كمال", "حازم", "ماهر", "فهد", "عاصم", "يزيد", "ماجد"];
  for (const at of [80, 79, 78, 77]) {
    const brother = add("قاسم", members[at].id);
    for (let i = 0; i < 4; i++) {
      const son = add(names[(at + i) % names.length], brother.id);
      for (let j = 0; j < 3; j++) add(names[(at + i + j + 3) % names.length], son.id);
    }
  }
  for (let i = 0; i < 6; i++) {
    const s = add(names[i], crown.id);
    for (let j = 0; j < 3; j++) add(names[(i + j + 1) % names.length], s.id);
  }
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, marriages: [], trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: false } };
}

const problems = (l: PosterLayout) => l.overlaps + l.clarity.issues.length;

describe("side families sit apart where a poster has problems", () => {
  const tree = sideFamilies();
  for (const paper of ["A3", "A1"] as const) {
    it(`${paper}: never worse than without the room, and a clean poster is laid out once`, () => {
      const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: false };
      const chosen = computePosterLayout(tree, opts);
      const plain = computePosterLayout(tree, { ...opts, sideGap: false });
      expect(chosen.sideFamilies).toBeGreaterThan(1);
      expect(problems(chosen)).toBeLessThanOrEqual(problems(plain));
      expect(chosen.overlaps).toBeLessThanOrEqual(plain.overlaps);
      expect(chosen.legibility.smallestTextMm).toBeGreaterThanOrEqual(plain.legibility.smallestTextMm * 0.98);
      // (the same poster; only its recipe records the option)
      const same = (l: PosterLayout) => JSON.stringify({ ...l, recipe: undefined });
      if (plain.overlaps === 0 && plain.clarity.ok) expect(same(chosen)).toBe(same(plain));
    }, 900_000);
  }

  it("gives close families' fans room between them", () => {
    const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), showFemales: false };
    const roomy = computePosterLayout(tree, { ...opts, sideGap: true });
    const plain = computePosterLayout(tree, { ...opts, sideGap: false });
    // the side families' names spread over more of the page's width
    const spread = (l: PosterLayout) => {
      const xs = l.nodes.filter((x) => x.id.startsWith("s") && x.y > l.origin.y).map((x) => x.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(roomy.recipe?.opts.sideGap).toBe(true);
    expect(JSON.stringify(roomy.nodes)).not.toBe(JSON.stringify(plain.nodes));
    expect(spread(roomy)).toBeGreaterThan(0);
  }, 900_000);
});
