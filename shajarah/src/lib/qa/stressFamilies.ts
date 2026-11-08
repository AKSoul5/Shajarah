// Ten synthetic families for the poster stress test (tests/stress/): each a
// materially different structure, built the same way every run (seeded),
// from invented names of every length (short, long, compound, with a laqab),
// in Arabic or in English. Every family is checked by validateFamily before
// it is laid out, so a finding is about the poster, never about the data.
//
//   1 tiny        one couple and three children
//   2 small       a balanced family of about a dozen
//   3 daughters   about three in four are women: daughters with families
//   4 sons        about three in four are men
//   5 spouses     men with two and three wives, a daughter married twice,
//                 children of every marriage
//   6 medium      60-80 people, five generations, branches of every size
//   7 large       150-200, uneven branches, several wives, big and small
//                 sibling groups
//   8 huge        300-500, many generations and marriages, more men
//   9 wide        100-200 in three generations: very large sibling groups
//  10 deep        100-200 in a dozen generations: one line runs far, others
//                 stop early; several wives; men who never married

import { computeGenerations } from "../genealogy";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

export type Lang = "ar" | "en";

const NAMES = {
  ar: {
    m: ["علي", "عمر", "زيد", "محمد", "خالد", "فهد", "سعد", "ناصر", "يوسف", "إبراهيم", "سليمان", "عبد الرحمن", "عبد العزيز", "عبد الله", "محمد الأمين", "عبد الملك", "طلال", "بدر", "حمد", "راشد", "منصور", "عبد المحسن", "صالح", "مشعل", "عثمان", "تركي"],
    f: ["منى", "هند", "نورة", "سارة", "مريم", "فاطمة", "عائشة", "الجوهرة", "العنود", "لطيفة", "منيرة", "حصة", "رقية", "أم كلثوم", "نور الهدى", "هيا", "ريم", "لولوة", "عبير", "شيخة"],
    laqab: ["الأكبر", "الأصغر", "الشيخ", "الملقب بالأمين"],
    families: ["العتيبي", "آل نصار", "القحطاني", "آل حمدان", "الدوسري", "آل مبارك", "الشمري", "آل سعيد"],
    title: "شجرة العائلة",
  },
  en: {
    m: ["Al", "Jo", "Sam", "John", "Peter", "Thomas", "William", "Edward", "Henry", "George", "Christopher", "Maximilian", "John Paul", "Jean-Baptiste", "Alexander", "Benjamin", "Charles", "David", "Frederick", "Hugh", "James", "Laurence", "Matthew", "Nicholas", "Robert", "Simon"],
    f: ["Ann", "Eve", "Mary", "Sarah", "Emma", "Grace", "Alice", "Charlotte", "Elizabeth", "Mary Elizabeth", "Alexandra-Catherine", "Rose", "Lucy", "Harriet", "Jane", "Margaret", "Victoria", "Florence", "Eleanor", "Beatrice"],
    laqab: ["the Elder", "the Younger", "the Sheikh", "known as al-Amin"],
    families: ["Smith", "Montgomery-Fitzgerald", "Brown", "Ashworth", "Clarke", "de la Croix", "Okafor", "Lindqvist"],
    title: "Family Tree",
  },
} as const;

