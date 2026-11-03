// Record completeness and consistency (docs/milestone-1.md, 1b): what each
// person's record holds and lacks, and what looks wrong, each finding
// labelled for what it is. It reports; it never changes a record, and it
// never treats a guess as a fact.
//
//  missing    information not recorded (a birth year, a parent, a source)
//  possible   a potential inconsistency or duplicate: worth a look, may be right
//  confirmed  impossible as recorded (a death before the birth)
//
// Only fields the current records hold are judged. Places, full dates and
// biographies separate from notes need the proposed schema additions
// (docs/schema-proposal.md) and are not reported as missing until then.

import { normalizeName } from "../nasab";
import type { MemberDTO, TreeDTO } from "../types";
import { nasabIn, type FamilyIndex } from "./index";

export type FindingLevel = "missing" | "possible" | "confirmed";
export type FindingKind =
  | "no-gender" | "no-birth-year" | "no-death-year" | "no-father" | "no-mother" | "no-marriage-year" | "no-notes" | "no-source"
  | "death-before-birth" | "child-before-parent" | "own-ancestor" | "marriage-ends-before-start"
  | "young-parent" | "old-parent" | "born-after-father-died" | "born-after-mother-died" | "married-young"
  | "death-year-but-living" | "likely-deceased" | "possible-duplicate";

export interface Finding {
  kind: FindingKind;
  level: FindingLevel;
  memberId: string;
  /** Others involved (the parent, the possible duplicate). */
  otherIds?: string[];
  /** The figures that raised it, for the explanation ("aged 9 at the birth"). */
  detail?: Record<string, number | string>;
}

/** The category a field counts towards in a branch's completeness. */
export type FieldArea = "personal" | "relationships" | "history";

export interface FieldCheck {
  kind: FindingKind;
  area: FieldArea;
  /** Whether the field applies to this person at all (a death year to the living does not). */
  applies: boolean;
  recorded: boolean;
}

// (thresholds for the "possible" findings: wide, so that only the unusual is raised)
export const LIMITS = { youngParent: 12, oldFather: 80, oldMother: 55, marriedYoung: 12, likelyDeceasedAge: 110 };

/** Each field of a person's record that completeness looks at, with whether it applies and is recorded. */
export function fieldChecks(ix: FamilyIndex, m: MemberDTO, cited: ReadonlySet<string>): FieldCheck[] {
  const g = ix.generations.get(m.id);
  const ofFamily = g?.kind === "level";
  const marriages = ix.spouses(m.id);
  return [
    { kind: "no-gender", area: "personal", applies: true, recorded: m.gender !== "UNKNOWN" },
    { kind: "no-birth-year", area: "personal", applies: true, recorded: m.birthYear !== null },
    { kind: "no-death-year", area: "personal", applies: m.isDeceased, recorded: m.deathYear !== null },
    // (parents: expected of the family's own people, below its oldest recorded ancestor)
    { kind: "no-father", area: "relationships", applies: ofFamily && m.id !== ix.tree.rootMemberId, recorded: !!m.fatherId },
    { kind: "no-mother", area: "relationships", applies: ofFamily && m.id !== ix.tree.rootMemberId, recorded: !!m.motherId },
    { kind: "no-marriage-year", area: "relationships", applies: marriages.length > 0, recorded: marriages.every((s) => s.marriage.startYear !== null) },
    { kind: "no-notes", area: "history", applies: true, recorded: !!m.notes?.trim() },
    { kind: "no-source", area: "history", applies: true, recorded: cited.has(m.id) },
  ];
}

/** Every finding for the tree: what is missing, what may be wrong, what cannot be right. */
export function findings(ix: FamilyIndex, tree: Pick<TreeDTO, "citations">, now = new Date().getFullYear()): Finding[] {
  const out: Finding[] = [];
  const cited = new Set(tree.citations.map((c) => c.memberId));
  for (const m of ix.members) {
    for (const f of fieldChecks(ix, m, cited)) if (f.applies && !f.recorded) out.push({ kind: f.kind, level: "missing", memberId: m.id });

    if (m.birthYear !== null && m.deathYear !== null && m.deathYear < m.birthYear) {
      out.push({ kind: "death-before-birth", level: "confirmed", memberId: m.id, detail: { born: m.birthYear, died: m.deathYear } });
    }
    if (m.deathYear !== null && !m.isDeceased) out.push({ kind: "death-year-but-living", level: "possible", memberId: m.id, detail: { died: m.deathYear } });
    if (!m.isDeceased && m.deathYear === null && m.birthYear !== null && now - m.birthYear > LIMITS.likelyDeceasedAge) {
      out.push({ kind: "likely-deceased", level: "possible", memberId: m.id, detail: { born: m.birthYear, age: now - m.birthYear } });
    }
    if (ix.inCycle(m.id)) out.push({ kind: "own-ancestor", level: "confirmed", memberId: m.id });

    const { father, mother } = ix.parents(m.id);
    for (const [p, role] of [[father, "father"], [mother, "mother"]] as const) {
      if (!p || m.birthYear === null) continue;
      if (p.birthYear !== null) {
        const age = m.birthYear - p.birthYear;
        if (age < 0) out.push({ kind: "child-before-parent", level: "confirmed", memberId: m.id, otherIds: [p.id], detail: { born: m.birthYear, parentBorn: p.birthYear } });
        else if (age < LIMITS.youngParent) out.push({ kind: "young-parent", level: "possible", memberId: m.id, otherIds: [p.id], detail: { age } });
        else if (age > (role === "father" ? LIMITS.oldFather : LIMITS.oldMother)) out.push({ kind: "old-parent", level: "possible", memberId: m.id, otherIds: [p.id], detail: { age } });
      }
      // (a father may die before a birth, but not by more than a year; a mother not at all)
      if (p.deathYear !== null && m.birthYear > p.deathYear + (role === "father" ? 1 : 0)) {
        out.push({ kind: role === "father" ? "born-after-father-died" : "born-after-mother-died", level: "possible", memberId: m.id, otherIds: [p.id], detail: { born: m.birthYear, parentDied: p.deathYear } });
      }
    }
    for (const s of ix.spouses(m.id)) {
      if (s.marriage.spouseAId !== m.id) continue; // (each marriage once)
      const { startYear, endYear } = s.marriage;
      if (startYear !== null && endYear !== null && endYear < startYear) {
        out.push({ kind: "marriage-ends-before-start", level: "confirmed", memberId: m.id, otherIds: [s.person.id], detail: { start: startYear, end: endYear } });
      }
      for (const who of [m, s.person]) {
        if (startYear !== null && who.birthYear !== null && startYear - who.birthYear < LIMITS.marriedYoung) {
          out.push({ kind: "married-young", level: "possible", memberId: who.id, otherIds: [who === m ? s.person.id : m.id], detail: { age: startYear - who.birthYear } });
        }
      }
    }
  }
  out.push(...possibleDuplicates(ix));
  return out;
}

