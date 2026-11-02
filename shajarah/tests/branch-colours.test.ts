import { describe, expect, it } from "vitest";
import { contrast, LINEAGE_PATTERNS, lineageColor, paletteOf, resolveTheme, THEME_PRESETS } from "@/lib/theme";
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
    it(`${preset}: eight colours, the first four as before, every one a line on its paper`, () => {
      expect(pal.lineage).toHaveLength(8);
      expect(pal.lineage.slice(0, 4)).toEqual(before);
      expect(new Set(pal.lineage).size).toBe(8);
      for (const c of pal.lineage) expect(contrast(c, pal.paper), c).toBeGreaterThanOrEqual(3);
    });
    it(`${preset}: six distinct by default, the seventh and eighth only with that many branches`, () => {
      const at = (i: number, count: number) => lineageColor(i, "bark", pal.lineage, count);
      // a poster of four branches: as before
      expect([0, 1, 2, 3].map((i) => at(i, 4))).toEqual(before);
      // six branches, six colours
      expect(new Set([0, 1, 2, 3, 4, 5].map((i) => at(i, 6))).size).toBe(6);
      // seven: the seventh colour, nothing repeated; eight: all eight
      expect(new Set([0, 1, 2, 3, 4, 5, 6].map((i) => at(i, 7))).size).toBe(7);
      expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map((i) => at(i, 8))).size).toBe(8);
      // more than eight: round again from the first
      expect(at(8, 10)).toBe(pal.lineage[0]);
      expect(lineageColor(null, "bark", pal.lineage, 5)).toBe("bark");
    });
  }

  it("Modern Archive marks each main branch with a line pattern, by default, never pure dots", () => {
    expect(THEME_PRESETS.mono.branchColors).toBe(true);
    expect(LINEAGE_PATTERNS[0]).toBeNull();
    const seen = new Set<string>();
    for (const p of LINEAGE_PATTERNS.slice(1)) {
      // (pure dots: every dash as short as a dot; those mark daughters' families)
      expect(p!.filter((_, i) => i % 2 === 0).some((dash) => dash >= 1.5)).toBe(true);
      seen.add(p!.join(","));
    }
    expect(seen.size).toBe(LINEAGE_PATTERNS.length - 1);
  });
});
