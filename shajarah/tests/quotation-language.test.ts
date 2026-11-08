// The medallions' quotations are in one language at a time: the original
// Arabic with its Arabic references, or the owner's English translations with
// their English references, both medallions together, never both languages
// (PosterTheme.quoteLang: "auto" follows the poster's language). The basmala
// over the title follows the same choice.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { TreePoster } from "@/components/poster/TreePoster";
import { BASMALA, HADITH, HADITH_EN, VERSE, VERSE_EN, textInCircle } from "@/components/poster/ornaments";
import { textWidth } from "@/lib/layout/botanical";
import type { MemberDTO, ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;
const ARABIC = /[؀-ۿ]/, LATIN = /[A-Za-z]/;

/** A small family, its names in Arabic or in English (which sets the poster's language). */
function family(lang: "ar" | "en"): TreeDTO {
  const names = lang === "ar" ? ["عبدالله", "محمد", "سارة", "خالد", "هند", "عمر", "ريم"] : ["Abdullah", "Muhammad", "Sarah", "Khalid", "Hind", "Umar", "Reem"];
  const gender = ["MALE", "MALE", "FEMALE", "MALE", "FEMALE", "MALE", "FEMALE"] as const;
  const father = [null, 0, 1, 1, 1, 3, 3];
  const members: MemberDTO[] = names.map((name, i) => ({
    id: `q-${lang}-${i}`, name, laqab: null, gender: gender[i], birthYear: null, deathYear: null, isDeceased: false,
    birthOrder: i, generation: 0, notes: null, fatherId: father[i] === null ? null : `q-${lang}-${father[i]}`, motherId: null,
  }));
  return { id: `q-${lang}`, name: "q", title: lang === "ar" ? "شجرة العائلة" : "Family Tree", subtitle: null, lineage: "PATRILINEAL",
    rootMemberId: members[0].id, crownBaseId: members[1].id, trunkStartId: null, soilText: null, settings: null, members, marriages: [], sources: [], citations: [], media: [] };
}

function poster(lang: "ar" | "en", theme: Record<string, unknown>, paper: PaperSize = "A1") {
  const base = family(lang);
  const settings = { posterSize: paper, theme: { v: 2, ...theme } } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const layout = computePosterLayout({ ...base, settings }, layoutOptionsFor(t, paper));
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: base.title, subtitle: null, name: "" }, theme: t }));
  // each medallion's text lines, in order
  const lines = [...svg.matchAll(/<text[^>]*data-quote-lang="(ar|en)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({ lang: m[1], text: m[2] }));
  return { layout, svg, lines };
}
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

describe("the quotations' language", () => {
  it("the English texts and references, word for word as given", () => {
    expect(VERSE_EN.body).toBe("“O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another. Indeed, the most noble of you in the sight of Allah is the most righteous of you. Indeed, Allah is Knowing and Acquainted.”");
    expect(VERSE_EN.footer).toBe("Surah Al-Hujurat, Ayat 13");
    expect(HADITH_EN.body).toBe("“Learn enough about your lineage to facilitate keeping your ties of kinship. For indeed keeping the ties of kinship encourages affection among the relatives, increases the wealth, and increases the lifespan”");
    expect(HADITH_EN.footer).toBe("Jami` at-Tirmidhi 1979 (Book 27, Hadith 85)");
  });

  const cases: [string, "ar" | "en", "auto" | "ar" | "en" | undefined, "ar" | "en"][] = [
    ["an Arabic poster, unset", "ar", undefined, "ar"], ["an Arabic poster, auto", "ar", "auto", "ar"],
    ["an English poster, unset", "en", undefined, "en"], ["an English poster, auto", "en", "auto", "en"],
    ["an Arabic poster, English chosen", "ar", "en", "en"], ["an English poster, Arabic chosen", "en", "ar", "ar"],
  ];
  for (const [what, lang, quoteLang, want] of cases) {
    it(`${what}: both medallions in ${want === "ar" ? "Arabic" : "English"}, and only that`, () => {
      for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) for (const frame of [true, false]) {
        const { lines, layout } = poster(lang, { preset, verse: true, hadith: true, frame, ...(quoteLang ? { quoteLang } : {}) });
        expect(layout.quoteLang).toBe(want);
        expect(lines.length).toBeGreaterThan(0);
        expect(new Set(lines.map((l) => l.lang))).toEqual(new Set([want]));
        const text = lines.map((l) => l.text).join(" ");
        if (want === "en") expect(ARABIC.test(text), `${preset}: Arabic in an English medallion`).toBe(false);
        else expect(LATIN.test(text), `${preset}: English in an Arabic medallion`).toBe(false);
      }
    });
  }

  for (const [what, lang, quoteLang, want] of cases) {
    it(`${what}: the basmala in ${want === "ar" ? "Arabic" : "English"}, and only that`, () => {
      for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) for (const frame of [true, false]) {
        const { svg } = poster(lang, { preset, bismillah: true, verse: true, hadith: true, frame, ...(quoteLang ? { quoteLang } : {}) });
        const shown = [...svg.matchAll(/<text[^>]*data-basmala="(ar|en)"[^>]*>([^<]*)<\/text>/g)];
        expect(shown.map((m) => m[1]), preset).toEqual([want]);
        expect(svg.includes(BASMALA.ar), `${preset}: Arabic basmala`).toBe(want === "ar");
        expect(unescape(svg).includes(BASMALA.en), `${preset}: English basmala`).toBe(want === "en");
      }
    });
  }

  it("the English basmala word for word, on one line between the medallions, never cut", () => {
    expect(BASMALA.en).toBe("In the name of Allah, the Most Gracious, the Most Merciful.");
    expect(BASMALA.ar).toBe("\uFDFD");
    for (const frame of [true, false]) for (const paper of ["A3", "A1", "4A0"] as PaperSize[]) for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) {
      const { svg, layout } = poster("en", { preset, bismillah: true, verse: true, hadith: true, frame }, paper);
      const m = /<text([^>]*)data-basmala="en"[^>]*>([^<]*)<\/text>/.exec(svg)!;
      expect(unescape(m[2])).toBe(BASMALA.en);
      const fs = Number(/font-size="([\d.]+)"/.exec(m[1])![1]);
      // (textWidth errs wide for this line: 28.3 em against 25.8 measured)
      const half = (textWidth(BASMALA.en, 1) * fs) / 2;
      for (const md of layout.medallions) expect(Math.abs(md.x - layout.width / 2) - md.r, `${preset} ${paper}`).toBeGreaterThan(half);
      expect(half * 2).toBeLessThanOrEqual(layout.frame.header.maxTitleWidth);
      // legible: at least the size of the names' smallest text
      expect(fs * PAPER_SIZES[paper].w / layout.width).toBeGreaterThanOrEqual(layout.legibility.minTextMm);
    }
  });

  it("each of the four choices of medallions: only the chosen ones, in the one language", () => {
    for (const lang of ["ar", "en"] as const) for (const [verse, hadith] of [[false, false], [true, false], [false, true], [true, true]]) {
      const { lines, layout } = poster(lang, { preset: "luxe", verse, hadith });
      const text = unescape(lines.map((l) => l.text).join(" "));
      const q = lang === "en" ? { v: VERSE_EN, h: HADITH_EN } : { v: VERSE, h: HADITH };
      expect(text.includes(q.v.footer)).toBe(verse);
      expect(text.includes(q.h.footer)).toBe(hadith);
      // (none chosen: no medallions, no room kept for them)
      if (!verse && !hadith) expect(layout.medallions).toEqual([]);
    }
  });

  it("the whole quotation is always set, on every paper: nothing left out", () => {
    for (const q of [VERSE, HADITH, VERSE_EN, HADITH_EN]) for (const r of [2400 * 0.07, 2400 * 0.094, 2400 * 0.07 * 1.2, 2400 * 0.094 * 1.2]) {
      const set = textInCircle(r * 0.8, q.heading, q.body, q.footer);
      const words = (s: string) => s.split(/\s+/).filter(Boolean);
      expect(words(set.lines.map((l) => l.text).join(" "))).toEqual(words([q.heading, q.body, q.footer].join(" ")));
    }
  });

  it("English is set nearly as large as the Arabic it replaces, and no name sits in a medallion", () => {
    for (const frame of [true, false]) for (const paper of ["A3", "A1", "4A0"] as PaperSize[]) {
      const size = (lang: "ar" | "en") => {
        const { layout } = poster(lang, { preset: "refined", verse: true, hadith: true, frame }, paper);
        for (const m of layout.medallions) for (const n of layout.nodes) {
          expect(Math.hypot(n.x - m.x, n.y - m.y), `${n.id} inside a medallion`).toBeGreaterThan(m.r);
        }
        const q = lang === "en" ? [VERSE_EN, HADITH_EN] : [VERSE, HADITH];
        return Math.min(...q.map((x) => textInCircle(layout.medallions[0].r * 0.8, x.heading, x.body, x.footer).size)) * PAPER_SIZES[paper].w / layout.width;
      };
      expect(size("en")).toBeGreaterThanOrEqual(size("ar") * 0.85);
    }
  });
});