/** A small deterministic random sequence (the same family every run). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Family {
  members: MemberDTO[] = [];
  marriages: MarriageDTO[] = [];
  private n = 0;
  readonly rand: () => number;
  constructor(readonly id: string, readonly lang: Lang, seed: number) {
    this.rand = seeded(seed);
  }
  private get names() { return NAMES[this.lang]; }
  pick<T>(xs: readonly T[]): T { return xs[Math.floor(this.rand() * xs.length)]; }
  between(lo: number, hi: number) { return lo + Math.floor(this.rand() * (hi - lo + 1)); }
  /** A child of the family, or (no parents) a founder. */
  person(gender: Gender, father: MemberDTO | null = null, mother: MemberDTO | null = null): MemberDTO {
    const siblings = this.members.filter((m) => father && m.fatherId === father.id);
    const m: MemberDTO = {
      id: `${this.id}-${this.n++}`, name: this.pick(gender === "FEMALE" ? this.names.f : this.names.m),
      laqab: this.rand() < 0.08 ? this.pick(this.names.laqab) : null, gender,
      birthYear: null, deathYear: null, isDeceased: false, birthOrder: siblings.length, generation: 0, notes: null,
      fatherId: father?.id ?? null, motherId: mother?.id ?? null,
    };
    this.members.push(m);
    return m;
  }
  /** Someone who married into the family: a first name and their own family's name. */
  outsider(gender: Gender): MemberDTO {
    const m = this.person(gender);
    m.name = `${m.name} ${this.pick(this.names.families)}`;
    m.birthOrder = 0;
    return m;
  }
  /** A child recorded as a son after all (with a son's name). */
  makeSon(m: MemberDTO) {
    m.gender = "MALE";
    m.name = this.pick(this.names.m);
  }
  marry(husband: MemberDTO, wife: MemberDTO) {
    this.marriages.push({ id: `${this.id}-mar${this.marriages.length}`, spouseAId: husband.id, spouseBId: wife.id, startYear: null, endYear: null });
  }
  /** A man's children by a wife (married here): `count` of them, each a daughter with probability `daughters`. */
  children(father: MemberDTO, mother: MemberDTO, count: number, daughters: number): MemberDTO[] {
    return Array.from({ length: count }, () => this.person(this.rand() < daughters ? "FEMALE" : "MALE", father, mother));
  }
  /** A wife from outside, married to `man`. */
  wife(man: MemberDTO): MemberDTO {
    const w = this.outsider("FEMALE");
    this.marry(man, w);
    return w;
  }
  /** A husband from outside for a daughter of the family, and their `count` children. */
  daughtersFamily(daughter: MemberDTO, count: number, daughters = 0.5): MemberDTO[] {
    const h = this.outsider("MALE");
    this.marry(h, daughter);
    return this.children(h, daughter, count, daughters);
  }
  tree(crownBase: MemberDTO): TreeDTO {
    const gens = computeGenerations(this.members, "PATRILINEAL");
    for (const m of this.members) m.generation = gens.get(m.id) ?? 0;
    return {
      id: this.id, name: this.id, title: NAMES[this.lang].title, subtitle: null, lineage: "PATRILINEAL",
      rootMemberId: this.members[0].id, crownBaseId: crownBase.id, trunkStartId: null, soilText: null, settings: null,
      members: this.members, marriages: this.marriages, sources: [], citations: [], media: [],
    };
  }
}

/** A line of `count` ancestors, eldest first, each the father of the next; returns the last. */
function ancestors(f: Family, count: number): MemberDTO {
  let father: MemberDTO | null = null;
  for (let i = 0; i < count; i++) father = f.person("MALE", father);
  return father!;
}

interface Grow {
  /** Generations below the head (the head's children are 1). */
  depth: (f: Family, branch: number) => number;
  /** Children of one marriage of a man at this generation. */
  kids: (f: Family, gen: number) => number;
  /** Share of daughters among them. */
  daughters: number;
  /** A man's number of wives (with children). */
  wives: (f: Family, gen: number) => number;
  /** Probability that a daughter has a family of her own (recorded children). */
  daughterFamily: number;
  /** Probability that a man of the line never married (no children). */
  single?: number;
  /** Share of daughters in a daughter's own family. */
  familyDaughters?: number;
  /** Every marriage has at least one son, so each line goes on. */
  aSonEach?: boolean;
  /** The head's own children: so many sons, so many daughters (in a seeded order). */
  head: { sons: number; daughters: number };
}

