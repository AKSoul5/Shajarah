// The trunk stays upright, centred and where it was when spouses are
// added: no spouse, one, two or three wives for the canopy base, a son
// with two wives, a daughter with two husbands (her family shown through
// her), branches of unequal size, small and larger families, Arabic and
// English, and names with long titles and honorifics.
//
// The trunk itself is drawn upright about the page's centre line (its
// outline symmetric, the canopy base and the crown on it, the trunk's names
// in one column): checked for every case. What adding a spouse could move
// is the canopy above it:
// - one wife for the canopy base sent all her sons but the centred one to
//   one side (the rule that keeps a mother's children together forbade
//   every split, all of them being hers): the first generation's middle
//   moved 12.7% of the page's width off the trunk, the medium family's 10%
//   (its names 4.3 mm, against 6.5 mm with the canopy even);
// - a sole wife's box went off to one side of the trunk: the canopy base's
//   own medallion, counted as another name, ruled out every spot above it.
// The tolerance is the engine's own: it moves the fan's middle by up to
// SIDE_SHIFT_MAX (4% of the width) to even the two halves; a move larger
// than that is not balancing. With two or three wives, or a daughter's two
// husbands, each mother's (or father's) children stay together on one side
// of the centred son (half-siblings kept together, so no line crosses the
// centre): which side holds more is then the family's, not the layout's,
// and only the trunk and the limbs leaving it on both sides are checked.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { STRESS_FAMILIES } from "@/lib/qa/stressFamilies";
import { titlesArabic, titlesEnglish, trunkFamily as family } from "@/lib/qa/typographyFamilies";
import type { TreeDTO } from "@/lib/types";

// botanical.ts SIDE_SHIFT_MAX
const SHIFT_TOLERANCE = 0.04;

const daughtersWithFamilies = (t: TreeDTO) =>
  t.members.filter((m) => m.gender === "FEMALE" && m.fatherId && t.members.some((c) => c.motherId === m.id)).map((m) => m.id);

function lay(t: TreeDTO, paper: string, spouses: boolean, through: boolean) {
  const settings = {
    posterSize: paper, showFemales: true, familiesThrough: through ? daughtersWithFamilies(t) : [], theme: { preset: "refined", v: 2, motherNames: spouses },
  } as unknown as TreeDTO["settings"];
  return computePosterLayout({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), paper as never));
}

/** The trunk drawn upright on the page's centre line. */
function expectUpright(l: PosterLayout) {
  const W = l.width, o = l.origin, eps = W * 1e-4;
  expect(Math.abs(o.x - W / 2)).toBeLessThan(eps);
  if (l.base) expect(Math.abs(l.base.x - o.x)).toBeLessThan(eps);
  expect(Math.abs(l.crown.cx - o.x)).toBeLessThan(eps);
  if (!l.trunkZigzag) for (const t of l.trunkLabels) expect(Math.abs(t.x - o.x)).toBeLessThan(eps);
  // the outline mirror-symmetric about the centre line
  const xs = (l.trunkPath.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
  const offs = xs.map((x) => +(x - o.x).toFixed(0));
  for (const d of offs) expect(offs.some((e) => Math.abs(e + d) <= 1)).toBe(true);
}

/** Where the canopy's first generation stands: the middle of the canopy base's children, from the trunk, in page widths. */
function firstGenerationMiddle(l: PosterLayout): number {
  const kids = l.nodes.filter((n) => n.member.fatherId === l.base?.member.id || n.member.motherId === l.base?.member.id);
  return kids.reduce((s, n) => s + n.x - l.origin.x, 0) / (kids.length || 1) / l.width;
}

describe("the trunk with spouses added", () => {
  for (const lang of ["ar", "en"] as const) {
    const before = lay(family("none", lang), "A2", true, false);
    for (const v of ["w1", "w2", "w3", "son2", "dau2"] as const) {
      it(`${lang}: ${v} against no spouse`, { timeout: 120_000 }, () => {
        const after = lay(family(v, lang), "A2", true, v === "dau2");
        expectUpright(before);
        expectUpright(after);
        expect(after.overlaps).toBe(0);
        expect(after.clarity.issues).toEqual([]);
        // the main limbs still leave the canopy base on both sides
        const limbs = after.nodes.filter((n) => n.member.fatherId === after.base?.member.id);
        expect(limbs.some((n) => n.x < after.origin.x) && limbs.some((n) => n.x > after.origin.x)).toBe(true);
        if (v === "w1" || v === "son2") {
          expect(Math.abs(firstGenerationMiddle(after) - firstGenerationMiddle(before))).toBeLessThanOrEqual(SHIFT_TOLERANCE);
        }
        if (v === "w1") {
          // her box, from which all his children grow, on the trunk's line
          expect(Math.abs(after.spouses[0].x - after.origin.x) / after.width).toBeLessThanOrEqual(SHIFT_TOLERANCE);
        }
      });
    }
  }

  // the stress test's families, their spouses' frames off, then on
  for (const [fam, paper] of [["tiny", "A3"], ["small", "A3"], ["spouses", "A2"], ["medium", "A1"]] as const) {
    for (const lang of ["ar", "en"] as const) {
      it(`${fam} (${lang}): spouses' frames shown`, { timeout: 300_000 }, () => {
        const t = STRESS_FAMILIES[fam](lang);
        const off = lay(t, paper, false, false), on = lay(t, paper, true, false);
        expectUpright(off);
        expectUpright(on);
        expect(Math.abs(firstGenerationMiddle(on) - firstGenerationMiddle(off))).toBeLessThanOrEqual(SHIFT_TOLERANCE);
        // (one couple: her box, from which all their children grow, on the trunk's line)
        if (fam === "tiny") expect(Math.abs(on.spouses[0].x - on.origin.x) / on.width).toBeLessThanOrEqual(SHIFT_TOLERANCE);
      });
    }
  }

  // long names with titles and honorifics, their spouses shown
  for (const [name, build] of [["Arabic titles", titlesArabic], ["English titles", titlesEnglish]] as const) {
    it(`${name}: upright, the canopy where it was without spouses`, { timeout: 300_000 }, () => {
      const t = build();
      const off = lay(t, "A1", false, false), on = lay(t, "A1", true, false);
      expectUpright(off);
      expectUpright(on);
      expect(Math.abs(firstGenerationMiddle(on) - firstGenerationMiddle(off))).toBeLessThanOrEqual(SHIFT_TOLERANCE);
    });
  }

  it("the same family lays out the same every time", { timeout: 120_000 }, () => {
    const a = lay(family("w2", "ar"), "A2", true, false), b = lay(family("w2", "ar"), "A2", true, false);
    expect(b.nodes.map((n) => [n.id, n.x, n.y])).toEqual(a.nodes.map((n) => [n.id, n.x, n.y]));
    expect(b.spouses.map((s) => [s.id, s.x, s.y])).toEqual(a.spouses.map((s) => [s.id, s.x, s.y]));
    expect(b.trunkPath).toBe(a.trunkPath);
  });
});
