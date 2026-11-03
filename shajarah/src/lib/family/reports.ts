// Reports from the family engine: the Ahnentafel (ancestors numbered by
// the standard convention), the family group sheet (a couple, their
// parents and their children), and the pedigree (the ancestors as a tree
// for the chart). Each reads the records as they are: an unknown parent
// is a gap, never a guess.

import type { MarriageDTO, MemberDTO } from "../types";
import type { FamilyIndex } from "./index";

export interface AhnentafelEntry {
  /** 1 the subject, 2 the father, 3 the mother; a person's father is 2n, mother 2n+1. */
  number: number;
  /** The generation back from the subject (1 the subject, 2 the parents). */
  generation: number;
  person: MemberDTO;
  /** Where the same ancestor appears again by another line (pedigree collapse): their other numbers. */
  alsoNumbers: number[];
}

/**
 * The subject's ancestors by Ahnentafel number, `generations` deep
 * (the subject's generation counts as the first). Only recorded ancestors
 * are listed; their numbers keep the gaps of those not recorded.
 */
export function ahnentafel(ix: FamilyIndex, subjectId: string, generations = 6): AhnentafelEntry[] {
  const first = new Map<string, number>();
  const all = new Map<string, number[]>();
  const out: AhnentafelEntry[] = [];
  const visit = (id: string | null | undefined, num: number, gen: number) => {
    const p = ix.get(id);
    if (!p || gen > generations) return;
    (all.get(p.id) ?? all.set(p.id, []).get(p.id)!).push(num);
    if (first.has(p.id)) return; // (listed once; its line is already numbered)
    first.set(p.id, num);
    out.push({ number: num, generation: gen, person: p, alsoNumbers: [] });
    visit(p.fatherId, 2 * num, gen + 1);
    visit(p.motherId, 2 * num + 1, gen + 1);
  };
  visit(subjectId, 1, 1);
  for (const e of out) e.alsoNumbers = (all.get(e.person.id) ?? []).filter((n) => n !== e.number);
  return out.sort((a, b) => a.number - b.number);
}

export interface GroupSheet {
  /** The couple: the person and one spouse (null: the children's other parent is not recorded). */
  husband: MemberDTO | null;
  wife: MemberDTO | null;
  marriage: MarriageDTO | null;
  husbandParents: { father?: MemberDTO; mother?: MemberDTO };
  wifeParents: { father?: MemberDTO; mother?: MemberDTO };
  /** Their children, eldest first, each with their own spouses. */
  children: { person: MemberDTO; spouses: MemberDTO[] }[];
}

/**
 * One sheet per couple the person is part of: each recorded marriage (with
 * the children the two share), and, apart, the children whose other parent
 * is not recorded. A marriage with no children still has its sheet.
 */
export function groupSheets(ix: FamilyIndex, personId: string): GroupSheet[] {
  const me = ix.get(personId);
  if (!me) return [];
  const sheets: GroupSheet[] = [];
  const kids = ix.children(me.id);
  const childEntry = (c: MemberDTO) => ({ person: c, spouses: ix.spouses(c.id).map((s) => s.person) });
  const make = (other: MemberDTO | null, marriage: MarriageDTO | null, children: MemberDTO[]): GroupSheet => {
    const herIsMe = me.gender === "FEMALE";
    const husband = herIsMe ? other : me;
    const wife = herIsMe ? me : other;
    return {
      husband, wife, marriage,
      husbandParents: husband ? ix.parents(husband.id) : {},
      wifeParents: wife ? ix.parents(wife.id) : {},
      children: children.map(childEntry),
    };
  };
  const covered = new Set<string>();
  for (const s of ix.spouses(me.id)) {
    const together = kids.filter((c) => (c.fatherId === me.id && c.motherId === s.person.id) || (c.motherId === me.id && c.fatherId === s.person.id));
    for (const c of together) covered.add(c.id);
    sheets.push(make(s.person, s.marriage, together));
  }
  // children with another parent recorded but no marriage recorded with them
  const byOther = new Map<string, MemberDTO[]>();
  for (const c of kids) {
    if (covered.has(c.id)) continue;
    const other = c.fatherId === me.id ? c.motherId : c.fatherId;
    const key = other ?? "";
    (byOther.get(key) ?? byOther.set(key, []).get(key)!).push(c);
  }
  for (const [other, list] of byOther) sheets.push(make(other ? ix.get(other) ?? null : null, null, list));
  return sheets;
}

export interface PedigreeNode {
  person: MemberDTO | null;
  /** Ahnentafel number of the slot (1 the subject); slots of unknown parents stay empty. */
  number: number;
  generation: number;
}

/** The pedigree's slots, generation by generation (2^(g-1) slots in generation g), filled where recorded. */
export function pedigree(ix: FamilyIndex, subjectId: string, generations = 4): PedigreeNode[][] {
  const levels: PedigreeNode[][] = [];
  let row: PedigreeNode[] = [{ person: ix.get(subjectId) ?? null, number: 1, generation: 1 }];
  for (let g = 1; g <= generations; g++) {
    levels.push(row);
    if (g === generations) break;
    row = row.flatMap((n) => [
      { person: n.person ? ix.get(n.person.fatherId) ?? null : null, number: 2 * n.number, generation: g + 1 },
      { person: n.person ? ix.get(n.person.motherId) ?? null : null, number: 2 * n.number + 1, generation: g + 1 },
    ]);
  }
  return levels;
}