/** The head's line, generation by generation, as the rules say. */
function grow(f: Family, head: MemberDTO, g: Grow) {
  const visit = (man: MemberDTO, gen: number, limit: number) => {
    if (gen >= limit) return;
    if (gen > 0 && g.single && f.rand() < g.single) return;
    const wives = Math.max(1, g.wives(f, gen));
    for (let w = 0; w < wives; w++) {
      const wife = f.wife(man);
      const kids = f.children(man, wife, g.kids(f, gen), g.daughters);
      if (g.aSonEach && gen + 1 < limit && kids.length && !kids.some((k) => k.gender === "MALE")) f.makeSon(kids[0]);
      for (const c of kids) {
        if (c.gender === "MALE") visit(c, gen + 1, limit);
        else if (gen + 1 < limit && f.rand() < g.daughterFamily) f.daughtersFamily(c, f.between(1, 4), g.familyDaughters);
      }
    }
  };
  // each of the head's sons is a branch with its own depth
  const wife = f.wife(head);
  const genders = [...Array(g.head.sons).fill("MALE"), ...Array(g.head.daughters).fill("FEMALE")] as Gender[];
  for (let i = genders.length - 1; i > 0; i--) {
    const j = Math.floor(f.rand() * (i + 1));
    [genders[i], genders[j]] = [genders[j], genders[i]];
  }
  const first = genders.map((gender) => f.person(gender, head, wife));
  let branch = 0;
  for (const c of first) {
    if (c.gender === "MALE") visit(c, 1, g.depth(f, branch++));
    else if (f.rand() < g.daughterFamily) f.daughtersFamily(c, f.between(1, 4), g.familyDaughters);
  }
}

