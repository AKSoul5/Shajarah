// A man's wives' boxes each stand on the side of their own children, and
// no line crosses another or runs along a thick limb. With spouses shown,
// a centred son (the one whose branch holds the most people) was set
// between his elder and younger brothers by birth, or moved among them to
// balance the two sides, which could stand him apart from his full
// brothers with his half-brothers between them. His mother's box then had
// lines on both sides of the other wife's fan, and one crossing was
// unavoidable wherever the boxes went (an invented family with two wives at
// the canopy base, children interleaved by birth: "family 11"; one crossing
// at every size, names 3.27 to 5.16 mm). He is now set among his brothers
// where each mother's children stay together; his brothers keep their own
// order. Clean, with names 7.28 to 10.97 mm.
//
// An earlier attempt (placing the two boxes clear of each other's lines,
// fbf20fc) was clean by the check but swung one box far down beside the
// canopy and ran two thin lines along thick limbs. The new measure of lines
// running alongside (linesAlongside) flags both on that layout; it is
// checked here too.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { linesAlongside } from "@/lib/layout/clarity";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

const rng = (s: number) => () => {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
};
/** A canopy base with two wives and children by both or with no mother recorded, interleaved; counts from the seed. */
function twoWives(seed: number): TreeDTO {
  const r = rng(seed * 7919 + 13);
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const crown = members[81];
  let n = 0;
  const names = ["سالم", "عوض", "مبارك", "سعيد", "عبيد", "فرج", "حسن", "جمعان", "رمضان", "عقيل", "فضل", "نافع", "بدر", "طاهر"];
  const fem = ["مريم", "فاطمة", "عائشة", "خديجة", "زينب", "سارة", "نورة"];
  const add = (fatherId: string | null, gender: "MALE" | "FEMALE" = "MALE", motherId: string | null = null) => {
    const list = gender === "MALE" ? names : fem;
    const m: MemberDTO = { ...members[0], id: `r${n}`, name: list[(n * 5 + seed) % list.length], laqab: null, gender, fatherId, motherId, birthOrder: n };
    n++;
    members.push(m);
    return m;
  };
  const w1 = add(null, "FEMALE"), w2 = add(null, "FEMALE");
  const marriages: MarriageDTO[] = [w1, w2].map((w, i) => ({ id: `rm${i}`, spouseAId: crown.id, spouseBId: w.id, startYear: null, endYear: null }));
  const kids = 8 + Math.floor(r() * 12);
  for (let i = 0; i < kids; i++) {
    const x = r();
    const mother = x < 0.5 ? w1.id : x < 0.75 ? null : w2.id;
    const g = r() < 0.3 ? "FEMALE" : "MALE";
    const c = add(crown.id, g, mother);
    if (g === "MALE" && r() < 0.45) {
      const k = 1 + Math.floor(r() * 8);
      for (let j = 0; j < k; j++) add(c.id);
    }
  }
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, marriages, trunkStartId: members[75].id, crownBaseId: crown.id, settings: { showFemales: true } };
}

const lay = (preset: string, paper: string): PosterLayout => {
  const t = twoWives(11);
  const settings = { showFemales: true, theme: { preset, motherNames: true } } as TreeDTO["settings"];
  return computePosterLayout({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), paper as never));
};

describe("a man's wives' boxes stand by their own children", () => {
  // (smallest names before: 5.16, 3.27 and 4.18 mm)
  for (const [preset, paper, before] of [["refined", "2A0", 5.16], ["classic", "A0", 3.27], ["emerald", "A1", 4.18]] as const) {
    it(`family 11, ${preset}, ${paper}, spouses shown`, { timeout: 600_000 }, () => {
      const l = lay(preset, paper);
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
      expect(l.legibility.smallestTextMm).toBeGreaterThan(before);
      expect(linesAlongside(l)).toEqual([]);
      // both wives' boxes, each within its own children's span as seen
      // from the man (a little either side), never among the other's
      const base = l.base!;
      const ang = (p: { x: number; y: number }) => (Math.atan2(base.y - p.y, p.x - base.x) * 180) / Math.PI;
      const pos = new Map(l.nodes.map((n) => [n.id, n]));
      expect(l.spouses.length).toBe(2);
      for (const s of l.spouses) {
        const mine = s.childIds.map((c) => ang(pos.get(c)!));
        const a = ang(s);
        expect(a).toBeGreaterThan(Math.min(...mine) - 15);
        expect(a).toBeLessThan(Math.max(...mine) + 15);
        for (const o of l.spouses) {
          if (o === s) continue;
          const theirs = o.childIds.map((c) => ang(pos.get(c)!));
          // the other wife's children all to one side of this wife's
          const lo = Math.min(...mine), hi = Math.max(...mine);
          expect(theirs.every((t) => t < lo) || theirs.every((t) => t > hi)).toBe(true);
        }
      }
    });
  }
});
