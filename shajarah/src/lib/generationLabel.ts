// A person's generation in words, counted from the canopy base (where the
// family on the poster starts) rather than from the root of the lineage: in
// a family whose line goes back 78 generations to آدم, "Generation 60" said
// nothing about where someone stands in the family. The absolute number is
// kept, small, for genealogists.

import type { MemberDTO } from "./types";

/** "1st", "2nd", "3rd", "4th", "11th", "21st" … */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** A name kept whole and in its own direction inside an English sentence. */
const isolate = (name: string) => `⁨${name}⁩`;

/**
 * Where a person stands, in words, relative to the canopy base:
 * "Canopy base", "Son of the canopy base", "3rd generation from محمد",
 * "5 generations above محمد", "Same generation as محمد"; and the
 * absolute generation ("G60", counted from the root). Without a canopy
 * base, only "Generation 60".
 */
export function generationLabel(
  member: MemberDTO, base: MemberDTO | null | undefined,
  /** The generation a person is listed in (a spouse who married in: their partner's). */
  generationOf: (m: MemberDTO) => number = (m) => m.generation,
): { words: string; absolute: string } {
  const g = generationOf(member);
  const absolute = `G${g + 1}`;
  if (!base) return { words: `Generation ${g + 1}`, absolute };
  if (member.id === base.id) return { words: "Canopy base", absolute };
  const d = g - generationOf(base);
  const name = isolate(base.name);
  if (d === 0) return { words: `Same generation as ${name}`, absolute };
  if (d === 1 && (member.fatherId === base.id || member.motherId === base.id)) {
    const child = member.gender === "MALE" ? "Son" : member.gender === "FEMALE" ? "Daughter" : "Child";
    return { words: `${child} of the canopy base`, absolute };
  }
  if (d > 0) return { words: `${ordinal(d)} generation from ${name}`, absolute };
  return { words: `${-d} generation${d === -1 ? "" : "s"} above ${name}`, absolute };
}

/** Whether a person is listed with the ancestral line (above the canopy base) rather than the family. */
export function inAncestralLine(member: MemberDTO, base: MemberDTO | null | undefined, generationOf: (m: MemberDTO) => number = (m) => m.generation) {
  return !!base && generationOf(member) < generationOf(base);
}
