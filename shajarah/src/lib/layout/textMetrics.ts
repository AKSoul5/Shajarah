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

type Forms = [number, number, number, number];
const ARABIC_FORMS = FONT.arabic as unknown as Record<string, Forms>;
const LAM_ALEF = FONT.lamAlef as unknown as Record<string, [number, number]>;
const LATIN = FONT.latin as Record<string, number>;
const OTHER = FONT.other as Record<string, number>;
/** Letter pairs drawn differently from their two forms (ligatures, kerning), by context: bit 1 joined before the pair, bit 2 after it. */
const PAIRS = (FONT as unknown as { pairs: Record<string, number> }).pairs;
/** Words drawn as one ligature (محمد, الله), whole, by the same contexts. */
const WORDS = Object.entries((FONT as unknown as { words: Record<string, number[]> }).words);

/** Vowel marks and other combining marks: drawn over or under a letter, no width of their own. */
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ‌‍‎‏]/;
/** Letters that join only to the letter before them (Unicode joining type R), and the hamza that joins to neither. */
const RIGHT_ONLY = new Set("آأؤإاٱةدذرزوژ");
const NON_JOINING = new Set("ء");
const ALEFS = new Set("اأإآ");
const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const isLetter = (ch: string | undefined) => !!ch && ch in ARABIC_FORMS;
/** Joins to the letter after it (dual-joining, or the tatweel). */
const joinsForward = (ch: string | undefined) => isLetter(ch) && !RIGHT_ONLY.has(ch!) && !NON_JOINING.has(ch!);
/** Joins to the letter before it. */
const joinsBack = (ch: string | undefined) => isLetter(ch) && !NON_JOINING.has(ch!);

/** Advance width of `text` in ems of the names' font. */
export function textEms(text: string): number {
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
      const word = WORDS.find(([wd]) => chars.slice(i, i + wd.length).join("") === wd);
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
        w += LAM_ALEF[ch + next][before ? 1 : 0];
        i = j;
        last = null;
        continue;
      }
      const after = joinsForward(ch) && joinsBack(next);
      w += ARABIC_FORMS[ch][before && after ? 2 : before ? 3 : after ? 1 : 0];
      // the pair this letter ends, as the font draws it
      // (joined or not: unjoined letters are kerned too, as ر beside ي)
      if (last) w += PAIRS[last.ch + ch + ((last.before ? 1 : 0) | (after ? 2 : 0))] ?? 0;
      last = { ch, before };
      continue;
    }
    last = null;
    w += LATIN[ch] ?? OTHER[ch] ?? (ARABIC_RANGE.test(ch) ? 0.5 : 0.6);
  }
  return w;
}
