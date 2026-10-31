// How two people in a family are related: their nearest shared ancestor,
// the path between them through it, and the relationship's name in Arabic
// (عمّ، خال، ابن عمّة، أخ لأب …) and English.

import type { MarriageDTO, MemberDTO } from "./types";

export interface Relationship {
  /** B's relation to A, in a sentence: "سالم عمّ أحمد" / "Salem is Ahmad's paternal uncle". */
  arabic: string;
  english: string;
  /** The nearest shared ancestors (two when a couple: the father and the mother). */
  common: string[];
  /** A, up through the shared ancestor, down to B (empty when unrelated). */
  path: string[];
  /** Generations from A up to the shared ancestor, and from it down to B. */
  up: number;
  down: number;
}

type Person = Pick<MemberDTO, "id" | "name" | "gender" | "fatherId" | "motherId">;

/** Every ancestor of a person (through fathers and mothers), each with the shortest path to it. */
function ancestry(byId: Map<string, Person>, id: string): Map<string, string[]> {
  const found = new Map<string, string[]>([[id, [id]]]);
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const x of frontier) {
      const p = byId.get(x);
      for (const parent of [p?.fatherId, p?.motherId]) {
        if (!parent || found.has(parent) || !byId.has(parent)) continue;
        found.set(parent, [...found.get(x)!, parent]);
        next.push(parent);
      }
    }
    frontier = next;
  }
  return found;
}

const AR = (n: number) => n.toLocaleString("ar-SA");
const ORDINAL_EN = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const ordinalEn = (n: number) => ORDINAL_EN[n - 1] ?? `${n}th`;
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const generationsAr = (n: number) => (n === 1 ? "جيل واحد" : n === 2 ? "جيلان" : n <= 10 ? `${AR(n)} أجيال` : `${AR(n)} جيلًا`);

