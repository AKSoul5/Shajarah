// The poster's title, measured as its font draws it (titleEms: Aref Ruqaa in
// bold or Noto Kufi Arabic, their Arabic; Latin in Amiri, the fallback, at
// the title's weight), against true widths measured in Chromium
// (scripts/font-metrics.mjs titles.json tests/fixtures/title-widths.json titles).
// Estimated before as the names' width times 1.1 (Ruqaa) or 1.45 (Kufi), an
// English title was measured up to 35% short, and its cartouche, sized on
// that, held only part of it; the title was also sized so that the text
// alone filled the room, leaving its ground no margin: a long title ran to
// the cartouche's tips and past them.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { titleEms } from "@/lib/layout/textMetrics";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, paletteOf, resolveTheme } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import { sisterCase } from "@/lib/qa/typographyFamilies";
import type { TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const TRUE = JSON.parse(readFileSync("tests/fixtures/title-widths.json", "utf8")) as Record<string, { ruqaa: number; kufi: number }>;

describe("title widths", () => {
  for (const font of ["ruqaa", "kufi"] as const) {
    it(`${font}: every title within 6% of its drawn width, most within 3%`, () => {
      const errs = Object.entries(TRUE).map(([t, w]) => titleEms(t, font) / w[font] - 1);
      // (never more than the allowance the poster adds, TITLE_EM_SAFE, short)
      expect(Math.min(...errs)).toBeGreaterThan(-0.055);
      expect(Math.max(...errs)).toBeLessThan(0.06);
      expect(errs.filter((e) => Math.abs(e) <= 0.03).length / errs.length).toBeGreaterThan(0.9);
    });
  }
});

/** The x extent of an SVG path made of M, L, Q, C, H, V and Z commands (absolute). */
function xExtent(d: string): [number, number] {
  const xs: number[] = [];
  const tokens = d.match(/[MLQCHVZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let cmd = "", args: number[] = [];
  const flush = () => {
    if (cmd === "H") xs.push(...args);
    else if (cmd !== "V") args.forEach((v, i) => { if (i % 2 === 0) xs.push(v); });
    args = [];
  };
  for (const t of tokens) {
    if (/[A-Z]/i.test(t)) { flush(); cmd = t.toUpperCase(); } else args.push(Number(t));
  }
  flush();
  return [Math.min(...xs), Math.max(...xs)];
}

function header(title: string, lang: "ar" | "en", preset: string) {
  const base = sisterCase("A", "control", lang);
  const settings = { posterSize: "A2", showFemales: true, theme: { preset, v: 2 } } as unknown as TreeDTO["settings"];
  const tree = { ...base, title, settings };
  const theme = resolveTheme(settings);
  const layout = computePosterLayout(tree, layoutOptionsFor(theme, "A2"));
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title, subtitle: null, name: "" }, theme }));
  const text = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].find((m) => m[2] === title.replace(/&/g, "&amp;"));
  if (!text) throw new Error("title not drawn");
  const fs = Number(/font-size="([\d.]+)"/.exec(text[1])![1]);
  return { svg, fs, W: layout.width, palette: paletteOf(theme) };
}

const TITLES = {
  en: ["The Descendants of Sheikh Abdulrahman ibn Muhammad Al-Kalali", "THE AL-RASHID FAMILY TREE", "Family Tree of Titles", "WWWW MMMM"],
  ar: ["شجرة عائلة الشيخ عبدالرحمن بن محمد بن عبدالله بن سليمان الكلالي", "شجرة آل الكلالي"],
};

describe("the title inside its ground", () => {
  for (const [preset, style, pad, tips] of [["luxe", "cartouche", 2.6, 0.9], ["heritage", "panel", 1.8, 0.3]] as const) {
    for (const lang of ["en", "ar"] as const) for (const title of TITLES[lang]) {
      it(`${preset} (${style}): "${title}" keeps its margins`, { timeout: 60_000 }, () => {
        const { svg, fs } = header(title, lang, preset);
        // the ground's outer outline: the first path filled at its opacity
        const d = new RegExp(`<path d="([^"]+)" fill="[^"]+" fill-opacity="${style === "cartouche" ? "0.92" : "0.75"}"`).exec(svg)?.[1];
        expect(d, "ground drawn").toBeTruthy();
        const [x0, x1] = xExtent(d!);
        const font = "ruqaa";
        const drawn = TRUE[title]?.[font] ?? titleEms(title, font) * 1.06;
        // the text, at its drawn width, clear of the ground's tips or cut
        // corners on both sides, with the margin the ground is drawn with
        expect(x1 - x0).toBeGreaterThanOrEqual(drawn * fs + 2 * tips * fs);
        expect(x1 - x0).toBeGreaterThanOrEqual(titleEms(title, font) * fs + pad * fs - 1e-6);
      });
    }
  }

  it("a Kufi design's English title is not set smaller than its room allows", { timeout: 60_000 }, () => {
    // (measured as the names' width times 1.45, an English title in the
    // Kufi designs came out about a third smaller than it fits)
    const title = "The Al-Rashid Family Tree";
    const { fs, W } = header(title, "en", "silver-gold");
    expect(fs).toBeGreaterThan(W * 0.036 * 0.999);
  });
});
