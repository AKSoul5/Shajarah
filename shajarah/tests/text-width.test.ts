// A name is measured as the bundled Amiri draws it (src/lib/layout/textMetrics.ts).
// The true widths of 1,226 names of the test families (Arabic and English,
// titles, honorifics, vowel marks, mixed scripts) were measured in Chromium
// with the bundled fonts (scripts/font-metrics.mjs → tests/fixtures/name-widths.json).
// The old measure, a count of characters (0.46 em an Arabic letter, 0.52 a
// Latin one), was off by -67% to +57%: names drawn wider than their boxes,
// boxes far wider than their names.
import { describe, expect, it } from "vitest";
import TRUE_WIDTHS from "./fixtures/name-widths.json";
import { textEms } from "@/lib/layout/textMetrics";
import { textWidth } from "@/lib/layout/botanical";

const truth = Object.entries(TRUE_WIDTHS as Record<string, number>);
const oldMeasure = (t: string) => { let w = 0; for (const ch of t) w += /[؀-ۿ]/.test(ch) ? 0.46 : ch === " " ? 0.28 : 0.52; return w; };

describe("names measured as the font draws them", () => {
  it("within 3% for nine names in ten, and never more than 8% too narrow", () => {
    const errors = truth.map(([name, w]) => ({ name, e: (textEms(name) - w) / w }));
    const within3 = errors.filter((x) => Math.abs(x.e) <= 0.03).length / errors.length;
    const narrowest = errors.reduce((a, b) => (b.e < a.e ? b : a));
    expect(within3, "share within 3%").toBeGreaterThanOrEqual(0.9);
    expect(narrowest.e, `most underestimated: ${narrowest.name}`).toBeGreaterThan(-0.08);
  });
  it("far closer than the old count of characters", () => {
    const mean = (f: (t: string) => number) => truth.reduce((a, [n, w]) => a + Math.abs(f(n) - w) / w, 0) / truth.length;
    expect(mean(textEms)).toBeLessThan(mean(oldMeasure) / 3);
  });
  it("vowel marks take no room; lam-alef is one ligature; joined letters are narrower than alone", () => {
    expect(textEms("مُحَمَّد")).toBeCloseTo(textEms("محمد"), 5);
    expect(textEms("لا")).toBeLessThan(textEms("ل") + textEms("ا"));
    expect(textEms("بب")).toBeLessThan(2 * textEms("ب"));
  });
  it("wide capitals and long titles are not measured narrower than drawn", () => {
    for (const n of ["WILLIAM", "صاحب السمو الملكي الأمير عبدالعزيز بن فيصل آل سعود", "His Excellency Ahmed bin Mohammed Al-Fulan"]) {
      const w = (TRUE_WIDTHS as Record<string, number>)[n];
      if (w) expect(textEms(n)).toBeGreaterThan(w * 0.97);
    }
  });
  it("a box is still at least 1.2 font sizes wide", () => {
    expect(textWidth("ا", 10)).toBe(12);
  });
});
