// Every side branch and stub grows out of its own ancestor's badge on the
// trunk: from under the badge's rounded end, level, at the badge's height,
// across the bark, and turns its way only past the trunk's edge. They once
// started at the bark's edge a little above their badge (a stub up to 1.4
// lines above it, level with the badge above), and a large family's limb
// began wider than a badge, over its neighbours: where several neighbouring
// ancestors had families on one side, which name a branch came from could
// not be told (a family of 340 with a 15-ancestor trunk). Sons of one
// ancestor on one side leave his badge a little apart, in the order their
// lines go. The family here is invented, of the same shape.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

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

const lay = (tree: TreeDTO, preset: string, paper: string): PosterLayout => {
  const settings = { ...tree.settings, theme: { preset } } as TreeDTO["settings"];
  return computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), paper as never));
};

describe("side branches start at their own ancestor's badge", () => {
  const tree = crowdedTrunk();
  for (const [preset, paper] of [["refined", "A1"], ["classic", "A1"], ["refined", "A0"]] as const) {
    it(`${preset}, ${paper}`, { timeout: 600_000 }, () => {
      const l = lay(tree, preset, paper);
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
      const trunkWidth = (l as unknown as { trunkWidth: number }).trunkWidth;
      const badge = new Map(l.trunkLabels.map((t) => [t.member.id, t]));
      const trunkIds = new Set([...badge.keys(), l.base?.member.id]);
      const out = l.edges.filter((e) => badge.has(e.parentId) && !trunkIds.has(e.childId));
      // every ancestor's other sons, each with a line from his badge
      const offshoots = tree.members.filter((m) => m.fatherId && badge.has(m.fatherId) && !trunkIds.has(m.id));
      expect(out.map((e) => e.childId).sort()).toEqual(offshoots.map((m) => m.id).sort());
      const starts: { y: number; w: number; side: number; parent: string }[] = [];
      for (const e of out) {
        const t = badge.get(e.parentId)!;
        const [p0, p1] = e.points;
        // from under its own badge, within the badge's height
        expect(Math.abs(p0.x - t.x)).toBeLessThan(t.w / 2);
        expect(Math.abs(p0.y - t.y) + e.w0 / 2).toBeLessThanOrEqual(t.h / 2 + 1e-6);
        // level across the bark, out past the trunk's edge
        expect(p1.y).toBeCloseTo(p0.y, 6);
        expect(Math.abs(p1.x - l.origin.x)).toBeGreaterThan(trunkWidth / 2);
        // no wider at its start than 0.62 of a badge
        expect(e.w0).toBeLessThanOrEqual(t.h * 0.62 + 1e-6);
        starts.push({ y: p0.y, w: e.w0, side: Math.sign(p1.x - l.origin.x), parent: e.parentId });
      }
      // no two lines start in one place: neighbouring ancestors' spurs,
      // and two sons of one ancestor on one side, are apart
      for (let a = 0; a < starts.length; a++) {
        for (let b = a + 1; b < starts.length; b++) {
          const s = starts[a], r = starts[b];
          if (s.side !== r.side) continue;
          expect(Math.abs(s.y - r.y), `${s.parent} / ${r.parent}`).toBeGreaterThan(s.parent === r.parent ? 0 : (s.w + r.w) / 2);
        }
      }
      // childless sons' medallions clear of one another (two from
      // neighbouring badges once overlapped: the check of names passes over
      // two fixed ones)
      for (let a = 0; a < l.stubs.length; a++) {
        for (let b = a + 1; b < l.stubs.length; b++) {
          const s = l.stubs[a], r = l.stubs[b];
          expect(Math.hypot(s.x - r.x, s.y - r.y), `${s.label} / ${r.label}`).toBeGreaterThan((s.w + r.w) / 2);
        }
      }
      // several consecutive ancestors with families on one side (the case)
      const sides = l.trunkLabels.map((t) => new Set(starts.filter((s) => s.parent === t.member.id).map((s) => s.side)));
      expect(sides.some((s, i) => i > 0 && [...s].some((x) => sides[i - 1].has(x)))).toBe(true);
    });
  }
});