export const STRESS_FAMILIES = {
  /** 1 · Very small: one couple and their children. */
  tiny(lang: Lang = "ar") {
    const f = new Family(`sf1-${lang}`, lang, 101);
    const head = f.person("MALE");
    const wife = f.wife(head);
    f.person("MALE", head, wife);
    f.person("FEMALE", head, wife);
    f.person("MALE", head, wife);
    return f.tree(head);
  },
  /** 2 · Small and balanced: about a dozen, as many women as men. */
  small(lang: Lang = "ar") {
    const f = new Family(`sf2-${lang}`, lang, 202);
    const head = f.person("MALE");
    const wife = f.wife(head);
    const [s1, d1, s2, d2] = [f.person("MALE", head, wife), f.person("FEMALE", head, wife), f.person("MALE", head, wife), f.person("FEMALE", head, wife)];
    const w1 = f.wife(s1);
    f.person("FEMALE", s1, w1); f.person("MALE", s1, w1);
    const w2 = f.wife(s2);
    f.person("MALE", s2, w2); f.person("FEMALE", s2, w2);
    f.daughtersFamily(d1, 2, 0.5);
    void d2;
    return f.tree(head);
  },
  /** 3 · Female-heavy: about 75% women; daughters with families of their own. */
  daughters(lang: Lang = "ar") {
    const f = new Family(`sf3-${lang}`, lang, 303);
    const head = f.person("MALE", ancestors(f, 3));
    grow(f, head, {
      head: { sons: 2, daughters: 5 }, depth: () => 4, kids: (r) => r.between(3, 5), daughters: 0.8,
      wives: () => 1, daughterFamily: 0.6, familyDaughters: 0.85, aSonEach: true,
    });
    return f.tree(head);
  },
  /** 4 · Male-heavy: about 75% men; sons with children. */
  sons(lang: Lang = "ar") {
    const f = new Family(`sf4-${lang}`, lang, 404);
    const head = f.person("MALE", ancestors(f, 3));
    grow(f, head, {
      head: { sons: 5, daughters: 0 }, depth: () => 3, kids: (r) => r.between(2, 4), daughters: 0.04,
      wives: () => 1, daughterFamily: 0, aSonEach: true,
    });
    return f.tree(head);
  },
  /** 5 · Spouse-heavy: several wives, a daughter married twice, children of each marriage. */
  spouses(lang: Lang = "ar") {
    const f = new Family(`sf5-${lang}`, lang, 505);
    const head = f.person("MALE", ancestors(f, 2));
    // the head: three wives, children by each
    const sons: MemberDTO[] = [];
    for (let w = 0; w < 3; w++) {
      const wife = f.wife(head);
      for (const c of f.children(head, wife, 3, 0.4)) if (c.gender === "MALE") sons.push(c);
    }
    // his sons: two wives each, children by both
    for (const [i, s] of sons.entries()) {
      for (let w = 0; w < (i % 3 === 2 ? 1 : 2); w++) f.children(s, f.wife(s), f.between(1, 2), 0.5);
    }
    // a daughter married twice, with children of both marriages
    const daughter = f.members.find((m) => m.gender === "FEMALE" && m.fatherId === head.id)!;
    f.daughtersFamily(daughter, 2);
    f.daughtersFamily(daughter, 1);
    return f.tree(head);
  },
  /** 6 · Medium: 60-80 people over five generations, branches of every size. */
  medium(lang: Lang = "ar") {
    const f = new Family(`sf6-${lang}`, lang, 606);
    const head = f.person("MALE", ancestors(f, 4));
    grow(f, head, {
      head: { sons: 4, daughters: 2 }, depth: (_r, b) => [5, 3, 4, 2][b % 4], kids: (r, gen) => (gen < 3 ? r.between(2, 3) : r.between(1, 2)), daughters: 0.45,
      wives: () => 1, daughterFamily: 0.25, aSonEach: true,
    });
    return f.tree(head);
  },
  /** 7 · Large: 150-200, uneven branches, several wives, sibling groups big and small. */
  large(lang: Lang = "ar") {
    const f = new Family(`sf7-${lang}`, lang, 707);
    const head = f.person("MALE", ancestors(f, 5));
    grow(f, head, {
      head: { sons: 5, daughters: 3 }, depth: (_r, b) => [6, 3, 5, 2, 3][b % 5], kids: (r, gen) => (gen === 1 && r.rand() < 0.5 ? r.between(5, 8) : gen <= 3 ? r.between(1, 2) : 1),
      daughters: 0.4, wives: (r, gen) => (gen < 3 && r.rand() < 0.25 ? 2 : 1), daughterFamily: 0.12, aSonEach: true,
    });
    return f.tree(head);
  },
  /** 8 · Very large: 300-500, many generations and marriages, more men than women. */
  huge(lang: Lang = "ar") {
    const f = new Family(`sf8-${lang}`, lang, 808);
    const head = f.person("MALE", ancestors(f, 6));
    grow(f, head, {
      head: { sons: 7, daughters: 2 }, depth: (_r, b) => [7, 6, 5, 7, 4, 6, 3][b % 7], kids: (r, gen) => (gen < 3 ? r.between(2, 3) : r.between(1, 2)),
      daughters: 0.12, wives: (r, gen) => (gen < 4 && r.rand() < 0.2 ? r.between(2, 3) : 1), daughterFamily: 0.3, aSonEach: true,
    });
    return f.tree(head);
  },
  /** 9 · Wide: 100-200 in three generations, very large sibling groups. */
  wide(lang: Lang = "ar") {
    const f = new Family(`sf9-${lang}`, lang, 909);
    const head = f.person("MALE", ancestors(f, 2));
    grow(f, head, {
      head: { sons: 9, daughters: 6 }, depth: () => 3, kids: (r, gen) => (gen === 1 ? r.between(6, 10) : r.between(0, 1)), daughters: 0.45,
      wives: () => 1, daughterFamily: 0.1,
    });
    return f.tree(head);
  },
  /** 10 · Deep and irregular: 100-200 over a dozen generations; one line runs far, others stop early. */
  deep(lang: Lang = "ar") {
    const f = new Family(`sf10-${lang}`, lang, 1010);
    const head = f.person("MALE", ancestors(f, 3));
    grow(f, head, {
      head: { sons: 5, daughters: 2 }, depth: (_r, b) => [13, 2, 9, 1, 6][b % 5], kids: (r, gen) => (gen < 3 || r.rand() < 0.3 ? 2 : 1), daughters: 0.35,
      wives: (r) => (r.rand() < 0.08 ? 2 : 1), daughterFamily: 0.12, single: 0.12, aSonEach: true,
    });
    return f.tree(head);
  },
} as const;

export type StressFamilyId = keyof typeof STRESS_FAMILIES;
export const STRESS_FAMILY_IDS = Object.keys(STRESS_FAMILIES) as StressFamilyId[];

