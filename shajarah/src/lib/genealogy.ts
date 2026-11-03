import type { Lineage, MemberDTO } from "./types";

/** The parent whose branch a member grows from on the poster. */
export function lineageParentId(
  m: Pick<MemberDTO, "fatherId" | "motherId">,
  lineage: Lineage,
): string | null {
  return lineage === "MATRILINEAL"
    ? (m.motherId ?? m.fatherId)
    : (m.fatherId ?? m.motherId);
}

/**
 * The parent a member is drawn from on the poster: the lineage parent,
 * except when the other parent is one of `through` (a daughter whose family
 * the poster shows: her children are drawn from her, on dotted lines).
 */
export function posterParentId(
  m: Pick<MemberDTO, "fatherId" | "motherId">,
  lineage: Lineage,
  through?: ReadonlySet<string>,
  /**
   * The people of the line (lineIds): a child whose parent of the line is
   * one of them stays with that parent even when the other parent's family
   * is shown through her. That is the child of a cousin marriage: of the
   * line through the father, so never drawn as an outsider from the mother.
   */
  line?: ReadonlySet<string>,
): string | null {
  if (through?.size) {
    const other = lineage === "MATRILINEAL" ? m.fatherId : m.motherId;
    const own = lineageParentId(m, lineage);
    if (other && through.has(other) && !(own && line?.has(own))) return other;
  }
  return lineageParentId(m, lineage);
}

/**
 * The line's root among `members`: the tree's root when it is among them,
 * else the person (with no parent of the line among them) with the most
 * descendants through the lineage parent. Cycles in bad data count once.
 */
export function lineRootOf(members: MemberDTO[], lineage: Lineage, rootId: string | null | undefined): string | null {
  if (rootId && members.some((m) => m.id === rootId)) return rootId;
  const plain = childrenIndex(members, lineage);
  const memo = new Map<string, number>();
  const size = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    memo.set(id, 0);
    const n = 1 + (plain.get(id) ?? []).reduce((a, c) => a + size(c.id), 0);
    memo.set(id, n);
    return n;
  };
  return [...(plain.get(null) ?? [])].sort((a, b) => size(b.id) - size(a.id))[0]?.id ?? null;
}

/**
 * The people of the line: the root and everyone descended from them through
 * the lineage parent (fathers, or mothers in a maternal tree), each once
 * however many ways they are related.
 */
export function lineIds(members: readonly MemberDTO[], lineage: Lineage, rootId: string | null | undefined): Set<string> {
  const ids = new Set(members.map((m) => m.id));
  const kids = new Map<string, string[]>();
  for (const m of members) {
    const p = lineageParentId(m, lineage);
    if (p && ids.has(p)) kids.set(p, [...(kids.get(p) ?? []), m.id]);
  }
  const out = new Set<string>();
  const stack = rootId && ids.has(rootId) ? [rootId] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(kids.get(id) ?? []));
  }
  return out;
}

/** Map of parentId → children, ordered by birthOrder then birthYear. */
export function childrenIndex(members: MemberDTO[], lineage: Lineage, through?: ReadonlySet<string>, line?: ReadonlySet<string>) {
  const ids = new Set(members.map((m) => m.id));
  const index = new Map<string | null, MemberDTO[]>();
  for (const m of members) {
    let p = posterParentId(m, lineage, through, line);
    if (p && !ids.has(p)) p = null;
    const list = index.get(p) ?? [];
    list.push(m);
    index.set(p, list);
  }
  for (const list of index.values()) list.sort(compareSiblings);
  return index;
}

