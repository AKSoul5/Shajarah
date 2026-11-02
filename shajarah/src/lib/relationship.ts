// How two people in a family are related: by blood, through their nearest
// shared ancestor (عمّ، خال، ابن عمّة، أخ لأب، ابن عمّ من الدرجة الثانية …),
// or by marriage (a wife, a daughter-in-law, a father-in-law, a sister's
// husband, a wife's sister's husband …), in Arabic and English, with the
// path between them.

import type { MarriageDTO, MemberDTO } from "./types";

export type Step = "up" | "down" | "spouse";

export interface Relationship {
  /** B's relation to A, in a sentence: "سالم عمّ أحمد" / "Salem is Ahmad's paternal uncle". */
  arabic: string;
  english: string;
  /** The nearest shared ancestors (two when a couple: the father and the mother). */
  common: string[];
  /** A to B: up to the shared ancestor and down, with a marriage on the way for an in-law (empty when unrelated). */
  path: string[];
  /** How each step of the path goes (one fewer than the path): to a parent, to a child, or to a spouse. */
  steps: Step[];
  /** Generations from A up to the shared ancestor, and from it down to B (of the blood part of the path). */
  up: number;
  down: number;
  /** A second tie between the same two, when there is one (a wife who is also a cousin). */
  also?: { arabic: string; english: string };
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
const ORDINAL_AR = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
const ordinalAr = (n: number) => ORDINAL_AR[n - 1] ?? AR(n);
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const TENS_AR = ["", "", "", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
/** "على بُعد أربعة أجيال": how far, after بُعد (the genitive). */
const generationsAr = (n: number) => (n === 1 ? "جيل واحد" : n === 2 ? "جيلين" : n <= 10 ? `${TENS_AR[n]} أجيال` : `${AR(n)} جيلًا`);
const far = (n: number) => `، على بُعد ${generationsAr(n)}`;
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
/** great-, great-great-, then "3rd great-" … (as genealogists write it) */
const greats = (n: number) => (n <= 0 ? "" : n <= 2 ? "great-".repeat(n) : `${nth(n)} great-`);

/** ل before a name (للعنود، لمحمد). */
const li = (name: string) => (name.startsWith("ال") ? `ل${name.slice(1)}` : `ل${name}`);

/** A tie followed by its owner, inside a longer description. */
const phraseOf = (t: Tie, owner: string) => (t.phrase ? t.phrase(owner) : `${t.term} ${owner}${t.tail}`);

/**
 * A blood tie of B to A, in parts that read as a sentence and also compose
 * (for an in-law): Arabic `${B} ${term} ${A}${tail}`, English
 * `${B} is ${A}'s ${en}`. `en` names the tie plainly ("son", "brother",
 * "father"), for the in-law names built on it.
 */
interface Tie {
  term: string;
  tail: string;
  en: string;
  kind: "child" | "parent" | "sibling" | "other";
  /**
   * The tie followed by whose it is, inside a longer description, where
   * that differs from `${term} ${owner}${tail}`: a brother is "زوجة أخو
   * أحمد" (the familiar construction; the textbook genitive "أخي أحمد"
   * reads as "my brother"), a half-brother "زوجة أخو أحمد من الأب".
   */
  phrase?: (owner: string) => string;
  up: number;
  down: number;
  common: string[];
  path: string[];
}

function bloodTie(byId: Map<string, Person>, anc: Map<string, Map<string, string[]>>, aId: string, bId: string): Tie | null {
  const a = byId.get(aId)!, b = byId.get(bId)!;
  const ancestorsOf = (id: string) => {
    if (!anc.has(id)) anc.set(id, ancestry(byId, id));
    return anc.get(id)!;
  };
  const fromA = ancestorsOf(aId), fromB = ancestorsOf(bId);
  let best = Infinity;
  const shared: { id: string; up: number; down: number }[] = [];
  for (const [id, pa] of fromA) {
    const pb = fromB.get(id);
    if (!pb) continue;
    const up = pa.length - 1, down = pb.length - 1;
    if (up + down < best) { best = up + down; shared.length = 0; }
    if (up + down === best) shared.push({ id, up, down });
  }
  if (!shared.length) return null;
  // (several at one distance: a couple, or the same pair reached twice; keep one shape)
  const { up, down } = shared[0];
  const common = shared.filter((s) => s.up === up && s.down === down).map((s) => s.id);
  const pathA = fromA.get(common[0])!, pathB = fromB.get(common[0])!;
  const path = [...pathA, ...pathB.slice(0, -1).reverse()];
  const female = (p?: Person) => p?.gender === "FEMALE";
  const fB = female(b);
  const his = female(a) ? "ها" : "ه";
  const tie = (term: string, en: string, kind: Tie["kind"] = "other", tail = "", phrase?: (owner: string) => string): Tie => ({ term, tail, en, kind, up, down, common, path, phrase });
  // a brother or sister: شقيق / شقيقة only when both parents are recorded
  // and shared (never inferred); otherwise أخ / أخت, with the side when it is known
  const sibOf = (x: Person, y: Person) => {
    const sameFather = !!x.fatherId && x.fatherId === y.fatherId, sameMother = !!x.motherId && x.motherId === y.motherId;
    return { full: sameFather && sameMother, sameFather, sameMother, known: !((sameFather && (!x.motherId || !y.motherId)) || (sameMother && (!x.fatherId || !y.fatherId))) };
  };
  // A's parent on the way up (the father's side or the mother's)
  const aParent = up >= 1 ? byId.get(pathA[1]) : undefined;
  const paternal = aParent?.id === a.fatherId;

  // B a descendant of A
  if (up === 0) {
    if (down === 1) return tie(fB ? "بنت" : "ابن", fB ? "daughter" : "son", "child");
    if (down === 2) return tie(fB ? "حفيدة" : "حفيد", fB ? "granddaughter" : "grandson");
    const grand = fB ? "granddaughter" : "grandson";
    if (down === 3) return tie(`${fB ? "بنت" : "ابن"} ${female(byId.get(pathB[1])) ? "حفيدة" : "حفيد"}`, `great-${grand}`);
    return tie("من ذرية", `${greats(down - 2)}${grand}`, "other", far(down));
  }
  // B an ancestor of A
  if (down === 0) {
    const side = paternal ? `لأبي${his}` : `لأمّ${his}`;
    const sideEn = paternal ? "paternal" : "maternal";
    if (up === 1) return tie(fB ? "والدة" : "والد", fB ? "mother" : "father", "parent");
    if (up === 2) return tie(fB ? "جدة" : "جد", `${sideEn} ${fB ? "grandmother" : "grandfather"}`, "other", ` ${side}`);
    if (up === 3) return tie(`${fB ? "جدة" : "جد"} ${female(aParent) ? "والدة" : "والد"}`, `great-${fB ? "grandmother" : "grandfather"} (${sideEn})`);
    return tie("من أجداد", `${greats(up - 2)}${fB ? "grandmother" : "grandfather"}`, "other", far(up));
  }
  // brothers and sisters: full, or through the father or the mother only
  if (up === 1 && down === 1) {
    const { full, sameFather, known } = sibOf(a, b);
    const plain = fB ? "sister" : "brother";
    const en = full || !known ? plain : `half-${plain} (same ${sameFather ? "father" : "mother"})`;
    // (full only when both parents are recorded and shared; half by the
    // side recorded; with the other parent of either not recorded, no side)
    const side = full ? "" : known ? (sameFather ? " من الأب" : " من الأم") : "";
    const tail = full ? (fB ? " الشقيقة" : " الشقيق") : side;
    // (inside a longer phrase: "زوجة أخو أحمد", "زوجة أخو أحمد من الأب")
    return tie(fB ? "أخت" : "أخو", en, "sibling", tail, (owner) => `${fB ? "أخت" : "أخو"} ${owner}${side}`);
  }

  // Further: by the generations each is from the shared ancestor. The one
  // nearer to it is related to the other's ancestor of the same
  // generation as a brother or sister, or as a cousin of some degree.
  const kinOf = (x: Person, xParentId: string | undefined, sibling: Person | undefined, deg: number) => {
    // how `sibling`'s line (the shared ancestor's child on the far side) is
    // named from x: x's father's side (عمّ/عمّة) or mother's (خال/خالة)
    const xPaternal = xParentId === x.fatherId;
    const aunt = female(sibling);
    return { side: xPaternal ? (aunt ? "عمّة" : "عمّ") : aunt ? "خالة" : "خال", xPaternal, deg };
  };
  const removed = Math.abs(up - down);
  const degree = Math.min(up, down) - 1; // 0: uncles and nephews; 1: first cousins …
  const degreeAr = degree >= 2 ? ` من الدرجة ${ordinalAr(degree)}` : "";

  if (up >= down) {
    // X: A's ancestor of B's generation (A when they are of one generation)
    const xIdx = up - down;
    const X = byId.get(pathA[xIdx])!;
    // how X is named from A: والد، جد، جد والد … (blank when X is A)
    const ofA = (() => {
      if (xIdx === 0) return "";
      const g = female(X);
      if (xIdx === 1) return g ? "والدة" : "والد";
      if (xIdx === 2) return g ? "جدة" : "جد";
      if (xIdx === 3) return `${g ? "جدة" : "جد"} ${female(aParent) ? "والدة" : "والد"}`;
      return "أحد أجداد";
    })();
    const ofAEn = xIdx === 0 ? "" : xIdx === 1 ? (female(X) ? "mother's " : "father's ") : xIdx === 2 ? (female(X) ? "grandmother's " : "grandfather's ") : `${greats(xIdx - 2)}${female(X) ? "grandmother" : "grandfather"}'s `;
    if (down === 1) {
      // B a brother or sister of X: an uncle or aunt of A, or of A's parent …
      if (xIdx === 1) {
        const ar = paternal ? (fB ? "عمّة" : "عمّ") : fB ? "خالة" : "خال";
        return tie(ar, `${paternal ? "paternal" : "maternal"} ${fB ? "aunt" : "uncle"}`);
      }
      // (a brother or sister of X, so the عمّ or خال of X's child on A's side)
      const childOfX = byId.get(pathA[xIdx - 1]);
      const ar = !female(X) ? (fB ? "عمّة" : "عمّ") : fB ? "خالة" : "خال";
      const who = xIdx - 1 === 1 ? (female(childOfX) ? "والدة" : "والد") : xIdx - 1 === 2 ? (female(childOfX) ? "جدة" : "جد") : "أحد أجداد";
      const whoEn = xIdx - 1 === 1 ? (female(childOfX) ? "mother" : "father") : `${greats(xIdx - 3)}grand${female(childOfX) ? "mother" : "father"}`;
      return tie(`${ar} ${who}`, `${greats(xIdx - 1)}${fB ? "aunt" : "uncle"} (${whoEn}'s ${!female(X) ? "paternal" : "maternal"} ${fB ? "aunt" : "uncle"})`, "other", xIdx - 1 >= 3 ? far(xIdx) : "");
    }
    // B a cousin of X: child of X's عمّ / عمّة / خال / خالة, of some degree
    const k = kinOf(X, pathA[xIdx + 1], byId.get(pathB[down - 1]), degree);
    const term = `${fB ? "بنت" : "ابن"} ${k.side}${ofA ? ` ${ofA}` : ""}`;
    const en = xIdx === 0
      ? `${ordinalEn(degree)} cousin (${k.xPaternal ? "father's" : "mother's"} side)`
      : `${ordinalEn(degree)} cousin ${times(removed)} removed (${ofAEn}${ordinalEn(degree)} cousin)`;
    return tie(term, en, "other", `${degreeAr}${xIdx >= 4 ? far(xIdx) : ""}`);
  }
  // down > up: Y, B's ancestor of A's generation, is A's brother or sister,
  // or cousin; B descends from Y
  const yIdx = down - up;
  const Y = byId.get(pathB[yIdx])!;
  const fromY = yIdx === 1 ? (fB ? "بنت" : "ابن") : yIdx === 2 ? (fB ? "حفيدة" : "حفيد") : "من ذرية";
  const fromYEn = yIdx === 1 ? (fB ? "daughter" : "son") : yIdx === 2 ? (fB ? "granddaughter" : "grandson") : "descendant";
  if (up === 1) {
    // a nephew or niece of some remove: a brother's or sister's line
    const viaSister = female(Y);
    if (yIdx === 1) return tie(`${fB ? "بنت" : "ابن"} ${viaSister ? "أخت" : "أخ"}`, `${fB ? "niece" : "nephew"} (${viaSister ? "sister" : "brother"}'s ${fB ? "daughter" : "son"})`);
    return tie(`${fromY} ${viaSister ? "أخت" : "أخ"}`, `${greats(yIdx - 1)}${fB ? "niece" : "nephew"} (${viaSister ? "sister" : "brother"}'s ${fromYEn})`);
  }
  const k = kinOf(a, aParent?.id, byId.get(pathB[down - 1]), degree);
  const yTerm = `${female(Y) ? "بنت" : "ابن"} ${k.side}`;
  const term = `${fromY} ${yTerm}`;
  const en = `${ordinalEn(degree)} cousin ${times(removed)} removed (${fromYEn} of a ${ordinalEn(degree)} cousin on the ${k.xPaternal ? "father's" : "mother's"} side)`;
  return tie(term, en, "other", degreeAr);
}

/** How B is related to A: by blood, by marriage, or both. */
type Years = { startYear?: number | null; endYear?: number | null };

export function relationship(members: Person[], marriages: (Pick<MarriageDTO, "spouseAId" | "spouseBId"> & Years)[], aId: string, bId: string): Relationship {
  const byId = new Map(members.map((m) => [m.id, m]));
  const a = byId.get(aId), b = byId.get(bId);
  const none = (arabic: string, english: string): Relationship => ({ arabic, english, common: [], path: [], steps: [], up: 0, down: 0 });
  if (!a || !b) return none("", "");
  const A = a.name, B = b.name;
  if (aId === bId) return { ...none(`${A} نفسه`, `${A} themself`), path: [aId] };
  const anc = new Map<string, Map<string, string[]>>();
  const female = (p?: Person) => p?.gender === "FEMALE";
  const his = female(a) ? "ها" : "ه";

  // spouses: recorded marriages, and the other parent of a child
  const spousesOf = (id: string) => {
    const out = new Set<string>();
    for (const x of marriages) {
      if (x.spouseAId === id && byId.has(x.spouseBId)) out.add(x.spouseBId);
      if (x.spouseBId === id && byId.has(x.spouseAId)) out.add(x.spouseAId);
    }
    for (const c of members) {
      if (c.fatherId === id && c.motherId && byId.has(c.motherId)) out.add(c.motherId);
      if (c.motherId === id && c.fatherId && byId.has(c.fatherId)) out.add(c.fatherId);
    }
    return out;
  };
  const spouseWord = (p: Person) => (female(p) ? "زوجة" : "زوج");
  const spouseEn = (p: Person) => (female(p) ? "wife" : "husband");
  // a spouse's father or mother: حموها، حماتها for a woman's husband's
  // parents; نسيبه for a man's wife's father (not حموه); none for his
  // wife's mother
  const parentInLaw = (t: Tie, S: Person) => {
    if (t.kind !== "parent") return "";
    if (female(a)) return female(b) ? " (حماتها)" : " (حموها)";
    return !female(S) || female(b) ? "" : " (نسيبه)";
  };
  const stepsOf = (t: Tie): Step[] => [...Array(t.up).fill("up"), ...Array(t.down).fill("down")];
  const blood = bloodTie(byId, anc, aId, bId);
  const bloodRel = (t: Tie): Relationship => ({
    arabic: `${B} ${t.term} ${A}${t.tail}`,
    english: `${B} is ${A}'s ${t.en}${t.kind === "other" && t.up > 0 && t.down > 0 && t.up + t.down >= 4 ? ` (through ${byId.get(t.common[0])!.name})` : ""}`,
    common: t.common, path: t.path, steps: stepsOf(t), up: t.up, down: t.down,
  });

  // ── by marriage: the closest way through one or two marriages ─────────
  // (how far: the generations of the blood part, and one for each marriage)
  type InLaw = { score: number; make: () => Relationship };
  const options: InLaw[] = [];
  const aSpouses = spousesOf(aId), bSpouses = spousesOf(bId);
  if (aSpouses.has(bId)) {
    options.push({ score: 1, make: () => ({ arabic: `${B} ${spouseWord(b)} ${A}`, english: `${B} is ${A}'s ${spouseEn(b)}`, common: [], path: [aId, bId], steps: ["spouse"], up: 0, down: 0 }) });
  }
  // B a blood relative of A's spouse S: a father-in-law, a wife's brother …
  for (const sId of aSpouses) {
    if (sId === bId) continue;
    const t = bloodTie(byId, anc, sId, bId);
    if (!t) continue;
    const S = byId.get(sId)!;
    options.push({
      score: t.up + t.down + 1,
      make: () => {
        const fB = female(b);
        const enNamed = t.kind === "parent" ? `${fB ? "mother" : "father"}-in-law` : t.kind === "sibling" ? `${fB ? "sister" : "brother"}-in-law` : "";
        return {
          // (no الشقيق at the end of an in-law phrase: it would read as
          // describing the wrong person; من الأب / من الأم stays)
          arabic: `${B} ${t.term} ${spouseWord(S)} ${A}${t.kind === "sibling" ? t.tail.replace(/ الشقيقة?$/, "") : t.tail}${parentInLaw(t, S)}`,
          english: enNamed ? `${B} is ${A}'s ${enNamed} (${spouseEn(S)}'s ${t.en})` : `${B} is ${A}'s ${spouseEn(S)}'s ${t.en}`,
          common: t.common, path: [aId, ...t.path], steps: ["spouse", ...stepsOf(t)], up: t.up, down: t.down,
        };
      },
    });
  }
  // B the spouse of A's blood relative R: a daughter-in-law, a sister's husband …
  for (const rId of bSpouses) {
    if (rId === aId) continue;
    const t = bloodTie(byId, anc, aId, rId);
    if (!t) continue;
    options.push({
      score: t.up + t.down + 1,
      make: () => {
        const fB = female(b);
        const named = t.kind === "child" ? ` (${fB ? "كنّت" : "صهر"}${his})` : "";
        const enNamed = t.kind === "child" ? `${fB ? "daughter" : "son"}-in-law` : t.kind === "sibling" ? `${fB ? "sister" : "brother"}-in-law` : "";
        return {
          arabic: `${B} ${spouseWord(b)} ${phraseOf(t, A)}${named}`,
          english: enNamed ? `${B} is ${A}'s ${enNamed} (${t.en}'s ${spouseEn(b)})` : `${B} is the ${spouseEn(b)} of ${A}'s ${t.en}`,
          common: t.common, path: [...t.path, bId], steps: [...stepsOf(t), "spouse"], up: t.up, down: t.down,
        };
      },
    });
  }
  // B the spouse of a blood relative of A's spouse (close ones only): a
  // wife's sister's husband (عديل), a husband's brother's wife (سلفة) …
  for (const sId of aSpouses) for (const rId of bSpouses) {
    if (sId === bId || rId === aId || sId === rId) continue;
    const t = bloodTie(byId, anc, sId, rId);
    if (!t || t.up + t.down > 2) continue;
    const S = byId.get(sId)!;
    options.push({
      score: t.up + t.down + 2,
      make: () => {
        const fA = female(a), fB = female(b);
        const named = t.kind === "sibling" && !fA && female(S) && !fB ? " (عديله)" : t.kind === "sibling" && fA && !female(S) && fB ? " (سلفتها)" : "";
        return {
          arabic: `${B} ${spouseWord(b)} ${phraseOf(t, `${spouseWord(S)} ${A}`)}${named}`,
          english: `${B} is the ${spouseEn(b)} of ${A}'s ${spouseEn(S)}'s ${t.en}`,
          common: t.common, path: [aId, ...t.path, bId], steps: ["spouse", ...stepsOf(t), "spouse"], up: t.up, down: t.down,
        };
      },
    });
  }
  // B a close relative of the spouse of A's close relative: a son's wife's
  // father, a daughter's husband's brother … (A's parents, children and
  // brothers and sisters; their spouses' parents, children and siblings)
  const near = (id: string) => {
    const p = byId.get(id)!;
    const out = new Set<string>([p.fatherId, p.motherId].filter((x): x is string => !!x && byId.has(x)));
    for (const m of members) {
      if (m.id === id) continue;
      if (m.fatherId === id || m.motherId === id) out.add(m.id);
      if ((p.fatherId && m.fatherId === p.fatherId) || (p.motherId && m.motherId === p.motherId)) out.add(m.id);
    }
    return out;
  };
  for (const rId of near(aId)) {
    for (const wId of spousesOf(rId)) {
      if (wId === aId || wId === bId || aSpouses.has(wId)) continue;
      const t2 = bloodTie(byId, anc, wId, bId);
      if (!t2 || t2.up + t2.down > 2 || t2.path.includes(aId)) continue;
      const t1 = bloodTie(byId, anc, aId, rId)!;
      const W = byId.get(wId)!;
      options.push({
        score: t1.up + t1.down + t2.up + t2.down + 1,
        make: () => ({
          arabic: `${B} ${t2.term} ${spouseWord(W)} ${phraseOf(t1, A)}`,
          english: `${B} is the ${t2.en} of ${A}'s ${t1.en}'s ${spouseEn(W)}`,
          common: [], path: [...t1.path, ...t2.path], steps: [...stepsOf(t1), "spouse", ...stepsOf(t2)], up: t1.up, down: t1.down,
        }),
      });
    }
  }
  // two wives of one husband (ضرّة), or two husbands of one wife. The
  // years, when recorded, say whether one marriage ended before the other
  // began; otherwise nothing is assumed.
  const marriageOf = (x: string, y: string) => marriages.find((m) => (m.spouseAId === x && m.spouseBId === y) || (m.spouseAId === y && m.spouseBId === x));
  const order = (bm?: Years, am?: Years): "before" | "after" | null => {
    if (bm?.endYear != null && am?.startYear != null && bm.endYear <= am.startYear) return "before";
    if (am?.endYear != null && bm?.startYear != null && am.endYear <= bm.startYear) return "after";
    return null;
  };
  for (const xId of aSpouses) {
    if (!bSpouses.has(xId)) continue;
    const X = byId.get(xId)!;
    const when = order(marriageOf(bId, xId), marriageOf(aId, xId));
    options.push({
      score: 2,
      make: () => {
        const path = [aId, xId, bId], steps: Step[] = ["spouse", "spouse"];
        const base = { common: [], path, steps, up: 0, down: 0 };
        const fB = female(b);
        if (when) {
          const ar = fB ? (when === "before" ? "زوجة سابقة" : "زوجة لاحقة") : when === "before" ? "زوج سابق" : "زوج لاحق";
          return { ...base, arabic: `${B} ${ar} ${li(X.name)}، ${spouseWord(X)} ${A}`, english: `${B} is ${when === "before" ? "a previous" : "a later"} ${spouseEn(b)} of ${A}'s ${spouseEn(X)}, ${X.name}` };
        }
        if (female(a) && fB) {
          const wives = [...spousesOf(xId)].filter((w) => female(byId.get(w)));
          return { ...base, arabic: `${B} ${wives.length === 2 ? "إحدى زوجتي" : "إحدى زوجات"} ${X.name}، وهي ضرّة ${A}`, english: `${B} is ${A}'s co-wife (another wife of ${X.name})` };
        }
        return { ...base, arabic: `${B} ${spouseWord(b)} ${fB ? "أخرى" : "آخر"} ${li(X.name)}، ${spouseWord(X)} ${A}`, english: `${B} is another ${spouseEn(b)} of ${A}'s ${spouseEn(X)}, ${X.name}` };
      },
    });
  }
  options.sort((x, y) => x.score - y.score);
  const inLaw = options[0];
  const bloodScore = blood ? blood.up + blood.down : Infinity;

  // the nearer tie leads; the other is named too when it is close
  // (a man's son is not also named "his wife's son": the marriage is
  // named beside the blood only when it is the nearer tie, as for a wife
  // who is also a cousin)
  if (blood && (!inLaw || bloodScore <= inLaw.score)) return bloodRel(blood);
  if (inLaw) {
    const r = inLaw.make();
    if (blood && bloodScore <= 6) {
      const o = bloodRel(blood);
      r.also = { arabic: o.arabic, english: o.english };
    }
    return r;
  }
  if (blood) return bloodRel(blood);
  return none(`لا توجد بين ${A} و${B} قرابة نسب أو مصاهرة مسجّلة`, `${A} and ${B} share no recorded ancestor or marriage`);
}
