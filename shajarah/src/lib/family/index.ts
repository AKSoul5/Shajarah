// The family engine's index (docs/milestone-1.md, 1b): everything the
// profile, search, completeness and every chart ask about a family, built
// once per version of the tree from the records as they are. It never
// changes a record and never guesses one.
//
// Only birth links (fatherId, motherId) make parents and children. Step
// relations are derived (the spouse of a parent who is not one's other
// parent) and always labelled as such.

import { compareSiblings } from "../genealogy";
import type { MarriageDTO, MemberDTO, TreeDTO } from "../types";
import { generationLevels, referenceIdOf, type GenerationStatus } from "./generations";

export interface SpouseLink {
  person: MemberDTO;
  marriage: MarriageDTO;
}

export interface Siblings {
  /** Same father and same mother, both recorded. */
  full: MemberDTO[];
  /** Same father; the mother differs (both recorded). */
  paternal: MemberDTO[];
  /** Same mother; the father differs (both recorded). */
  maternal: MemberDTO[];
  /** One parent shared and the other not recorded for one of them: full or half cannot be told. */
  unknown: MemberDTO[];
}

export interface FamilyIndex {
  tree: Pick<TreeDTO, "id" | "lineage" | "rootMemberId" | "crownBaseId" | "settings">;
  members: readonly MemberDTO[];
  byId: ReadonlyMap<string, MemberDTO>;
  referenceId: string | null;
  generations: ReadonlyMap<string, GenerationStatus>;
  get(id: string | null | undefined): MemberDTO | undefined;
  parents(id: string): { father?: MemberDTO; mother?: MemberDTO };
  /** Birth children (by either parent), eldest first. */
  children(id: string): MemberDTO[];
  /** Each recorded marriage, in order of its start year where known. */
  spouses(id: string): SpouseLink[];
  siblings(id: string): Siblings;
  grandparents(id: string): MemberDTO[];
  grandchildren(id: string): MemberDTO[];
  /** Spouses of one's birth parents who are not one's other birth parent (derived, not recorded). */
  stepParents(id: string): MemberDTO[];
  /** Children of one's spouses who are not one's own (derived). */
  stepChildren(id: string): MemberDTO[];
  /** Brothers and sisters of one's parents (and their half-siblings), by side. */
  parentsSiblings(id: string): { paternal: MemberDTO[]; maternal: MemberDTO[] };
  /** Children of one's parents' brothers and sisters. */
  firstCousins(id: string): MemberDTO[];
  /** Children of one's brothers and sisters (full and half). */
  nephewsNieces(id: string): MemberDTO[];
  /** The line of traced parents upward (father's father… in a paternal tree), nearest first. */
  lineage(id: string): MemberDTO[];
  /** Everyone descended from the person by birth, each once, however many paths lead to them. */
  descendants(id: string): Set<string>;
  /** Whether the records make the person their own ancestor (an error in the data). */
  inCycle(id: string): boolean;
  /** How many generations of descendants are recorded below the person (0: none). */
  depthBelow(id: string): number;
  /** The main branches: the reference person's children. */
  branchHeads(): MemberDTO[];
  /** Which main branches the person descends from (the traced one first); empty for those not descended from one. */
  branchesOf(id: string): MemberDTO[];
}

const byStart = (a: SpouseLink, b: SpouseLink) => (a.marriage.startYear ?? 1e9) - (b.marriage.startYear ?? 1e9);

