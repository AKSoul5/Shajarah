// Ornament geometry for the poster: scalloped medallions and text set
// inside circles. (The outer frame and corner flourishes are artwork.) Pure functions returning SVG
// path data, so everything stays vector.

import { textWidth } from "@/lib/layout/botanical";

const f = (n: number) => n.toFixed(1);

/** Ellipse with a scalloped ("sun") edge of n bumps. */
export function scallopPath(cx: number, cy: number, rx: number, ry: number, n = 18, depth = 0.07): string {
  const pt = (a: number, k: number) => ({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const p0 = pt(a0, 1);
    const c = pt((a0 + a1) / 2, 1 + depth * 2);
    const p1 = pt(a1, 1);
    if (i === 0) d += `M${f(p0.x)} ${f(p0.y)}`;
    d += `Q${f(c.x)} ${f(c.y)} ${f(p1.x)} ${f(p1.y)}`;
  }
  return `${d}Z`;
}

export interface CircleText {
  lines: { text: string; y: number; bold?: boolean; size: number }[];
  /** The body's font size it was set at. */
  size: number;
}

/**
 * Sets a heading (none when empty), a body and a footer inside a circle of
 * radius r: lines are as wide as the circle's chord at their height. Picks
 * the largest font that fits. The whole quotation is always set: there is
 * no size below which part of it is left out (an earlier fallback kept only
 * the heading, silently).
 */
export function textInCircle(r: number, heading: string, body: string, footer: string): CircleText {
  const words = body.split(/\s+/).filter(Boolean);
  for (let fs = r * 0.17; fs > r * 0.005; fs *= 0.95) {
    const lh = fs * 1.5;
    const hs = fs * 0.9;
    const lines: CircleText["lines"] = [];
    // estimate how many body lines we need, then centre the block
    const fill = (top: number) => {
      lines.length = 0;
      let y = top;
      if (heading) {
        lines.push({ text: heading, y, bold: true, size: hs });
        y += lh * 1.05;
      }
      let cur = "";
      const chordAt = (yy: number) => 2 * Math.sqrt(Math.max(0, r * r - (Math.abs(yy) + fs * 0.6) ** 2)) * 0.86;
      let i = 0;
      while (i < words.length) {
        const width = chordAt(y);
        if (width <= fs * 3) return false;
        cur = words[i];
        i++;
        while (i < words.length && textWidth(`${cur} ${words[i]}`, fs) <= width) {
          cur = `${cur} ${words[i]}`;
          i++;
        }
        lines.push({ text: cur, y, size: fs });
        y += lh;
      }
      lines.push({ text: footer, y: y + lh * 0.1, size: fs * 0.75 });
      return Math.abs(y + lh * 0.1) + fs * 0.6 < r * 0.92;
    };
    // try a few vertical offsets so the block is roughly centred
    for (const top of [-r * 0.62, -r * 0.55, -r * 0.48, -r * 0.4]) {
      if (fill(top)) {
        const span = lines[lines.length - 1].y - lines[0].y;
        const shift = -(lines[0].y + span / 2);
        return { lines: lines.map((l) => ({ ...l, y: l.y + shift })), size: fs };
      }
    }
  }
  throw new Error("A quotation does not fit its medallion at any size");
}

/** A quotation: in one language, its own heading (none in English), text and reference. */
export interface Quotation { lang: "ar" | "en"; heading: string; body: string; footer: string }

// Al-Hujurat 49:13 and the hadith from Sunan al-Tirmidhi (1979).
export const VERSE: Quotation = {
  lang: "ar",
  heading: "قال الله تعالى:",
  body: "﴿يا أيها الناس إنا خلقناكم من ذكر وأنثى وجعلناكم شعوبا وقبائل لتعارفوا إن أكرمكم عند الله أتقاكم إن الله عليم خبير﴾",
  footer: "سورة الحجرات (١٣)",
};
export const HADITH: Quotation = {
  lang: "ar",
  heading: "قال رسول الله ﷺ:",
  body: "«تعلموا من أنسابكم ما تصلون به أرحامكم، فإن صلة الرحم محبة في الأهل، مثراة في المال، منسأة في الأثر»",
  footer: "رواه الترمذي",
};

// The English texts and references, exactly as the owner gave them (do not
// edit: tests/quotation-language.test.ts compares them word for word).
export const VERSE_EN: Quotation = {
  lang: "en",
  heading: "",
  body: "“O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another. Indeed, the most noble of you in the sight of Allah is the most righteous of you. Indeed, Allah is Knowing and Acquainted.”",
  footer: "Surah Al-Hujurat, Ayat 13",
};
export const HADITH_EN: Quotation = {
  lang: "en",
  heading: "",
  body: "“Learn enough about your lineage to facilitate keeping your ties of kinship. For indeed keeping the ties of kinship encourages affection among the relatives, increases the wealth, and increases the lifespan”",
  footer: "Jami` at-Tirmidhi 1979 (Book 27, Hadith 85)",
};

/** The two quotations in one language: both medallions always in the same one, never both languages. */
export function quotations(lang: "ar" | "en"): { verse: Quotation; hadith: Quotation } {
  return lang === "en" ? { verse: VERSE_EN, hadith: HADITH_EN } : { verse: VERSE, hadith: HADITH };
}

/**
 * The basmala over the title, in the quotations' language: in Arabic the one
 * calligraphic glyph Amiri draws for بسم الله الرحمن الرحيم (U+FDFD), in
 * English the owner's translation, word for word.
 */
export const BASMALA = { ar: "\uFDFD", en: "In the name of Allah, the Most Gracious, the Most Merciful." } as const;
