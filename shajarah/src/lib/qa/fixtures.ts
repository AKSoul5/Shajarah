// The layout QA suite's families (see tests/qa/layout-qa.test.ts): built the
// same way every run, from generic names, so a change in a report is a
// change in the layout, never in the data.
//
//  A · balanced  four sons, each with sons and a daughter, four generations
//                under a short trunk: ordinary connector crossings.
//  B · complex   a man with three wives (marriage years recorded), children
//                by each; a wife's later husband; daughters married out with
//                children of their own; a daughter's children whose father
//                is not recorded: spouses, half-siblings, dotted families.
//  C · stress    nine main branches of very different sizes, one seven
//                generations deep, long names with honorifics, many
//                daughters' families, a long trunk and foundation.
//  C-en          C with every name in English (left-to-right poster).

import { computeGenerations } from "../genealogy";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

const AR = {
  m: ["محمد", "عبد الله", "سالم", "خالد", "عمر", "علي", "فهد", "سعد", "ناصر", "حمد", "يوسف", "إبراهيم", "سليمان", "عبد الرحمن", "حسن", "زيد", "طلال", "منصور", "راشد", "بدر"],
  f: ["نورة", "سارة", "هند", "مريم", "فاطمة", "عائشة", "لطيفة", "منيرة", "حصة", "رقية"],
  long: ["عبد الرحمن الأكبر", "عبد العزيز ذو النورين", "عبد الملك الملقب بالأمين", "سليمان بن عبد الكريم", "عبد الله الشيخ"],
  laqab: ["الأكبر", "الأوسط", "الأصغر", "الشيخ"],
  outside: ["آل نصار", "آل حمدان", "آل سعيد", "آل مبارك"],
};
const EN = {
  m: ["Muhammad", "Abdullah", "Salim", "Khalid", "Umar", "Ali", "Fahd", "Saad", "Nasir", "Hamad", "Yusuf", "Ibrahim", "Sulayman", "Abd al-Rahman", "Hasan", "Zayd", "Talal", "Mansur", "Rashid", "Badr"],
  f: ["Noura", "Sarah", "Hind", "Maryam", "Fatima", "Aisha", "Latifa", "Munira", "Hessa", "Ruqayya"],
  long: ["Abd al-Rahman the Elder", "Abd al-Aziz Dhu al-Nurayn", "Abd al-Malik known as al-Amin", "Sulayman ibn Abd al-Karim", "Abdullah the Sheikh"],
  laqab: ["the Elder", "the Middle", "the Younger", "the Sheikh"],
  outside: ["Al Nassar", "Al Hamdan", "Al Saeed", "Al Mubarak"],
};

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

class Builder {
  members: MemberDTO[] = [];
  marriages: MarriageDTO[] = [];
  private n = 0;
  constructor(readonly id: string, readonly names: typeof AR) {}
  person(gender: Gender, opts: { father?: MemberDTO | null; mother?: MemberDTO | null; name?: string; laqab?: string | null; order?: number } = {}): MemberDTO {
    const i = this.n++;
    const pool = gender === "FEMALE" ? this.names.f : this.names.m;
    const m: MemberDTO = {
      id: `${this.id}-${i}`, name: opts.name ?? pool[i % pool.length], laqab: opts.laqab ?? null, gender,
      birthYear: null, deathYear: null, isDeceased: false, birthOrder: opts.order ?? i, generation: 0, notes: null,
      fatherId: opts.father?.id ?? null, motherId: opts.mother?.id ?? null,
    };
    this.members.push(m);
    return m;
  }
  marry(a: MemberDTO, b: MemberDTO, startYear: number | null = null, endYear: number | null = null) {
    this.marriages.push({ id: `${this.id}-mar${this.marriages.length}`, spouseAId: a.id, spouseBId: b.id, startYear, endYear });
  }
  /** Ancestors above `top`, oldest first, ending at `top`'s father (returned). */
  trunk(count: number): MemberDTO {
    let father: MemberDTO | null = null;
    for (let i = 0; i < count; i++) father = this.person("MALE", { father, laqab: i % 7 === 3 ? this.names.laqab[i % 4] : null });
    return father!;
  }
  tree(title: string, crownBase: MemberDTO, trunkStartId: string | null = null): TreeDTO {
    const gens = computeGenerations(this.members, "PATRILINEAL");
    for (const m of this.members) m.generation = gens.get(m.id) ?? 0;
    return {
      id: this.id, name: this.id, title, subtitle: null, lineage: "PATRILINEAL", rootMemberId: this.members[0].id,
      crownBaseId: crownBase.id, trunkStartId, soilText: null, settings: null,
      members: this.members, marriages: this.marriages, sources: [], citations: [], media: [],
    };
  }
}