export function buildFamilyIndex(tree: Pick<TreeDTO, "id" | "members" | "marriages" | "lineage" | "rootMemberId" | "crownBaseId" | "settings">): FamilyIndex {
  const members = tree.members;
  const byId = new Map(members.map((m) => [m.id, m]));
  const get = (id: string | null | undefined) => (id ? byId.get(id) : undefined);
  const kids = new Map<string, MemberDTO[]>();
  for (const m of members) {
    for (const p of new Set([m.fatherId, m.motherId])) {
      if (!p || !byId.has(p) || p === m.id) continue;
      (kids.get(p) ?? kids.set(p, []).get(p)!).push(m);
    }
  }
  for (const list of kids.values()) list.sort(compareSiblings);
  const marriagesOf = new Map<string, SpouseLink[]>();
  for (const mar of tree.marriages) {
    const a = byId.get(mar.spouseAId), b = byId.get(mar.spouseBId);
    if (!a || !b) continue;
    (marriagesOf.get(a.id) ?? marriagesOf.set(a.id, []).get(a.id)!).push({ person: b, marriage: mar });
    (marriagesOf.get(b.id) ?? marriagesOf.set(b.id, []).get(b.id)!).push({ person: a, marriage: mar });
  }
  for (const list of marriagesOf.values()) list.sort(byStart);

  const referenceId = referenceIdOf(tree);
  const generations = generationLevels(members, tree.lineage, referenceId, tree.marriages);
  const traced = (m: MemberDTO) => (tree.lineage === "MATRILINEAL" ? m.motherId : m.fatherId);
  const other = (m: MemberDTO) => (tree.lineage === "MATRILINEAL" ? m.fatherId : m.motherId);

  const children = (id: string) => kids.get(id) ?? [];
  const parents = (id: string) => {
    const m = byId.get(id);
    return { father: get(m?.fatherId), mother: get(m?.motherId) };
  };
  const unique = (list: MemberDTO[], not: Set<string> = new Set()) => {
    const seen = new Set(not);
    return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  };

  const siblings = (id: string): Siblings => {
    const me = byId.get(id);
    const out: Siblings = { full: [], paternal: [], maternal: [], unknown: [] };
    if (!me) return out;
    const pool = unique([...children(me.fatherId ?? ""), ...children(me.motherId ?? "")], new Set([id]));
    for (const s of pool) {
      const sameFather = !!me.fatherId && s.fatherId === me.fatherId;
      const sameMother = !!me.motherId && s.motherId === me.motherId;
      if (sameFather && sameMother) out.full.push(s);
      else if (sameFather) (me.motherId && s.motherId ? out.paternal : out.unknown).push(s);
      else if (sameMother) (me.fatherId && s.fatherId ? out.maternal : out.unknown).push(s);
    }
    for (const list of Object.values(out)) list.sort(compareSiblings);
    return out;
  };
  const allSiblings = (id: string) => {
    const s = siblings(id);
    return [...s.full, ...s.paternal, ...s.maternal, ...s.unknown];
  };
  const spouses = (id: string) => marriagesOf.get(id) ?? [];
  const grandparents = (id: string) => {
    const { father, mother } = parents(id);
    return unique([father, mother].flatMap((p) => (p ? [get(p.fatherId), get(p.motherId)] : [])).filter((x): x is MemberDTO => !!x));
  };
  const grandchildren = (id: string) => unique(children(id).flatMap((c) => children(c.id)));
  const stepParents = (id: string) => {
    const me = byId.get(id);
    if (!me) return [];
    const birth = new Set([me.fatherId, me.motherId].filter(Boolean));
    return unique([me.fatherId, me.motherId].flatMap((p) => (p ? spouses(p).map((s) => s.person) : [])).filter((s) => !birth.has(s.id)), new Set([id]));
  };
  const stepChildren = (id: string) => {
    const own = new Set(children(id).map((c) => c.id));
    return unique(spouses(id).flatMap((s) => children(s.person.id)).filter((c) => !own.has(c.id)), new Set([id]));
  };
  const parentsSiblings = (id: string) => {
    const { father, mother } = parents(id);
    return { paternal: father ? allSiblings(father.id) : [], maternal: mother ? allSiblings(mother.id) : [] };
  };
  const firstCousins = (id: string) => {
    const ps = parentsSiblings(id);
    const sibs = new Set(allSiblings(id).map((s) => s.id));
    return unique([...ps.paternal, ...ps.maternal].flatMap((u) => children(u.id)).filter((c) => !sibs.has(c.id)), new Set([id]));
  };
  const nephewsNieces = (id: string) => unique(allSiblings(id).flatMap((s) => children(s.id)));
  const lineage = (id: string) => {
    const out: MemberDTO[] = [];
    const seen = new Set([id]);
    let m = byId.get(id);
    while (m) {
      const p = get(traced(m)) ?? get(other(m) && !traced(m) ? other(m) : null);
      if (!p || seen.has(p.id)) break;
      seen.add(p.id);
      out.push(p);
      m = p;
    }
    return out;
  };

  const descendantsCache = new Map<string, Set<string>>();
  const cyclic = new Set<string>();
  const descendants = (id: string) => {
    const hit = descendantsCache.get(id);
    if (hit) return hit;
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      for (const c of children(stack.pop()!)) {
        if (c.id === id) cyclic.add(id);
        if (c.id === id || seen.has(c.id)) continue;
        seen.add(c.id);
        stack.push(c.id);
      }
    }
    descendantsCache.set(id, seen);
    return seen;
  };
  const depthCache = new Map<string, number>();
  const depthBelow = (id: string): number => {
    const hit = depthCache.get(id);
    if (hit !== undefined) return hit;
    // (breadth-first by generation: a cycle in bad data cannot loop)
    let depth = 0;
    let frontier = [id];
    const seen = new Set([id]);
    while (frontier.length) {
      const next = frontier.flatMap((x) => children(x).filter((c) => !seen.has(c.id)).map((c) => (seen.add(c.id), c.id)));
      if (!next.length) break;
      depth++;
      frontier = next;
    }
    depthCache.set(id, depth);
    return depth;
  };

  const heads = referenceId ? children(referenceId) : [];
  const headIds = new Set(heads.map((h) => h.id));
  const branchCache = new Map<string, MemberDTO[]>();
  const branchesOf = (id: string): MemberDTO[] => {
    const hit = branchCache.get(id);
    if (hit) return hit;
    branchCache.set(id, []); // (cycle guard)
    const m = byId.get(id);
    let out: MemberDTO[] = [];
    if (m && id !== referenceId) {
      if (headIds.has(id)) out = [m];
      else {
        // the traced parent's branch first, then the other's (a daughter's children: hers)
        const t = traced(m), o = other(m);
        out = unique([...(t ? branchesOf(t) : []), ...(o ? branchesOf(o) : [])]);
      }
    }
    branchCache.set(id, out);
    return out;
  };

  return {
    tree, members, byId, referenceId, generations, get, parents, children, spouses, siblings, grandparents, grandchildren,
    stepParents, stepChildren, parentsSiblings, firstCousins, nephewsNieces, lineage, descendants, depthBelow,
    inCycle: (id) => (descendants(id), cyclic.has(id)),
    branchHeads: () => heads, branchesOf,
  };
}

/**
 * The person's nasab, exactly as genealogy.nasab writes it ("سالم بن محمد
 * بن علي"; a woman بنت her father), from the index's lookup instead of a
 * new one per call (for lists of thousands).
 */
export function nasabIn(ix: Pick<FamilyIndex, "byId">, id: string, depth = 4): string {
  const parts: string[] = [];
  let cur = ix.byId.get(id);
  const seen = new Set<string>();
  const female = cur?.gender === "FEMALE";
  while (cur && parts.length <= depth && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.push(cur.name);
    cur = cur.fatherId ? ix.byId.get(cur.fatherId) : undefined;
  }
  return parts.map((p, i) => (i === 0 ? p : `${i === 1 && female ? "بنت" : "بن"} ${p}`)).join(" ");
}