/** How B is related to A (by blood, through the nearest shared ancestor; or as a spouse). */
export function relationship(members: Person[], marriages: Pick<MarriageDTO, "spouseAId" | "spouseBId">[], aId: string, bId: string): Relationship {
  const byId = new Map(members.map((m) => [m.id, m]));
  const a = byId.get(aId), b = byId.get(bId);
  const none = (arabic: string, english: string): Relationship => ({ arabic, english, common: [], path: [], up: 0, down: 0 });
  if (!a || !b) return none("", "");
  const A = a.name, B = b.name;
  const femaleB = b.gender === "FEMALE";
  // (his or her: لأبيه / لأبيها, by A)
  const his = a.gender === "FEMALE" ? "ها" : "ه";
  if (aId === bId) return { ...none(`${A} نفسه`, `${A} themself`), path: [aId] };

  const married = marriages.some((x) => (x.spouseAId === aId && x.spouseBId === bId) || (x.spouseAId === bId && x.spouseBId === aId))
    || members.some((c) => (c.fatherId === aId && c.motherId === bId) || (c.fatherId === bId && c.motherId === aId));
  const fromA = ancestry(byId, aId), fromB = ancestry(byId, bId);
  // the nearest shared ancestors: fewest generations between the two through them
  let best = Infinity;
  const shared: { id: string; up: number; down: number }[] = [];
  for (const [id, pa] of fromA) {
    const pb = fromB.get(id);
    if (!pb) continue;
    const up = pa.length - 1, down = pb.length - 1;
    if (up + down < best) { best = up + down; shared.length = 0; }
    if (up + down === best) shared.push({ id, up, down });
  }
  if (!shared.length) {
    if (married) return { ...none(`${B} ${femaleB ? "زوجة" : "زوج"} ${A}`, `${B} is ${A}'s ${femaleB ? "wife" : "husband"}`), path: [aId, bId] };
    return none(`لا تجمع ${A} و${B} قرابة نسب مسجّلة`, `${A} and ${B} share no recorded ancestor`);
  }
  // (several at one distance: a couple, or the same pair reached twice; keep one shape)
  const { up, down } = shared[0];
  const common = shared.filter((s) => s.up === up && s.down === down).map((s) => s.id);
  const pathA = fromA.get(common[0])!, pathB = fromB.get(common[0])!;
  const path = [...pathA, ...pathB.slice(0, -1).reverse()];
  const result = (arabic: string, english: string): Relationship => ({ arabic, english, common, path, up, down });
  const anc = byId.get(common[0])!;
  // A's parent on the way up (the father's side or the mother's) and B's parent on the way down
  const aParent = up >= 1 ? byId.get(pathA[1]) : undefined;
  const bParent = down >= 1 ? byId.get(pathB[1]) : undefined;
  const paternal = aParent?.id === a.fatherId;

  // B a descendant of A
  if (up === 0) {
    if (down === 1) return result(`${B} ${femaleB ? "بنت" : "ابن"} ${A}`, `${B} is ${A}'s ${femaleB ? "daughter" : "son"}`);
    if (down === 2) return result(`${B} ${femaleB ? "حفيدة" : "حفيد"} ${A}`, `${B} is ${A}'s ${femaleB ? "granddaughter" : "grandson"}`);
    return result(`${B} من ذرية ${A}، بعد ${generationsAr(down)}`, `${B} is ${A}'s descendant, ${down} generations down`);
  }
  // B an ancestor of A
  if (down === 0) {
    const side = paternal ? `لأبي${his}` : `لأمّ${his}`;
    if (up === 1) return result(`${B} ${femaleB ? "أم" : "أب"} ${A}`, `${B} is ${A}'s ${femaleB ? "mother" : "father"}`);
    if (up === 2) return result(`${B} ${femaleB ? "جدة" : "جد"} ${A} ${side}`, `${B} is ${A}'s ${paternal ? "paternal" : "maternal"} ${femaleB ? "grandmother" : "grandfather"}`);
    return result(`${B} من أجداد ${A}، قبله ${generationsAr(up)}`, `${B} is ${A}'s ancestor, ${up} generations up`);
  }
  // brothers and sisters: full, or through the father or the mother only
  if (up === 1 && down === 1) {
    const sameFather = !!a.fatherId && a.fatherId === b.fatherId, sameMother = !!a.motherId && a.motherId === b.motherId;
    const full = sameFather && sameMother;
    const kin = femaleB ? "أخت" : "أخو";
    const how = full ? (femaleB ? "الشقيقة" : "الشقيق") : sameFather ? `لأبي${his}` : `لأمّ${his}`;
    const en = full || (sameFather && !a.motherId && !b.motherId) ? (femaleB ? "sister" : "brother") : `half-${femaleB ? "sister" : "brother"} (same ${sameFather ? "father" : "mother"})`;
    return result(`${B} ${kin} ${A} ${how}`, `${B} is ${A}'s ${en}`);
  }
  // an uncle or aunt: the father's brother or sister (عمّ، عمّة), the mother's (خال، خالة)
  if (up === 2 && down === 1) {
    const ar = paternal ? (femaleB ? "عمّة" : "عمّ") : femaleB ? "خالة" : "خال";
    return result(`${B} ${ar} ${A}`, `${B} is ${A}'s ${paternal ? "paternal" : "maternal"} ${femaleB ? "aunt" : "uncle"}`);
  }
  // a nephew or niece: a brother's or a sister's child
  if (up === 1 && down === 2) {
    const viaSister = bParent?.gender === "FEMALE";
    const ar = `${femaleB ? "بنت" : "ابن"} ${viaSister ? "أخت" : "أخ"}`;
    return result(`${B} ${ar} ${A}`, `${B} is ${A}'s ${femaleB ? "niece" : "nephew"} (${viaSister ? "sister" : "brother"}'s ${femaleB ? "daughter" : "son"})`);
  }
  // first cousins: the child of A's عمّ، عمّة، خال or خالة
  if (up === 2 && down === 2) {
    const auntOrUncle = bParent?.gender === "FEMALE" ? (paternal ? "عمّة" : "خالة") : paternal ? "عمّ" : "خال";
    return result(`${B} ${femaleB ? "بنت" : "ابن"} ${auntOrUncle} ${A}`, `${B} is ${A}'s first cousin (${paternal ? "father's" : "mother's"} side)`);
  }
  // a grandparent's brother or sister: the عمّ or خال of A's father or mother
  if (up === 3 && down === 1) {
    const parentPaternal = byId.get(pathA[2])?.id === aParent?.fatherId;
    const ar = parentPaternal ? (femaleB ? "عمّة" : "عمّ") : femaleB ? "خالة" : "خال";
    const parentAr = aParent?.gender === "FEMALE" ? "والدة" : "والد";
    return result(`${B} ${ar} ${parentAr} ${A}`, `${B} is ${A}'s great-${femaleB ? "aunt" : "uncle"} (${aParent?.gender === "FEMALE" ? "mother" : "father"}'s ${parentPaternal ? "paternal" : "maternal"} ${femaleB ? "aunt" : "uncle"})`);
  }
  // a brother's or sister's grandchild
  if (up === 1 && down === 3) {
    const sibling = byId.get(pathB[2]);
    const viaSister = sibling?.gender === "FEMALE";
    return result(`${B} ${femaleB ? "حفيدة" : "حفيد"} ${viaSister ? "أخت" : "أخ"} ${A}`, `${B} is ${A}'s great-${femaleB ? "niece" : "nephew"} (${viaSister ? "sister" : "brother"}'s ${femaleB ? "granddaughter" : "grandson"})`);
  }
  // further: through the shared ancestor, with each one's distance from it
  const degree = Math.min(up, down) - 1, removed = Math.abs(up - down);
  const en = degree >= 1
    ? `${B} is ${A}'s ${ordinalEn(degree)} cousin${removed ? ` ${times(removed)} removed` : ""}`
    : `${B} is ${A}'s relative, ${up} and ${down} generations from ${anc.name}`;
  return result(
    `يلتقي ${A} و${B} في ${anc.name}: ${A} بعده ${generationsAr(up)}، و${B} بعده ${generationsAr(down)}`,
    `${en} (through ${anc.name})`,
  );
}
