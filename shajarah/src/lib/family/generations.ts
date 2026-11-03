// Generation numbers (docs/generation-numbering.md): how many parent–child
// steps each person stands from the family's reference generation, the
// same number wherever the person appears.
//
// Only birth links count (fatherId, motherId). Marriages never add a
// generation. A number is never guessed: a person no birth link connects
// to the reference person has none, and says why.

import type { Lineage, MemberDTO, TreeDTO } from "../types";

export type GenerationStatus =
  /** A blood relative: `level` 1 is the reference person's generation, 2 their children's, 0 their parents'. */
  | { kind: "level"; level: number; via: "father" | "mother" | "reference" | "ancestor"; alt?: { level: number; via: "father" | "mother" } }
  /** No birth link to the family, married to one or more who have: their partners' levels. */
  | { kind: "spouse"; partnerLevels: number[] }
  /** No birth link to the reference person, and not married to anyone who has. */
  | { kind: "unrelated" };

type Person = Pick<MemberDTO, "id" | "fatherId" | "motherId">;

/**
 * Who is Generation 1: the tree's chosen reference person; else the person
 * the canopy starts from (the family's founder as the poster presents it);
 * else the tree's root. Generation 1 belongs to the family, never to one
 * poster: a branch poster or a focus keeps the family's numbers, older
 * generations before it (−1, −2, …).
 */
export function referenceIdOf(tree: Pick<TreeDTO, "settings" | "crownBaseId" | "rootMemberId" | "members">): string | null {
  const ids = new Set(tree.members.map((m) => m.id));
  for (const id of [tree.settings?.referenceId, tree.crownBaseId, tree.rootMemberId]) {
    if (id && ids.has(id)) return id;
  }
  return tree.members[0]?.id ?? null;
}

/**
 * Every person's generation status, counted from `referenceId`.
 *
 * 1. The reference person is level 1; each of their ancestors (on both
 *    sides) one less per step, by the nearest path (the traced parent's
 *    first, when two are as near).
 * 2. Everyone else, parents before children: one more than the traced
 *    parent (the father in a paternal tree) when that parent has a level,
 *    else one more than the other parent. So a daughter's children,
 *    whose father is from another family or not recorded, follow her.
 *    When both parents have levels that disagree, the traced parent's
 *    is kept and the other recorded.
 * 3. A person still without a level who is married to someone with one is
 *    a spouse; anyone else is unrelated.
 *
 * Linear in people and links; safe on cycles in bad data (a person in a
 * cycle is left unrelated rather than looping).
 */