/**
 * People who may be recorded twice: the same name (letters normalised) and
 * the same recorded father or mother; or the same name and laqab with birth
 * years within two of each other and no parent recorded that tells them
 * apart. Brothers given the same name (it happens) are kept apart when
 * their birth years differ by more than two.
 */
export function possibleDuplicates(ix: FamilyIndex): Finding[] {
  const groups = new Map<string, MemberDTO[]>();
  for (const m of ix.members) {
    const key = normalizeName(m.name);
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
  }
  const out: Finding[] = [];
  const seen = new Set<string>();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const pair = [a.id, b.id].sort().join("|");
        if (seen.has(pair) || a.gender !== b.gender && a.gender !== "UNKNOWN" && b.gender !== "UNKNOWN") continue;
        const sharedParent = (!!a.fatherId && a.fatherId === b.fatherId) || (!!a.motherId && a.motherId === b.motherId);
        const differentParents = (!!a.fatherId && !!b.fatherId && a.fatherId !== b.fatherId) || (!!a.motherId && !!b.motherId && a.motherId !== b.motherId);
        const yearsClose = a.birthYear === null || b.birthYear === null || Math.abs(a.birthYear - b.birthYear) <= 2;
        const sameLaqab = normalizeName(a.laqab ?? "") === normalizeName(b.laqab ?? "");
        if ((sharedParent && yearsClose) || (!differentParents && !sharedParent && sameLaqab && yearsClose && a.birthYear !== null && b.birthYear !== null)) {
          seen.add(pair);
          out.push({ kind: "possible-duplicate", level: "possible", memberId: a.id, otherIds: [b.id], detail: { name: a.name } });
        }
      }
    }
  }
  return out;
}

export interface Completeness {
  people: number;
  /** For each area, the share (0–1) of applicable fields recorded, and how many applied. */
  areas: Record<FieldArea, { recorded: number; applicable: number; share: number }>;
  /** Each field: how many it applied to and how many lacked it. */
  fields: Partial<Record<FindingKind, { applicable: number; missing: number }>>;
}

/** How complete the records of a set of people are (a branch, or the whole family). */
export function completenessOf(ix: FamilyIndex, tree: Pick<TreeDTO, "citations">, ids: Iterable<string>): Completeness {
  const cited = new Set(tree.citations.map((c) => c.memberId));
  const areas: Completeness["areas"] = {
    personal: { recorded: 0, applicable: 0, share: 1 },
    relationships: { recorded: 0, applicable: 0, share: 1 },
    history: { recorded: 0, applicable: 0, share: 1 },
  };
  const fields: Completeness["fields"] = {};
  let people = 0;
  for (const id of ids) {
    const m = ix.get(id);
    if (!m) continue;
    people++;
    for (const f of fieldChecks(ix, m, cited)) {
      if (!f.applies) continue;
      const a = areas[f.area];
      a.applicable++;
      if (f.recorded) a.recorded++;
      const s = fields[f.kind] ?? (fields[f.kind] = { applicable: 0, missing: 0 });
      s.applicable++;
      if (!f.recorded) s.missing++;
    }
  }
  for (const a of Object.values(areas)) a.share = a.applicable ? a.recorded / a.applicable : 1;
  return { people, areas, fields };
}

/** Each main branch's people (the branch head and everyone descended from them by birth). */
export function branchMembers(ix: FamilyIndex): { head: MemberDTO; ids: string[] }[] {
  return ix.branchHeads().map((head) => ({ head, ids: [head.id, ...ix.descendants(head.id)] }));
}

/** A person's name with their line (for lists of findings and results). */
export const displayName = (ix: FamilyIndex, id: string) => nasabIn(ix, id, 2);
