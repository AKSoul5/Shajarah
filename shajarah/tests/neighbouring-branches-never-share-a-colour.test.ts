// Each main branch's colour came from its place in a list, the ninth
// branch taking the first colour again, and the trunk's side families
// numbered after the canopy's branches whatever stood beside them: two
// branches side by side could share a colour, and a poster of many branches
// had few colours. Each design now has sixteen (its eight and a shade of
// each) and every branch takes the least used colour that stands clearly
// apart (CIELAB ΔE ≥ 20) from the branches beside it, round the tree from
// the left side's families over the canopy to the right side's (owner,
// 22 Nov 2026: "neighbouring branch heads must never share a colour, and
// must be visibly distinct"; the same every time, for any size of family).
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { contrast, labDistance, layoutOptionsFor, lineageColours, NEIGHBOUR_DE, paletteOf, PRESET_PALETTES, resolveTheme } from "@/lib/theme";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { ThemePreset, TreeDTO } from "@/lib/types";

const COLOURED = (Object.keys(PRESET_PALETTES) as ThemePreset[]).filter((p) => p !== "mono");

describe("neighbouring branches never share a colour", () => {
  it("in a row of any length, in every design, neighbours stand clearly apart", () => {
    for (const preset of COLOURED) {
      const pal = PRESET_PALETTES[preset];
      for (let count = 2; count <= 60; count++) {
        const c = lineageColours(pal.lineage, count);
        for (let i = 1; i < count; i++) expect(labDistance(c[i - 1], c[i]), `${preset} ${count}: ${i - 1}/${i}`).toBeGreaterThanOrEqual(NEIGHBOUR_DE);
        // and the next but one apart too, where there are colours enough
        if (count <= 16) for (let i = 2; i < count; i++) expect(c[i], `${preset} ${count}: ${i - 2}/${i}`).not.toBe(c[i - 2]);
      }
    }
  });

  it("up to sixteen branches, every one its own colour", () => {
    for (const preset of COLOURED) {
      for (let count = 1; count <= 16; count++) expect(new Set(lineageColours(PRESET_PALETTES[preset].lineage, count)).size, `${preset} ${count}`).toBe(count);
    }
  });

  it("with neighbours in any arrangement, never a neighbour's colour", () => {
    // (a ring and its chords, as branches round a tree with side families at its ends)
    for (const preset of COLOURED) {
      const pal = PRESET_PALETTES[preset];
      for (let count = 3; count <= 40; count += 3) {
        const pairs: [number, number][] = [];
        for (let i = 0; i < count; i++) pairs.push([i, (i + 1) % count]);
        for (let i = 0; i + 3 < count; i += 4) pairs.push([i, i + 3]);
        const c = lineageColours(pal.lineage, count, pairs);
        for (const [a, b] of pairs) expect(labDistance(c[a], c[b]), `${preset} ${count}: ${a}/${b}`).toBeGreaterThanOrEqual(NEIGHBOUR_DE);
      }
    }
  });

  it("the same colours every time", () => {
    for (const preset of COLOURED) {
      const pal = PRESET_PALETTES[preset];
      expect(lineageColours(pal.lineage, 37)).toEqual(lineageColours(pal.lineage, 37));
    }
  });

  it("every colour a line on its paper, every design", () => {
    for (const preset of COLOURED) {
      const pal = PRESET_PALETTES[preset];
      for (const c of pal.lineage) expect(contrast(c, pal.paper), `${preset} ${c}`).toBeGreaterThanOrEqual(3);
    }
  });

  for (const [fixture, lang] of [["C", "Arabic"], ["C-en", "English"]] as const) {
    it(`on a real poster (${lang}), every pair of branches side by side apart, side families included`, () => {
      const tree = QA_FIXTURES[fixture]();
      for (const preset of ["classic", "silver-gold"] as const) {
        const settings = { showFemales: true, theme: { preset, v: 2, motherNames: true } } as unknown as TreeDTO["settings"];
        const theme = resolveTheme(settings);
        const l = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(theme, "A1"), showFemales: true });
        const count = 1 + l.nodes.reduce((m, n) => Math.max(m, n.lineage ?? -1), -1);
        expect(count, "branches on the poster").toBeGreaterThan(3);
        const pairs = l.lineageNeighbours ?? [];
        expect(pairs.length).toBe(count - 1);
        const c = lineageColours(paletteOf(theme).lineage, count, pairs);
        for (const [a, b] of pairs) expect(labDistance(c[a], c[b]), `${preset}: ${a}/${b}`).toBeGreaterThanOrEqual(NEIGHBOUR_DE);
      }
    }, 600_000);
  }
});