export function generationLevels(
  members: readonly Person[],
  lineage: Lineage,
  referenceId: string | null,
  marriages: readonly { spouseAId: string; spouseBId: string }[] = [],
): Map<string, GenerationStatus> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const traced = (m: Person) => (lineage === "MATRILINEAL" ? m.motherId : m.fatherId);
  const other = (m: Person) => (lineage === "MATRILINEAL" ? m.fatherId : m.motherId);
  const tracedRole: "father" | "mother" = lineage === "MATRILINEAL" ? "mother" : "father";
  const otherRole: "father" | "mother" = tracedRole === "father" ? "mother" : "father";
  const out = new Map<string, GenerationStatus>();
  const level = new Map<string, number>();

  // 1. The reference person and their ancestors (breadth-first: the
  // nearest path wins; the traced parent is visited first).
  const ref = referenceId && byId.has(referenceId) ? referenceId : null;
  if (ref) {
    level.set(ref, 1);
    out.set(ref, { kind: "level", level: 1, via: "reference" });
    const queue = [ref];
    for (let i = 0; i < queue.length; i++) {
      const m = byId.get(queue[i])!;
      const l = level.get(m.id)!;
      for (const p of [traced(m), other(m)]) {
        if (!p || !byId.has(p) || level.has(p)) continue;
        level.set(p, l - 1);
        out.set(p, { kind: "level", level: l - 1, via: "ancestor" });
        queue.push(p);
      }
    }
  }

  // 2. Everyone else, parents before children (Kahn's order over birth
  // links; people caught in a cycle never come out of it).
  const kids = new Map<string, string[]>();
  const waiting = new Map<string, number>();
  for (const m of members) {
    let n = 0;
    for (const p of [m.fatherId, m.motherId]) {
      if (!p || !byId.has(p) || p === m.id) continue;
      n++;
      (kids.get(p) ?? kids.set(p, []).get(p)!).push(m.id);
    }
    waiting.set(m.id, n);
  }
  const ready = members.filter((m) => waiting.get(m.id) === 0).map((m) => m.id);
  for (let i = 0; i < ready.length; i++) {
    const id = ready[i];
    const m = byId.get(id)!;
    if (!level.has(id)) {
      const t = traced(m), o = other(m);
      const lt = t ? level.get(t) : undefined;
      const lo = o ? level.get(o) : undefined;
      if (lt !== undefined) {
        const s: GenerationStatus = { kind: "level", level: lt + 1, via: tracedRole };
        if (lo !== undefined && lo + 1 !== lt + 1) s.alt = { level: lo + 1, via: otherRole };
        level.set(id, lt + 1);
        out.set(id, s);
      } else if (lo !== undefined) {
        level.set(id, lo + 1);
        out.set(id, { kind: "level", level: lo + 1, via: otherRole });
      }
    }
    for (const k of kids.get(id) ?? []) {
      const n = waiting.get(k)! - 1;
      waiting.set(k, n);
      if (n === 0) ready.push(k);
    }
  }

  // 3. Spouses and the unrelated.
  const partners = new Map<string, string[]>();
  for (const mar of marriages) {
    (partners.get(mar.spouseAId) ?? partners.set(mar.spouseAId, []).get(mar.spouseAId)!).push(mar.spouseBId);
    (partners.get(mar.spouseBId) ?? partners.set(mar.spouseBId, []).get(mar.spouseBId)!).push(mar.spouseAId);
  }
  for (const m of members) {
    if (out.has(m.id)) continue;
    const levels = (partners.get(m.id) ?? []).map((p) => level.get(p)).filter((l): l is number => l !== undefined);
    out.set(m.id, levels.length ? { kind: "spouse", partnerLevels: [...new Set(levels)].sort((a, b) => a - b) } : { kind: "unrelated" });
  }
  return out;
}

/** The tree's generation statuses, from its reference person. */
export function treeGenerations(tree: Pick<TreeDTO, "members" | "marriages" | "lineage" | "settings" | "crownBaseId" | "rootMemberId">) {
  return generationLevels(tree.members, tree.lineage, referenceIdOf(tree), tree.marriages);
}

const AR_ORDINALS = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون",
];
const arDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/**
 * How a status reads: "Generation 4"; above Generation 1, "3 generations
 * before Generation 1" (never 0 or a negative number); a spouse, "Spouse
 * of a Generation 4 member"; the unrelated, "Not related by blood".
 */
export function generationText(s: GenerationStatus | undefined, lang: "en" | "ar" = "en", gender: "MALE" | "FEMALE" | "UNKNOWN" = "MALE"): string {
  const ar = lang === "ar";
  const her = gender === "FEMALE";
  if (!s || s.kind === "unrelated") return ar ? (her ? "لا تربطها قرابة نسب بالجيل الأول" : "لا تربطه قرابة نسب بالجيل الأول") : "Not related by blood";
  if (s.kind === "spouse") {
    const ls = s.partnerLevels.map((l) => generationText({ kind: "level", level: l, via: "father" }, lang));
    return ar ? `${her ? "زوجة" : "زوج"} من ${ls.join(" ومن ")}` : `${her ? "Wife" : gender === "MALE" ? "Husband" : "Spouse"} of a ${ls.join(" and ")} member`;
  }
  if (s.level >= 1) return ar ? `الجيل ${AR_ORDINALS[s.level - 1] ?? arDigits(s.level)}` : `Generation ${s.level}`;
  const back = 1 - s.level;
  if (ar) return back === 1 ? "قبل الجيل الأول بجيل واحد" : back === 2 ? "قبل الجيل الأول بجيلين" : `قبل الجيل الأول بـ${arDigits(back)} أجيال`;
  return `${back} generation${back === 1 ? "" : "s"} before Generation 1`;
}

/** A short badge: "G4", "G−3" for ancestors' generations, "—" otherwise. */
export function generationBadge(s: GenerationStatus | undefined): string {
  if (!s || s.kind !== "level") return "—";
  return s.level >= 1 ? `G${s.level}` : `G−${1 - s.level}`;
}