/** A · balanced. */
export function fixtureBalanced(): TreeDTO {
  const b = new Builder("qa-a", AR);
  const top = b.trunk(5);
  const head = b.person("MALE", { father: top });
  const grow = (p: MemberDTO, depth: number) => {
    if (depth >= 4) return;
    const sons = depth === 0 ? 4 : depth === 1 ? 3 : 2;
    for (let i = 0; i < sons; i++) grow(b.person("MALE", { father: p, order: i }), depth + 1);
    if (depth < 3) b.person("FEMALE", { father: p, order: sons });
  };
  grow(head, 0);
  return b.tree("شجرة العائلة", head);
}

/** B · complex. */
export function fixtureComplex(): TreeDTO {
  const b = new Builder("qa-b", AR);
  const top = b.trunk(4);
  const head = b.person("MALE", { father: top });
  // three wives, children by each (half-siblings), the marriages in order
  const wives = [0, 1, 2].map(() => b.person("FEMALE", { name: AR.f[b.members.length % AR.f.length] }));
  wives.forEach((w, i) => b.marry(head, w, 1950 + i * 8, i === 0 ? 1957 : null));
  const kids: MemberDTO[] = [];
  wives.forEach((w, wi) => {
    for (let k = 0; k < 3; k++) kids.push(b.person(k === 2 ? "FEMALE" : "MALE", { father: head, mother: w, order: wi * 3 + k }));
  });
  // the first wife's later husband (another family), and a child by him
  const later = b.person("MALE", { name: AR.outside[0] });
  b.marry(wives[0], later, 1960);
  b.person("MALE", { father: later, mother: wives[0] });
  // sons: their own wives and children; daughters: married out, children of their own
  for (const [i, c] of kids.entries()) {
    if (c.gender === "MALE") {
      const w = b.person("FEMALE");
      b.marry(c, w);
      for (let k = 0; k < 2 + (i % 2); k++) {
        const g = b.person(k === 2 ? "FEMALE" : "MALE", { father: c, mother: w, order: k });
        if (g.gender === "MALE" && i % 3 === 0) b.person("MALE", { father: g });
      }
    } else {
      const h = b.person("MALE", { name: AR.outside[(i + 1) % AR.outside.length] });
      b.marry(c, h);
      for (let k = 0; k < 2; k++) b.person(k ? "FEMALE" : "MALE", { father: h, mother: c, order: k });
    }
  }
  // a daughter's children whose father is not recorded
  const d = kids.find((k) => k.gender === "FEMALE")!;
  b.person("MALE", { mother: d });
  b.person("MALE", { mother: d });
  return b.tree("شجرة العائلة", head);
}

function stress(names: typeof AR, id: string, title: string): TreeDTO {
  const b = new Builder(id, names);
  const rand = seeded(7);
  const top = b.trunk(24);
  const head = b.person("MALE", { father: top, name: names.long[0] });
  // nine main branches, from a single son to a large family seven generations deep
  const sizes = [1, 2, 4, 9, 30, 6, 14, 3, 22];
  sizes.forEach((size, i) => {
    const son = b.person("MALE", { father: head, order: i, name: i % 3 === 1 ? names.long[(i % 4) + 1] : undefined, laqab: i === 4 ? names.laqab[0] : null });
    let left = size - 1;
    const frontier: [MemberDTO, number][] = [[son, 1]];
    while (left > 0 && frontier.length) {
      const [p, depth] = frontier.shift()!;
      const k = Math.min(left, depth > 5 ? 1 : 1 + Math.floor(rand() * 3));
      for (let j = 0; j < k && left > 0; j++, left--) {
        const female = rand() < 0.3;
        const c = b.person(female ? "FEMALE" : "MALE", { father: p, order: j, name: !female && rand() < 0.15 ? names.long[Math.floor(rand() * names.long.length)] : undefined });
        if (female && rand() < 0.5) {
          const h = b.person("MALE", { name: names.outside[Math.floor(rand() * names.outside.length)] });
          b.marry(c, h);
          for (let x = 0; x < 1 + Math.floor(rand() * 2); x++) b.person(rand() < 0.5 ? "MALE" : "FEMALE", { father: h, mother: c, order: x });
        } else if (!female && depth < 7) frontier.push([c, depth + 1]);
        if (!female && rand() < 0.25) b.marry(c, b.person("FEMALE"));
      }
    }
  });
  // the trunk shows the nearest ancestors, the older ones go to the foundation
  return b.tree(title, head, b.members[14].id);
}

/** C · stress (Arabic). */
export const fixtureStress = () => stress(AR, "qa-c", "شجرة العائلة الكبرى");
/** C-en · the stress family in English. */
export const fixtureStressEnglish = () => stress(EN, "qa-c-en", "The Extended Family Tree");

export const QA_FIXTURES = {
  A: fixtureBalanced,
  B: fixtureComplex,
  C: fixtureStress,
  "C-en": fixtureStressEnglish,
} as const;
export type QaFixture = keyof typeof QA_FIXTURES;