export interface DescendantNode {
  person: MemberDTO;
  /** 1: the subject; 2: their children… */
  generation: number;
  children: DescendantNode[];
}

/**
 * The subject's descendants by birth, `generations` deep (the subject's own
 * generation counts as the first), eldest first. A descendant reached by
 * two lines (cousins' children) is drawn once, under the first.
 */
export function descendantTree(ix: FamilyIndex, subjectId: string, generations = 3): DescendantNode | null {
  const subject = ix.get(subjectId);
  if (!subject) return null;
  const seen = new Set([subject.id]);
  const build = (p: MemberDTO, gen: number): DescendantNode => ({
    person: p, generation: gen,
    children: gen >= generations ? [] : ix.children(p.id).filter((c) => !seen.has(c.id) && (seen.add(c.id), true)).map((c) => build(c, gen + 1)),
  });
  return build(subject, 1);
}

export interface TimelineEvent {
  year: number;
  kind: "birth" | "death" | "marriage";
  people: MemberDTO[];
}

/**
 * The family's dated events, oldest first: births, deaths and marriages
 * with a recorded year (nothing dated by guess). `among` limits them to a
 * set of people (a branch); a marriage counts when either spouse is in it.
 * Also how many people have no recorded year of birth, to say so.
 */
export function timeline(ix: FamilyIndex, marriages: readonly MarriageDTO[], among?: ReadonlySet<string>): { events: TimelineEvent[]; undatedBirths: number } {
  const inScope = (id: string) => !among || among.has(id);
  const events: TimelineEvent[] = [];
  let undatedBirths = 0;
  for (const m of ix.members) {
    if (!inScope(m.id)) continue;
    if (m.birthYear !== null) events.push({ year: m.birthYear, kind: "birth", people: [m] });
    else undatedBirths++;
    if (m.isDeceased && m.deathYear !== null) events.push({ year: m.deathYear, kind: "death", people: [m] });
  }
  for (const mar of marriages) {
    if (mar.startYear === null || !(inScope(mar.spouseAId) || inScope(mar.spouseBId))) continue;
    const a = ix.get(mar.spouseAId), b = ix.get(mar.spouseBId);
    if (a && b) events.push({ year: mar.startYear, kind: "marriage", people: [a, b] });
  }
  const order = { birth: 0, marriage: 1, death: 2 };
  events.sort((x, y) => x.year - y.year || order[x.kind] - order[y.kind]);
  return { events, undatedBirths };
}

export interface RegisterChild {
  person: MemberDTO;
  /** i, ii, iii… in birth order. */
  roman: string;
  /** The child's own number in the register, when they have a family of their own in it. */
  number: number | null;
}
export interface RegisterEntry {
  /** 1, 2, 3… in the order the register sets out the families. */
  number: number;
  person: MemberDTO;
  /** Generation in the register (1: the person it starts from). */
  generation: number;
  /** The line back to the start, as register numbers ("1 › 3 › 7"), nearest last. */
  line: number[];
  spouses: { person: MemberDTO; marriage: MarriageDTO }[];
  children: RegisterChild[];
  /** Titles of the sources cited for this person, each once. */
  sources: string[];
}

const ROMAN: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
export const roman = (n: number) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");

/**
 * The family register (the Register style of genealogical books): the
 * person and their descendants by birth, `generations` deep, generation by
 * generation. Each person with children of their own (within the depth)
 * gets a number and an entry; children are listed under their parents with
 * roman numerals, and those with an entry of their own carry its number.
 */
export function familyRegister(
  ix: FamilyIndex,
  tree: { sources: readonly { id: string; title: string }[]; citations: readonly { sourceId: string; memberId: string }[] },
  subjectId: string,
  generations = 4,
): RegisterEntry[] {
  const subject = ix.get(subjectId);
  if (!subject) return [];
  const sourceTitle = new Map(tree.sources.map((s) => [s.id, s.title]));
  const sourcesOf = (id: string) => [...new Set(tree.citations.filter((c) => c.memberId === id).map((c) => sourceTitle.get(c.sourceId)).filter((x): x is string => !!x))];
  const entries: RegisterEntry[] = [];
  const numberOf = new Map<string, number>();
  // generation by generation: a person gets an entry when they are the start, or have children within the depth
  let level: { person: MemberDTO; line: number[] }[] = [{ person: subject, line: [] }];
  const placed = new Set([subject.id]);
  for (let gen = 1; gen <= generations && level.length; gen++) {
    const next: { person: MemberDTO; line: number[] }[] = [];
    for (const { person, line } of level) {
      const kids = gen < generations ? ix.children(person.id).filter((c) => !placed.has(c.id)) : [];
      if (gen > 1 && !kids.length) continue;
      const number = entries.length + 1;
      numberOf.set(person.id, number);
      entries.push({
        number, person, generation: gen, line,
        spouses: ix.spouses(person.id).map((s) => ({ person: s.person, marriage: s.marriage })),
        children: [], sources: sourcesOf(person.id),
      });
      for (const c of kids) {
        placed.add(c.id);
        next.push({ person: c, line: [...line, number] });
      }
    }
    level = next;
  }
  // children, with the numbers their own entries were given
  for (const e of entries) {
    const kids = e.generation < generations ? ix.children(e.person.id) : [];
    e.children = kids.map((c, i) => ({ person: c, roman: roman(i + 1), number: numberOf.get(c.id) ?? null }));
  }
  return entries;
}