export function compareSiblings(a: MemberDTO, b: MemberDTO) {
  return (
    a.birthOrder - b.birthOrder ||
    (a.birthYear ?? 1e9) - (b.birthYear ?? 1e9) ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Everyone a poster leaves out for `hiddenIds` (people hidden from it): each
 * of them and all their descendants, through either parent, so a mother's
 * children by every husband go with her; and those who married into the
 * family only through them (no parents in the tree, every spouse and child
 * hidden). Never anyone in `keep` (the people the tree stands on), nor
 * anyone reached only through them.
 */
export function hiddenFromPoster(
  members: MemberDTO[], hiddenIds: readonly string[], keep: ReadonlySet<string> = new Set(),
  marriages: readonly { spouseAId: string; spouseBId: string }[] = [],
): Set<string> {
  const hidden = new Set<string>();
  if (!hiddenIds.length) return hidden;
  const children = new Map<string, MemberDTO[]>();
  for (const m of members) {
    for (const p of [m.fatherId, m.motherId]) if (p) children.set(p, [...(children.get(p) ?? []), m]);
  }
  const ids = new Set(members.map((m) => m.id));
  const queue = hiddenIds.filter((id) => ids.has(id) && !keep.has(id));
  for (const id of queue) hidden.add(id);
  for (let i = 0; i < queue.length; i++) {
    for (const c of children.get(queue[i]) ?? []) {
      if (hidden.has(c.id) || keep.has(c.id)) continue;
      hidden.add(c.id);
      queue.push(c.id);
    }
  }
  // in-laws of the hidden: partners by marriage or by a child together
  const partners = new Map<string, Set<string>>();
  const link = (a: string | null, b: string | null) => {
    if (!a || !b) return;
    partners.set(a, (partners.get(a) ?? new Set()).add(b));
    partners.set(b, (partners.get(b) ?? new Set()).add(a));
  };
  for (const x of marriages) link(x.spouseAId, x.spouseBId);
  for (const m of members) link(m.fatherId, m.motherId);
  for (const m of members) {
    if (hidden.has(m.id) || keep.has(m.id) || m.fatherId || m.motherId) continue;
    const ps = partners.get(m.id);
    if (ps?.size && [...ps].every((p) => hidden.has(p)) && (children.get(m.id) ?? []).every((c) => hidden.has(c.id))) hidden.add(m.id);
  }
  return hidden;
}

/** The people given and all their ancestors, through both parents (whom hiding must never take away). */
export function withAncestors(members: MemberDTO[], ids: readonly (string | null | undefined)[]): Set<string> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const out = new Set<string>();
  const queue = ids.filter((id): id is string => !!id && byId.has(id));
  while (queue.length) {
    const id = queue.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const m = byId.get(id)!;
    for (const p of [m.fatherId, m.motherId]) if (p && byId.has(p) && !out.has(p)) queue.push(p);
  }
  return out;
}

/**
 * A person and their brothers and sisters (the children of the same lineage
 * parent, half-siblings included), eldest first. Only the person when their
 * lineage parent is not recorded.
 */
export function siblingsInOrder(members: MemberDTO[], lineage: Lineage, id: string): MemberDTO[] {
  const me = members.find((m) => m.id === id);
  if (!me) return [];
  const parent = lineageParentId(me, lineage);
  if (!parent) return [me];
  return members.filter((m) => lineageParentId(m, lineage) === parent).sort(compareSiblings);
}

/**
 * The birth orders that put `id` at `position` (0 = eldest) among their
 * brothers and sisters, the others keeping their order: every sibling
 * renumbered 0, 1, 2 … (so repeated or skipped numbers are tidied too).
 * Only the members whose number changes.
 */
export function moveAmongSiblings(
  members: MemberDTO[], lineage: Lineage, id: string, position: number,
): { id: string; birthOrder: number }[] {
  const list = siblingsInOrder(members, lineage, id);
  const from = list.findIndex((m) => m.id === id);
  if (from < 0) return [];
  const [me] = list.splice(from, 1);
  list.splice(Math.max(0, Math.min(list.length, position)), 0, me);
  return list.flatMap((m, i) => (m.birthOrder === i ? [] : [{ id: m.id, birthOrder: i }]));
}

/**
 * Generation number for every member: 0 for members without a lineage
 * parent, otherwise parent + 1. Iterative so very deep trees cannot blow the
 * stack, and cycle-safe (members caught in a cycle keep generation 0).
 */
export function computeGenerations(
  members: MemberDTO[],
  lineage: Lineage,
): Map<string, number> {
  const index = childrenIndex(members, lineage);
  const gen = new Map<string, number>();
  const queue: MemberDTO[] = [...(index.get(null) ?? [])];
  for (const m of queue) gen.set(m.id, 0);
  for (let i = 0; i < queue.length; i++) {
    const m = queue[i];
    for (const c of index.get(m.id) ?? []) {
      if (gen.has(c.id)) continue;
      gen.set(c.id, gen.get(m.id)! + 1);
      queue.push(c);
    }
  }
  for (const m of members) if (!gen.has(m.id)) gen.set(m.id, 0);
  return gen;
}

/** True when `ancestorId` appears among the ancestors of `memberId` (any parent). */
export function isAncestor(
  members: MemberDTO[],
  ancestorId: string,
  memberId: string,
): boolean {
  const byId = new Map(members.map((m) => [m.id, m]));
  const stack = [memberId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const m = byId.get(id);
    if (!m) continue;
    for (const p of [m.fatherId, m.motherId]) {
      if (!p) continue;
      if (p === ancestorId) return true;
      stack.push(p);
    }
  }
  return false;
}

/** Validates a proposed parent assignment; returns an error message or null. */
export function parentAssignmentError(
  members: MemberDTO[],
  memberId: string | null,
  parentId: string | null | undefined,
  role: "father" | "mother",
): string | null {
  if (!parentId) return null;
  const parent = members.find((m) => m.id === parentId);
  if (!parent) return `The selected ${role} is not in this tree.`;
  if (memberId && parentId === memberId) return "A member cannot be their own parent.";
  if (role === "father" && parent.gender === "FEMALE") return "The father must not be female.";
  if (role === "mother" && parent.gender === "MALE") return "The mother must not be male.";
  if (memberId && isAncestor(members, memberId, parentId)) {
    return `That ${role} is a descendant of this member, which would create a loop.`;
  }
  return null;
}

/** "نصار بن ثويني بن فارس" style patronymic chain (up to `depth` ancestors). */
export function nasab(members: MemberDTO[], id: string, depth = 4): string {
  const byId = new Map(members.map((m) => [m.id, m]));
  const parts: string[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  const female = byId.get(id)?.gender === "FEMALE";
  while (cur && parts.length <= depth && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.push(cur.name);
    cur = cur.fatherId ? byId.get(cur.fatherId) : undefined;
  }
  // a woman is بنت her father; her father and his are بن theirs
  return parts.map((p, i) => (i === 0 ? p : `${i === 1 && female ? "بنت" : "بن"} ${p}`)).join(" ");
}

/**
 * A member's direct line: every ancestor (through the lineage parent, up to
 * the root) and every descendant (through the lineage). Siblings, cousins
 * and half-siblings are not on it. Used to highlight a person's line.
 */
export function lineagePath(members: MemberDTO[], lineage: Lineage, memberId: string, through?: ReadonlySet<string>, line?: ReadonlySet<string>) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const ancestors: string[] = [];
  const seen = new Set<string>([memberId]);
  let cur = byId.get(memberId);
  while (cur) {
    const p = posterParentId(cur, lineage, through, line);
    if (!p || seen.has(p)) break;
    ancestors.push(p);
    seen.add(p);
    cur = byId.get(p);
  }
  const index = childrenIndex(members, lineage, through, line);
  const descendants: string[] = [];
  const stack = [...(index.get(memberId) ?? [])];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    descendants.push(c.id);
    stack.push(...(index.get(c.id) ?? []));
  }
  return { ancestors, descendants };
}

