// People search with combined filters (docs/milestone-1.md, 1b): every
// criterion narrows the same result, so filters work together. The text of
// each person is prepared once per version of the tree, so a search over
// tens of thousands of people answers at typing speed.

import { normalizeName } from "../nasab";
import type { Gender, MemberDTO, TreeDTO } from "../types";
import { nasabIn, type FamilyIndex } from "./index";
import { fieldChecks, type FindingKind } from "./quality";

export interface PeopleQuery {
  /** Names, in Arabic or English letters: every word must be found in the person's name, line (nasab) or laqab. */
  text?: string;
  gender?: Gender;
  /** "living": not recorded as deceased; "deceased": recorded as deceased. */
  status?: "living" | "deceased";
  /** Generation numbers (1 = the reference person's generation), inclusive. */
  generationFrom?: number;
  generationTo?: number;
  /** Also people who married into the family (default: only blood relatives when a generation range is set). */
  includeSpouses?: boolean;
  /** A main branch, by its head's id. */
  branchId?: string;
  bornFrom?: number;
  bornTo?: number;
  diedFrom?: number;
  diedTo?: number;
  /** Only people missing this field (or any field, with "any"). */
  missing?: FindingKind | "any";
}

export interface PeopleSearch {
  run(q: PeopleQuery): MemberDTO[];
}

/** Prepares a family for searching; `run` then filters it. */
export function peopleSearch(ix: FamilyIndex, tree: Pick<TreeDTO, "citations">): PeopleSearch {
  const cited = new Set(tree.citations.map((c) => c.memberId));
  const text = new Map<string, string>();
  for (const m of ix.members) {
    text.set(m.id, normalizeName([nasabIn(ix, m.id, 4), m.laqab ?? ""].join(" ")));
  }
  const missingOf = (m: MemberDTO) => fieldChecks(ix, m, cited).filter((f) => f.applies && !f.recorded).map((f) => f.kind);
  return {
    run(q) {
      const words = q.text ? q.text.split(/\s+/).map(normalizeName).filter(Boolean) : [];
      const branch = q.branchId ? ix.get(q.branchId) : undefined;
      const inRange = (v: number | null, from?: number, to?: number) =>
        from === undefined && to === undefined ? true : v !== null && (from === undefined || v >= from) && (to === undefined || v <= to);
      const out: MemberDTO[] = [];
      for (const m of ix.members) {
        if (q.gender && m.gender !== q.gender) continue;
        if (q.status === "living" && m.isDeceased) continue;
        if (q.status === "deceased" && !m.isDeceased) continue;
        if (q.generationFrom !== undefined || q.generationTo !== undefined) {
          const g = ix.generations.get(m.id);
          const level = g?.kind === "level" ? g.level : g?.kind === "spouse" && q.includeSpouses ? g.partnerLevels[0] : null;
          if (!inRange(level, q.generationFrom, q.generationTo)) continue;
        }
        if (branch && !ix.branchesOf(m.id).some((b) => b.id === branch.id)) {
          // (a spouse counts with the branch they married into, when asked for)
          if (!(q.includeSpouses && ix.spouses(m.id).some((s) => ix.branchesOf(s.person.id).some((b) => b.id === branch.id)))) continue;
        }
        if (!inRange(m.birthYear, q.bornFrom, q.bornTo)) continue;
        if (!inRange(m.deathYear, q.diedFrom, q.diedTo)) continue;
        if (q.missing) {
          const gaps = missingOf(m);
          if (q.missing === "any" ? !gaps.length : !gaps.includes(q.missing)) continue;
        }
        if (words.length) {
          const t = text.get(m.id)!;
          if (!words.every((w) => t.includes(w))) continue;
        }
        out.push(m);
      }
      return out;
    },
  };
}
