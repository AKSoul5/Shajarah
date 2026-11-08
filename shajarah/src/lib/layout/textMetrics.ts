// The width of a name as the bundled Amiri sets it, from per-glyph advance
// widths measured in Chromium (scripts/font-metrics.mjs → fontMetrics.json):
// every Latin character, and every Arabic letter in the form its neighbours
// give it (alone, joined to the next, joined on both sides, joined to the
// previous), lam-alef as its ligature, vowel marks as nothing. The wider of
// regular and bold, so a name is never measured narrower than it is drawn.
// It replaces a count of characters (0.46 em an Arabic letter, 0.52 a Latin
// one), which was 15-30% too wide for most names, two to three times too
// wide for a name with its vowels written, and up to 57% too narrow for wide
// capitals and long titles: tests/text-width.test.ts.
import FONT from "./fontMetrics.json";
import TITLE_FONTS from "./titleMetrics.json";

type Forms = [number, number, number, number];
/** One font's measured advance widths (scripts/font-metrics.mjs). */
interface Table {
  arabic: Record<string, Forms>;
  lamAlef: Record<string, [number, number]>;
  latin: Record<string, number>;
  other: Record<string, number>;
  /** Letter pairs drawn differently from their two forms (ligatures, kerning), by context: bit 1 joined before the pair, bit 2 after it. */
  pairs: Record<string, number>;
  /** Words drawn as one ligature (محمد, الله), whole, by the same contexts. */
  words: [string, number[]][];
}
const tableOf = (f: unknown): Table => {
  const t = f as Omit<Table, "words"> & { words: Record<string, number[]> };
  return { ...t, words: Object.entries(t.words) };
};
const AMIRI = tableOf(FONT);
// (the titles' fonts are loaded for Arabic only: Latin in a title is drawn
// in Amiri, and measured so, at the title's weight)
const TITLES = TITLE_FONTS as unknown as Record<"ruqaa" | "kufi", unknown>;
const RUQAA = tableOf(TITLES.ruqaa);
const KUFI = tableOf(TITLES.kufi);

/** Vowel marks and other combining marks: drawn over or under a letter, no width of their own. */
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ‌‍‎‏]/;
/** Letters that join only to the letter before them (Unicode joining type R), and the hamza that joins to neither. */
const RIGHT_ONLY = new Set("آأؤإاٱةدذرزوژ");
const NON_JOINING = new Set("ء");
const ALEFS = new Set("اأإآ");
const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const isLetter = (ch: string | undefined) => !!ch && ch in AMIRI.arabic;
/** Joins to the letter after it (dual-joining, or the tatweel). */
const joinsForward = (ch: string | undefined) => isLetter(ch) && !RIGHT_ONLY.has(ch!) && !NON_JOINING.has(ch!);
/** Joins to the letter before it. */
const joinsBack = (ch: string | undefined) => isLetter(ch) && !NON_JOINING.has(ch!);

/** Advance width of `text` in ems of the names' font. */
export function textEms(text: string): number {
  return emsIn(AMIRI, text);
}

/**
 * Advance width of a title in ems of its font, as the poster draws it: Aref
 * Ruqaa in bold, or Noto Kufi Arabic (the modern designs), their Arabic;
 * any Latin in Amiri, the fallback. (Estimated as the names' width times
 * 1.1 or 1.45, an English title came out up to 55% wider than its ground,
 * and an English title in the Kufi designs half again too small.)
 */
export function titleEms(text: string, font: "ruqaa" | "kufi"): number {
  return emsIn(font === "kufi" ? KUFI : RUQAA, text);
}

function emsIn(T: Table, text: string): number {
  // (vowel marks take no room, and would part a ligature word's letters)
  const chars = [...text].filter((ch) => !MARK.test(ch));
  // the neighbouring letters, vowel marks skipped
  const prevOf = (i: number) => { for (let j = i - 1; j >= 0; j--) if (!MARK.test(chars[j])) return chars[j]; return undefined; };
  const nextAt = (i: number) => { for (let j = i + 1; j < chars.length; j++) if (!MARK.test(chars[j])) return j; return -1; };
  let w = 0;
  // the last letter measured, whether it was joined to the one before it
  let last: { ch: string; before: boolean } | null = null;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (MARK.test(ch)) continue;
    if (isLetter(ch)) {
      const before = joinsForward(prevOf(i));
      const word = T.words.find(([wd]) => chars.slice(i, i + wd.length).join("") === wd);
      if (word) {
        const after = chars[i + word[0].length];
        w += word[1][(before ? 1 : 0) | (joinsBack(after) && joinsForward(word[0].at(-1)) ? 2 : 0)];
        i += word[0].length - 1;
        last = null;
        continue;
      }
      const j = nextAt(i);
      const next = j >= 0 ? chars[j] : undefined;
      if (ch === "ل" && next && ALEFS.has(next)) {
        // lam-alef: one ligature, joined to the letter before or not
        w += T.lamAlef[ch + next][before ? 1 : 0];
        i = j;
        last = null;
        continue;
      }
      const after = joinsForward(ch) && joinsBack(next);
      w += T.arabic[ch][before && after ? 2 : before ? 3 : after ? 1 : 0];
      // the pair this letter ends, as the font draws it
      // (joined or not: unjoined letters are kerned too, as ر beside ي)
      if (last) w += T.pairs[last.ch + ch + ((last.before ? 1 : 0) | (after ? 2 : 0))] ?? 0;
      last = { ch, before };
      continue;
    }
    last = null;
    w += T.latin[ch] ?? T.other[ch] ?? (ARABIC_RANGE.test(ch) ? 0.5 : 0.6);
  }
  return w;
}