/**
 * Pedigree collapse: each of a person's ancestors (through fathers and
 * mothers) with the number of distinct lines from the person up to them.
 * More than one is legitimate genealogy (parents who were cousins share
 * grandparents), never a duplicate: the ancestor is one person, reached by
 * several paths.
 */
export function ancestorPaths(members: readonly Pick<MemberDTO, "id" | "fatherId" | "motherId">[], id: string): Map<string, number> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const paths = new Map<string, number>();
  // (memoised per person: how many lines from them reach each ancestor)
  const memo = new Map<string, Map<string, number>>();
  const visiting = new Set<string>();
  const up = (pid: string): Map<string, number> => {
    if (memo.has(pid)) return memo.get(pid)!;
    const out = new Map<string, number>();
    if (visiting.has(pid)) return out; // (a cycle in bad data)
    visiting.add(pid);
    const p = byId.get(pid);
    for (const parent of [p?.fatherId, p?.motherId]) {
      if (!parent || !byId.has(parent)) continue;
      out.set(parent, (out.get(parent) ?? 0) + 1);
      for (const [a, n] of up(parent)) out.set(a, (out.get(a) ?? 0) + n);
    }
    visiting.delete(pid);
    memo.set(pid, out);
    return out;
  };
  for (const [a, n] of up(id)) paths.set(a, n);
  return paths;
}
