// The words of the poster's key and number cards (see TreePoster's Footer),
// in Arabic and English. Each label says exactly what the symbol beside it
// shows, for a paternal or a maternal lineage alike, and never assumes a
// gender a record does not give.

import type { Gender } from "./types";

export const LEGEND = {
  son: { ar: "ابن", en: "Son" },
  daughter: { ar: "بنت", en: "Daughter" },
  /** The second ring around a person who has children: a man or a woman. */
  descendants: { ar: "له/لها ذرية", en: "Has descendants" },
  /** The names on the trunk: the line the poster follows, through fathers or through mothers. */
  lineage: { ar: "سلسلة النسب", en: "Ancestral lineage" },
  branchColours: { ar: "لكل فرع لونه", en: "Distinct branch colours" },
  /** Dotted lines: a daughter's husband and children, shown through her. */
  throughDaughters: { ar: "امتداد الأسرة عبر البنات", en: "Family branches through daughters" },
  generations: { ar: "الأجيال", en: "Generations" },
} as const;

export const say = (label: { ar: string; en: string }, rtl: boolean) => (rtl ? label.ar : label.en);

/**
 * The spouse label, from the genders of the spouses drawn: "زوج" only when
 * every one is recorded as a man, "زوجة" only when every one is recorded as
 * a woman, otherwise both (a spouse whose gender is not recorded is never
 * taken for either).
 */
export function spouseLabel(genders: Iterable<Gender | null | undefined>, rtl: boolean): string {
  const all = [...genders];
  const only = (g: Gender) => all.length > 0 && all.every((x) => x === g);
  if (!rtl) return only("MALE") ? "Husband" : only("FEMALE") ? "Wife" : "Spouse";
  return only("MALE") ? "زوج" : only("FEMALE") ? "زوجة" : "زوج / زوجة";
}

/** The number cards under the key: [label, value]. */
export function statCards(stats: { total: number; males: number; females: number; generations: number }, rtl: boolean): [string, number][] {
  return rtl
    ? [["إجمالي الأفراد", stats.total], ["الذكور", stats.males], ["الإناث", stats.females], ["عدد الأجيال", stats.generations]]
    : [["Total people", stats.total], ["Males", stats.males], ["Females", stats.females], ["Number of generations", stats.generations]];
}

/**
 * Up to this many generations, the key names each one ("الجيل الأول" …);
 * more are shown as one row of numbered colour chips, so every colour on the
 * poster is explained without the key running off the page.
 */
export const NAMED_GENERATIONS = 8;
