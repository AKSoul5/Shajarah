import { describe, expect, it } from "vitest";
import { contrast, lineageColor, paletteOf, resolveTheme, THEME_PRESETS } from "@/lib/theme";
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

/** CIELAB (D65) distance between two colours (ΔE 1976). */
function labDistance(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const xyz = [
      (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047,
      0.2126 * r + 0.7152 * g + 0.0722 * bl,
      (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883,
    ].map((t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116));
    return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe("branch colours", () => {
  for (const [preset, before] of Object.entries(BEFORE)) {
    const pal = paletteOf(resolveTheme({ theme: { preset } } as never));
    it(`${preset}: eight colours, the first four as before, every one a line on its paper`, () => {
      expect(pal.lineage).toHaveLength(8);
      expect(pal.lineage.slice(0, 4)).toEqual(before);
      expect(new Set(pal.lineage).size).toBe(8);
      for (const c of pal.lineage) expect(contrast(c, pal.paper), c).toBeGreaterThanOrEqual(3);
    });
    it(`${preset}: all eight told apart (CIELAB distance at least 15)`, () => {
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        expect(labDistance(pal.lineage[i], pal.lineage[j]), `${pal.lineage[i]} / ${pal.lineage[j]}`).toBeGreaterThanOrEqual(15);
      }
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

  it("Modern Archive stays plain black lines, its branches unmarked by default", () => {
    expect(THEME_PRESETS.mono.branchColors).toBe(false);
  });
});
