// The family in figures (the Analytics view): counts, generations,
// branches, years, names and marriages, from the family engine.
//
// No figure is stretched past the records. Every one that rests on
// partly recorded information (years of birth, of death) says how many
// people it covers, and nothing is estimated: an age is given only where
// the years are recorded, and "living" means "not recorded as deceased".

import { normalizeName } from "../nasab";
import type { FamilyIndex } from "./index";
import { branchMembers, completenessOf } from "./quality";
import type { TreeDTO } from "../types";

export interface Coverage {
  /** People the figure could use, and people it is about. */
  known: number;
  of: number;
}

export interface FamilyFigures {
  overview: {
    people: number;
    bloodRelatives: number;
    marriedIn: number;
    unrelated: number;
    generations: number;
    branches: number;
    /** Couples or single parents with at least one child recorded. */
    families: number;
    men: number;
    women: number;
    genderUnknown: number;
    recordedDeceased: number;
    notRecordedDeceased: number;
  };
  /** Generation 1 down: how many people, men and women. */
  byGeneration: { level: number; people: number; men: number; women: number }[];
  /** Ancestors above Generation 1 (one figure: the line, not a generation's people). */
  ancestorsAbove: number;
  branches: { id: string; name: string; people: number; generationsDeep: number; completeness: number }[];
  /** Births and deaths by decade, from recorded years only. */
  birthsByDecade: { decade: number; count: number }[];
  deathsByDecade: { decade: number; count: number }[];
  birthCoverage: Coverage;
  deathCoverage: Coverage;
  /** Lifespans of the deceased with both years recorded, by decade of age. */
  lifespans: { decade: number; count: number }[];
  lifespanCoverage: Coverage;
  /** The oldest people not recorded as deceased, by recorded year of birth (none born over 110 years ago). */
  oldestLiving: { id: string; name: string; born: number; age: number }[];
  /** First names, most given first (letters normalised for counting, shown as most often written). */
  topNames: { men: { name: string; count: number }[]; women: { name: string; count: number }[] };
  marriages: {
    total: number;
    withYear: number;
    /** People with more than one marriage recorded. */
    severalMarriages: number;
    /** Marriages between two blood relatives of the family. */
    withinFamily: number;
  };
}

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

function histogram(values: number[]): { decade: number; count: number }[] {
  const by = new Map<number, number>();
  for (const v of values) by.set(decadeOf(v), (by.get(decadeOf(v)) ?? 0) + 1);
  return [...by].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count }));
}

function topNames(list: string[], k = 10): { name: string; count: number }[] {
  const by = new Map<string, { count: number; forms: Map<string, number> }>();
  for (const raw of list) {
    // (the first name: before "بن"/"بنت" or a space)
    const first = raw.trim().split(/\s+/)[0];
    if (!first) continue;
    const key = normalizeName(first);
    const e = by.get(key) ?? { count: 0, forms: new Map() };
    e.count++;
    e.forms.set(first, (e.forms.get(first) ?? 0) + 1);
    by.set(key, e);
  }
  return [...by.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, k)
    .map((e) => ({ name: [...e.forms].sort((a, b) => b[1] - a[1])[0][0], count: e.count }));
}

export function familyFigures(ix: FamilyIndex, tree: Pick<TreeDTO, "marriages" | "citations">, now = new Date().getFullYear()): FamilyFigures {
  const members = ix.members;
  const levelOf = (id: string) => {
    const g = ix.generations.get(id);
    return g?.kind === "level" ? g.level : null;
  };
  const blood = members.filter((m) => levelOf(m.id) !== null);
  const below = blood.filter((m) => levelOf(m.id)! >= 1);
  const byGen = new Map<number, { people: number; men: number; women: number }>();
  for (const m of below) {
    const l = levelOf(m.id)!;
    const e = byGen.get(l) ?? { people: 0, men: 0, women: 0 };
    e.people++;
    if (m.gender === "MALE") e.men++;
    if (m.gender === "FEMALE") e.women++;
    byGen.set(l, e);
  }
  const families = new Set(members.filter((m) => m.fatherId || m.motherId).map((m) => `${m.fatherId ?? ""}|${m.motherId ?? ""}`)).size;

  const births = members.flatMap((m) => (m.birthYear !== null ? [m.birthYear] : []));
  const deceased = members.filter((m) => m.isDeceased);
  const deaths = deceased.flatMap((m) => (m.deathYear !== null ? [m.deathYear] : []));
  const spans = deceased.flatMap((m) => (m.birthYear !== null && m.deathYear !== null && m.deathYear >= m.birthYear ? [m.deathYear - m.birthYear] : []));
  const oldestLiving = members
    .filter((m) => !m.isDeceased && m.deathYear === null && m.birthYear !== null && now - m.birthYear <= 110)
    .sort((a, b) => a.birthYear! - b.birthYear!)
    .slice(0, 5)
    .map((m) => ({ id: m.id, name: m.name, born: m.birthYear!, age: now - m.birthYear! }));

  const marriagesPer = new Map<string, number>();
  for (const mar of tree.marriages) for (const id of [mar.spouseAId, mar.spouseBId]) marriagesPer.set(id, (marriagesPer.get(id) ?? 0) + 1);

  return {
    overview: {
      people: members.length,
      bloodRelatives: blood.length,
      marriedIn: members.filter((m) => ix.generations.get(m.id)?.kind === "spouse").length,
      unrelated: members.filter((m) => ix.generations.get(m.id)?.kind === "unrelated").length,
      generations: byGen.size,
      branches: ix.branchHeads().length,
      families,
      men: members.filter((m) => m.gender === "MALE").length,
      women: members.filter((m) => m.gender === "FEMALE").length,
      genderUnknown: members.filter((m) => m.gender === "UNKNOWN").length,
      recordedDeceased: deceased.length,
      notRecordedDeceased: members.length - deceased.length,
    },
    byGeneration: [...byGen].sort((a, b) => a[0] - b[0]).map(([level, e]) => ({ level, ...e })),
    ancestorsAbove: blood.length - below.length,
    branches: branchMembers(ix).map(({ head, ids }) => {
      const c = completenessOf(ix, tree, ids);
      const recorded = Object.values(c.areas).reduce((a, x) => a + x.recorded, 0);
      const applicable = Object.values(c.areas).reduce((a, x) => a + x.applicable, 0);
      return { id: head.id, name: head.name, people: ids.length, generationsDeep: ix.depthBelow(head.id) + 1, completeness: applicable ? recorded / applicable : 1 };
    }).sort((a, b) => b.people - a.people),
    birthsByDecade: histogram(births),
    deathsByDecade: histogram(deaths),
    birthCoverage: { known: births.length, of: members.length },
    deathCoverage: { known: deaths.length, of: deceased.length },
    lifespans: histogram(spans),
    lifespanCoverage: { known: spans.length, of: deceased.length },
    oldestLiving,
    topNames: {
      men: topNames(blood.filter((m) => m.gender === "MALE").map((m) => m.name)),
      women: topNames(blood.filter((m) => m.gender === "FEMALE").map((m) => m.name)),
    },
    marriages: {
      total: tree.marriages.length,
      withYear: tree.marriages.filter((m) => m.startYear !== null).length,
      severalMarriages: [...marriagesPer.values()].filter((n) => n > 1).length,
      withinFamily: tree.marriages.filter((m) => levelOf(m.spouseAId) !== null && levelOf(m.spouseBId) !== null).length,
    },
  };
}
