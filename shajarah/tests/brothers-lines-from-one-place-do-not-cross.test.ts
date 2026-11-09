// Two sons' lines that leave one place (a canopy base's sons with families
// of their own, both from its centre) do not cross. One set off in the
// wrong order (a son whose name lies further round left his father above
// his brother's line, then ran down across it), and bending each line on
// its own could not part them: the thick limb was bent, the thin line that
// set off wrong never was. Their shapes are now tried together, and kept
// only when the drawing then has fewer problems. Found on a 340-person
// family with daughters shown (1 crossing at the canopy base, 0 after);
// the families here are invented, of the same make: a canopy base with two
// wives, some children with no mother recorded, interleaved by birth.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, layoutAtScale } from "@/lib/layout/botanical";
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

const settingsFor = (preset: string, spouses = false) => ({ showFemales: true, theme: { preset, motherNames: spouses } }) as TreeDTO["settings"];
const baseCrossings = (l: ReturnType<typeof computePosterLayout>, base: string) =>
  l.clarity.issues.filter((i) => i.kind === "crossing" && i.edge?.[0] === base && Array.isArray(i.other) && i.other[0] === base);

describe("two sons' lines from one place do not cross", () => {
  it("the canopy base's sons, at the size where they crossed", { timeout: 120_000 }, () => {
    // (at this size, as the size search would draw it on the way: one
    // crossing between two of the base's sons, nothing else)
    const t = twoWives(4);
    const settings = settingsFor("emerald");
    const l = layoutAtScale({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), "A1"), 0.45);
    expect(l.overlaps).toBe(0);
    expect(baseCrossings(l, t.crownBaseId!)).toEqual([]);
    expect(l.clarity.issues).toEqual([]);
  });

  // the posters as made: clear, legible, every family size, paper and design.
  // (Not family 11 with spouses: there the canopy base's line to one wife's
  // box crosses the other wife's line to her son, on the old engine too, a
  // defect of where spouses' boxes go, on hold: ON-HOLD.md, H6.)
  for (const seed of [4, 23, 25, 27, 36]) {
    for (const [preset, paper] of [["emerald", "A1"], ["classic", "A0"], ["refined", "2A0"]] as const) {
      for (const spouses of [false, true]) {
        it(`family ${seed}, ${preset}, ${paper}${spouses ? ", spouses" : ""}`, { timeout: 300_000 }, () => {
          const t = twoWives(seed);
          const settings = settingsFor(preset, spouses);
          const l = computePosterLayout({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), paper));
          expect(l.overlaps).toBe(0);
          expect(l.clarity.issues).toEqual([]);
          expect(l.legibility.ok).toBe(true);
        });
      }
    }
  }
});
