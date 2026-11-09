// A man's line to one wife's box does not cross his other wife's line to
// her son. Both boxes are placed in one pass, and each was checked only
// against the lines drawn the time before, where the other box had been:
// the second box's place was found clear of a line that then moved.
// Each box is now also checked against the lines of the boxes placed with it,
// as they will be drawn. Found on an invented family with two wives at the
// canopy base and children interleaved by birth ("family 11"). There the
// refined design on 2A0 had one crossing at every size (the poster came out
// at 5.16 mm with the crossing); it is now clean at 4.13 mm. The classic
// design on A0 still has one crossing, of another kind: its names went from
// 3.27 to 4.82 mm, and that case is kept as an expected failure below.
//
// NOT READY (render inspected at print scale): the clean refined 2A0 poster
// is worse to read than the old one. One wife's box swings far down and
// left of the canopy base, her limb runs out sideways along the canopy's
// lower edge, and two thin lines run alongside thick limbs (to طاهر beside
// the gold limb, to نافع inside the green one), which the check does not
// catch. The first test below must not be taken as proof of a good poster.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
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
/** Crossings between two lines that both run to or from a spouse's box. */
const boxCrossings = (l: PosterLayout) =>
  l.clarity.issues.filter(
    (i) => i.kind === "crossing" && [i.edge, i.other].every((e) => Array.isArray(e) && e.some((id) => String(id).startsWith("spouse:"))),
  );

describe("spouses' box lines do not cross each other", () => {
  it("family 11, refined, 2A0, spouses shown: clean", { timeout: 600_000 }, () => {
    const l = lay("refined", "2A0");
    expect(boxCrossings(l)).toEqual([]);
    expect(l.overlaps).toBe(0);
    expect(l.clarity.issues).toEqual([]);
    expect(l.legibility.ok).toBe(true);
    // both wives' boxes drawn, each with her own children's lines
    const boxes = new Set(l.edges.map((e) => e.parentId).filter((id) => id.startsWith("spouse:")));
    expect(boxes.size).toBe(2);
  });

  // Not yet fixed: on classic A0 the man's line to his first wife's box
  // still crosses his second wife's line to her son, away from any name.
  // Unresolved, reported in AUTONOMOUS-PROGRESS.md; when it is fixed this
  // expected failure fails and must become an ordinary test.
  it.fails("family 11, classic, A0, spouses shown: clean (known defect)", { timeout: 600_000 }, () => {
    const l = lay("classic", "A0");
    expect(l.overlaps).toBe(0);
    expect(l.clarity.issues).toEqual([]);
  });
});
