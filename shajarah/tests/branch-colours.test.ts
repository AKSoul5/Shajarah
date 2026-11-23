import { describe, expect, it } from "vitest";
import { contrast, labDistance, lineageColours, paletteOf, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { ThemePreset } from "@/lib/types";

// Each design's branch colours before there were eight (1.0.46 and earlier):
// a poster's first four main branches keep exactly these.
const BEFORE: Partial<Record<ThemePreset, string[]>> = {
  refined: ["#5a6a5c", "#8a6a2e", "#7a4a52", "#3f5a7e"],
  luxe: ["#86601d", "#4f4a2a", "#7a3e34", "#3f4f5c"],
  heritage: ["#6b3e26", "#4b5a3a", "#3e4e63", "#80691f"],
  "silver-gold": ["#3f5f86", "#836a33", "#4f6f55", "#7a4f6a"],
  classic: ["#2a5f5a", "#8c6b23", "#6d4c66", "#4a6380"],
  emerald: ["#236347", "#856522", "#2f5e73", "#6e4a5c"],
};

describe("branch colours", () => {
  for (const [preset, before] of Object.entries(BEFORE)) {
    const pal = paletteOf(resolveTheme({ theme: { preset } } as never));
    // (sixteen since 1.0.61: the eight and a shade of each, owner's request
    // of 22 Nov 2026; the first four of a poster still as before)
    it(`${preset}: sixteen colours, the first four as before, every one a line on its paper`, () => {
      expect(pal.lineage).toHaveLength(16);
      expect(pal.lineage.slice(0, 4)).toEqual(before);
      expect(new Set(pal.lineage).size).toBe(16);
      for (const c of pal.lineage) expect(contrast(c, pal.paper), c).toBeGreaterThanOrEqual(3);
    });
    it(`${preset}: the first eight told apart (CIELAB distance at least 15), each shade near its own colour`, () => {
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        expect(labDistance(pal.lineage[i], pal.lineage[j]), `${pal.lineage[i]} / ${pal.lineage[j]}`).toBeGreaterThanOrEqual(15);
      }
      // (a shade of the same family: closer to its own colour than to any other of the eight)
      for (let i = 0; i < 8; i++) {
        const own = labDistance(pal.lineage[8 + i], pal.lineage[i]);
        for (let j = 0; j < 8; j++) if (j !== i) expect(own, `shade ${pal.lineage[8 + i]}`).toBeLessThan(labDistance(pal.lineage[8 + i], pal.lineage[j]) + 1e-9);
      }
    });
    it(`${preset}: a poster of up to eight branches in a row keeps its colours as before, in order`, () => {
      for (let count = 1; count <= 8; count++) expect(lineageColours(pal.lineage, count)).toEqual(pal.lineage.slice(0, count));
    });
  }

  it("Modern Archive stays plain black lines, its branches unmarked by default", () => {
    expect(THEME_PRESETS.mono.branchColors).toBe(false);
  });
});
