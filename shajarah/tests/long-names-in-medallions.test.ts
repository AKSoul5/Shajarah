// A long name with its titles in a round medallion is set on two lines
// (split at the space nearest its middle) when that makes the medallion at
// least a tenth smaller: on one line the disc grew with the name, three
// times its brothers' («عبد الملك الملقب بالأمين», 132 against 40), their
// lines ran under it and the poster fell below the legible size
// (layout QA, C_all_silver-gold_A1: 3.20 mm -> 2.95 mm). Short names stay on
// one line; each line fits inside its circle; Arabic and English, every
// design.
import { describe, expect, it } from "vitest";
import { computePosterLayout, MEDALLION_LINE, textWidth, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { titlesArabic, titlesEnglish } from "@/lib/qa/typographyFamilies";
import type { TreeDTO } from "@/lib/types";

function lay(base: TreeDTO, preset: string): PosterLayout {
  const settings = { posterSize: "A1", showFemales: true, theme: { preset, v: 2 } } as unknown as TreeDTO["settings"];
  return computePosterLayout({ ...base, settings }, layoutOptionsFor(resolveTheme(settings), "A1"));
}

describe("long names in round medallions", () => {
  for (const [lang, build] of [["Arabic", titlesArabic], ["English", titlesEnglish]] as const) {
    for (const preset of Object.keys(THEME_PRESETS)) {
      it(`${lang}, ${preset}: long names on two lines, inside their circles`, { timeout: 120_000 }, () => {
        const l = lay(build(), preset);
        expect(l.overlaps).toBe(0);
        expect(l.clarity.issues).toEqual([]);
        expect(l.legibility.ok).toBe(true);
        const meds = l.nodes.filter((n) => n.shape === "medallion");
        expect(meds.length).toBeGreaterThan(0);
        for (const n of meds) {
          const fs = n.fontSize;
          const oneLine = Math.max(fs * 2.7, textWidth(n.label, fs) + fs * 0.9);
          if (n.labelLines) {
            // the name, whole, in its two lines; the disc at least a tenth smaller
            expect(n.labelLines.join(" ")).toBe(n.label);
            expect(n.w).toBeLessThanOrEqual(oneLine * 0.9 + 1e-6);
            // each line inside the circle at its own height (the chord there)
            const r = n.w / 2;
            n.labelLines.forEach((line, i) => {
              const y = Math.abs((i - 0.5) * fs * MEDALLION_LINE) + fs * 0.5;
              const chord = 2 * Math.sqrt(Math.max(0, r * r - y * y));
              expect(textWidth(line, fs), `${n.label}: line ${i + 1} wider than its circle`).toBeLessThanOrEqual(chord);
            });
          } else if (!n.subLabel) {
            // one line: the circle as before
            expect(n.w).toBeCloseTo(oneLine, 6);
          }
        }
        // the long titles do go on two lines; a short name never does
        expect(meds.some((n) => n.labelLines)).toBe(true);
        for (const n of meds) if (textWidth(n.label, n.fontSize) + n.fontSize * 0.9 <= n.fontSize * 2.7) expect(n.labelLines).toBeUndefined();
      });
    }
  }
});
