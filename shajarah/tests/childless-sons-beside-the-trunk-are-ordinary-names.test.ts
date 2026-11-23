// A trunk ancestor's childless son is an ordinary son's name beside the
// trunk, a little smaller than his brothers' who have families. He was an
// ivory medallion set from the trunk's badges: 1.5 times the canopy's names
// in a roundel 3.2 times its type, the largest name off the trunk, larger
// than his brothers with whole families, and in the ivory the key gives the
// line of fathers. On this invented family (the published Al-Kalali trunk
// with invented families and childless sons) the smallest names went from
// 3.78 to 4.39 mm at A1 and from 5.44 to 6.02 mm at A0.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";
import { knownIt } from "./known-failures";

/** The Al-Kalali trunk from its 70th name; nearly every ancestor on it with other sons: families, childless sons, and some with three. */
function crowdedTrunk(): TreeDTO {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  let n = 0;
  const add = (name: string, fatherId: string) => {
    const m: MemberDTO = { ...members[0], id: `t${n++}`, name, laqab: null, gender: "MALE", fatherId, motherId: null, birthOrder: 100 + n };
    members.push(m);
    return m;
  };
  const names = ["سالم", "عوض", "مبارك", "سعيد", "عبيد", "فرج", "حسن", "جمعان", "رمضان", "عقيل", "فضل", "نافع"];
  const family = (fatherId: string, sons: number, grandsons: number) => {
    const s = add(names[n % names.length], fatherId);
    for (let i = 0; i < sons; i++) {
      const g = add(names[(n + i) % names.length], s.id);
      for (let j = 0; j < (i < 2 ? grandsons : 0); j++) add(names[(n + j + 3) % names.length], g.id);
    }
  };
  // (index on the trunk → his other sons: [sons, grandsons] a family, null a childless son)
  const plan: Record<number, ([number, number] | null)[]> = {
    70: [[2, 1]], 72: [null], 73: [[4, 2], null, [2, 0]], 74: [[3, 2]], 75: [[5, 3]],
    76: [[2, 2], null, [3, 1]], 77: [[4, 1]], 78: [null], 79: [[3, 2], [2, 1]], 80: [[2, 1]],
  };
  for (const [i, sons] of Object.entries(plan)) {
    for (const s of sons) {
      if (s) family(members[+i].id, s[0], s[1]);
      else add(names[n % names.length], members[+i].id);
    }
  }
  // the canopy base's own family
  const crown = members[81];
  for (let i = 0; i < 4; i++) family(crown.id, 3, 1);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, marriages: [], trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: false } };
}


describe("childless sons beside the trunk are ordinary names", () => {
  for (const [paper, before] of [["A1", 3.78], ["A0", 5.44]] as const) {
    knownIt(`childless-trunk ${paper}`)(`a crowded trunk, ${paper}`, { timeout: 600_000 }, () => {
      const t = crowdedTrunk();
      const settings = { ...t.settings, theme: { preset: "classic" } } as TreeDTO["settings"];
      const l = computePosterLayout({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), paper));
      expect(l.stubs.length).toBeGreaterThan(0);
      const heads = l.nodes.filter((n) => n.depth === 2 && l.stubs.every((s) => s.id !== n.id) && !l.nodes.some((m) => m.id === n.parentId));
      const head = Math.max(...heads.map((n) => n.fontSize));
      for (const s of l.stubs) {
        expect(s.shape).not.toBe("medallion");
        // a little smaller than a brother with a family, never larger
        expect(s.fontSize).toBeLessThanOrEqual(head * 0.91);
        expect(s.h).toBeLessThan(s.fontSize * 3);
      }
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
      expect(l.legibility.smallestTextMm).toBeGreaterThan(before);
    });
  }
});
