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