/** What a family is made of. */
export function composition(t: TreeDTO) {
  const byId = new Map(t.members.map((m) => [m.id, m]));
  const kids = new Map<string, number>();
  for (const m of t.members) for (const p of [m.fatherId, m.motherId]) if (p) kids.set(p, (kids.get(p) ?? 0) + 1);
  const wivesOf = new Map<string, number>();
  for (const x of t.marriages) wivesOf.set(x.spouseAId, (wivesOf.get(x.spouseAId) ?? 0) + 1);
  const husbandsOf = new Map<string, number>();
  for (const x of t.marriages) husbandsOf.set(x.spouseBId, (husbandsOf.get(x.spouseBId) ?? 0) + 1);
  const gens = t.members.map((m) => m.generation);
  const crown = byId.get(t.crownBaseId ?? "")?.generation ?? 0;
  return {
    people: t.members.length,
    women: t.members.filter((m) => m.gender === "FEMALE").length,
    femaleShare: t.members.filter((m) => m.gender === "FEMALE").length / t.members.length,
    marriages: t.marriages.length,
    menWithSeveralWives: [...wivesOf.values()].filter((n) => n > 1).length,
    womenMarriedTwice: [...husbandsOf.values()].filter((n) => n > 1).length,
    generations: Math.max(...gens) - Math.min(...gens) + 1,
    generationsBelowCrown: Math.max(...gens) - crown,
    largestSiblingGroup: Math.max(0, ...kids.values()),
    ancestorsAboveCrown: crown - Math.min(...gens),
  };
}

/**
 * Genealogy errors a family must not have: unknown parents or spouses, a
 * father who is not a man or a mother who is not a woman, parents of a
 * child who are not married, loops, someone married to a parent or child,
 * the same marriage twice, siblings sharing a birth order.
 */
export function validateFamily(t: TreeDTO): string[] {
  const errors: string[] = [];
  const byId = new Map(t.members.map((m) => [m.id, m]));
  if (byId.size !== t.members.length) errors.push("duplicate member ids");
  const married = new Set(t.marriages.map((x) => `${x.spouseAId}|${x.spouseBId}`));
  if (married.size !== t.marriages.length) errors.push("the same marriage recorded twice");
  for (const x of t.marriages) {
    const a = byId.get(x.spouseAId), b = byId.get(x.spouseBId);
    if (!a || !b) { errors.push(`marriage ${x.id}: unknown spouse`); continue; }
    if (a.gender !== "MALE" || b.gender !== "FEMALE") errors.push(`marriage ${x.id}: husband and wife recorded the wrong way round`);
    if (a.fatherId === b.id || a.motherId === b.id || b.fatherId === a.id || b.motherId === a.id) errors.push(`marriage ${x.id}: parent and child`);
  }
  for (const m of t.members) {
    const f = m.fatherId ? byId.get(m.fatherId) : null, mo = m.motherId ? byId.get(m.motherId) : null;
    if (m.fatherId && !f) errors.push(`${m.id}: unknown father`);
    if (m.motherId && !mo) errors.push(`${m.id}: unknown mother`);
    if (f && f.gender !== "MALE") errors.push(`${m.id}: father is not a man`);
    if (mo && mo.gender !== "FEMALE") errors.push(`${m.id}: mother is not a woman`);
    if (f && mo && !married.has(`${f.id}|${mo.id}`)) errors.push(`${m.id}: parents not married`);
    // no one is their own ancestor
    const seen = new Set<string>();
    const stack = [m.fatherId, m.motherId].filter(Boolean) as string[];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === m.id) { errors.push(`${m.id}: own ancestor`); break; }
      if (seen.has(id)) continue;
      seen.add(id);
      const p = byId.get(id);
      if (p) stack.push(...([p.fatherId, p.motherId].filter(Boolean) as string[]));
    }
  }
  const orders = new Map<string, Set<number>>();
  for (const m of t.members) {
    if (!m.fatherId && !m.motherId) continue;
    const key = `${m.fatherId}|${m.motherId}`;
    const set = orders.get(key) ?? new Set<number>();
    if (set.has(m.birthOrder)) errors.push(`${m.id}: shares a birth order with a sibling`);
    set.add(m.birthOrder);
    orders.set(key, set);
  }
  if (!t.crownBaseId || !byId.has(t.crownBaseId)) errors.push("no canopy base");
  return errors;
}
