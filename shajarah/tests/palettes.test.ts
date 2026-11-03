// Every design's colours read at print size: text at least 4.5:1 against
// what it sits on, lines, rims and swatches at least 3:1 against the paper
// (WCAG 1.4.3 and 1.4.11), for each preset as it comes and for colours
// someone might choose for it.
import { describe, expect, it } from "vitest";
import { contrast, paletteOf, PRESET_PALETTES, resolveTheme, rimOn, textOn, THEME_PRESETS } from "@/lib/theme";
import type { ThemePreset } from "@/lib/types";

const presets = Object.keys(THEME_PRESETS) as ThemePreset[];

describe("each design's palette, at print size", () => {
  for (const preset of presets) {
    it(`${THEME_PRESETS[preset].label}: text 4.5:1, lines and rims 3:1`, () => {
      const theme = resolveTheme({ theme: { preset } } as never);
      const p = paletteOf(theme);
      const text = { ink: p.ink, inkSoft: p.inkSoft, muted: p.muted, footerInk: p.footerInk, creditInk: p.creditInk, figure: p.figure, edition: p.edition };
      for (const [k, c] of Object.entries(text)) expect(contrast(c, p.paper), `${k} on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.ink, p.ivory), "ink on ivory").toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.figure, p.ivory), "footer figures on their cards").toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.spouseInk, p.spouseFill), "spouse names").toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.ink, p.spouseFill), "spouse names (manuscript)").toBeGreaterThanOrEqual(4.5);
      const lines = { rule: p.rule, ornament: p.ornament, spouseRim: p.spouseRim, branch: theme.branch, ancestor: theme.ancestor, titleLo: p.titleLo };
      for (const [k, c] of Object.entries(lines)) expect(contrast(c, p.paper), `${k} on paper`).toBeGreaterThanOrEqual(3);
      if (!p.inkOnly) p.lineage.forEach((c, i) => expect(contrast(c, p.paper), `lineage ${i}`).toBeGreaterThanOrEqual(3));
      // names: their text on their fill, their rim on the paper
      for (const fill of [theme.male, theme.female]) {
        expect(contrast(textOn(fill), fill), `text on ${fill}`).toBeGreaterThanOrEqual(4.5);
        if (!p.inkOnly) expect(contrast(rimOn(fill, p.paper), p.paper), `rim of ${fill}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
  it("the four lineage colours of each design stay apart from one another", () => {
    const dist = (a: string, b: string) => {
      const h = (x: string) => [1, 3, 5].map((i) => Number.parseInt(x.slice(i, i + 2), 16));
      const [p, q] = [h(a), h(b)];
      return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    };
    for (const preset of presets) {
      // (the first four, as every poster had them; all eight are checked,
      // perceptually, in branch-colours.test.ts)
      const ls = PRESET_PALETTES[preset].lineage.slice(0, 4);
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) expect(dist(ls[i], ls[j]), `${preset} ${i}/${j}`).toBeGreaterThan(40);
    }
  });
  it("colours someone picks still read: names get a readable ink and a rim that stands off the paper", () => {
    const picks = ["#fff3a0", "#e8e8e8", "#f2c4d0", "#c0c0c0", "#808080", "#3d6fb0", "#ffd700", "#7fbf7f", "#ff8c00", "#000000", "#ffffff"];
    for (const preset of presets) {
      const p = paletteOf(resolveTheme({ theme: { preset } } as never));
      for (const fill of picks) {
        expect(contrast(textOn(fill), fill), `${preset} text on ${fill}`).toBeGreaterThanOrEqual(4.5);
        if (fill !== "#ffffff" || !p.inkOnly) expect(contrast(rimOn(fill, p.paper), p.paper), `${preset} rim of ${fill}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("saved posters and the redesigned presets", () => {
  // a poster saved before the redesign stored its preset's every value
  const oldRefined = { preset: "refined", colorBy: "gender", male: "#c9cbc7", female: "#dcbc6a", ancestor: "#b08a2e", branch: "#6e5538", background: "parchment", metallic: true, nodeRim: "#8d8f8a", motherNames: true, verse: true } as const;
  it("an untouched preset takes its redesign; content settings stay", () => {
    const t = resolveTheme({ theme: oldRefined } as never);
    expect(t.male).toBe(THEME_PRESETS.refined.male);
    expect(t.branch).toBe(THEME_PRESETS.refined.branch);
    expect(t.motherNames).toBe(true);
    expect(t.verse).toBe(true);
  });
  it("a colour its owner changed stays, beside the redesign of the rest", () => {
    const t = resolveTheme({ theme: { ...oldRefined, female: "#ff8899" } } as never);
    expect(t.female).toBe("#ff8899");
    expect(t.male).toBe(THEME_PRESETS.refined.male);
  });
  it("white paper saved before the ink-only setting still means black ink only", () => {
    const t = resolveTheme({ theme: { ...oldRefined, background: "white" } } as never);
    expect(paletteOf(t).inkOnly).toBe(true);
    // (and the minimal design is ink only on its own)
    expect(paletteOf(resolveTheme({ theme: { preset: "mono" } } as never)).inkOnly).toBe(true);
  });
  it("saved from now on: only what differs from the preset, so later refinements arrive", async () => {
    const { compactTheme, resetDesign } = await import("@/lib/theme");
    const t = resolveTheme({ theme: { ...oldRefined, female: "#ff8899" } } as never);
    const saved = compactTheme(t);
    expect(saved.v).toBe(2);
    expect(saved.female).toBe("#ff8899");
    expect(saved.male).toBeUndefined();
    expect(resolveTheme({ theme: saved } as never)).toEqual(t);
    // reset: the preset's design again, the content settings kept
    const r = resetDesign(t);
    expect(r.female).toBe(THEME_PRESETS.refined.female);
    expect(r.motherNames).toBe(true);
  });
});
