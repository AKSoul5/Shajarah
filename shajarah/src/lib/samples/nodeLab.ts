// The name-box preview's sample family (src/app/lab/nodes): one small
// family, the same people in Arabic and in English, so every design is
// judged on identical data. Generic names only.
//
// Each person is tagged with what the preview compares: an ordinary or a
// long name, and whether they have descendants on the poster.

import { computeGenerations } from "../genealogy";
import type { Gender, MemberDTO, TreeDTO } from "../types";

export type NameKind = "ordinary" | "long";
export interface LabCase {
  kind: NameKind;
  /** Has children drawn on the poster. */
  descendants: boolean;
  gender: Gender;
}

interface Spec {
  ar: string;
  en: string;
  gender?: Gender;
  laqab?: [string, string];
  children?: Spec[];
}

// (the long names: compound names with an honorific, the length real
// families have; the ordinary ones: one short given name)
const FAMILY: Spec = {
  ar: "سالم", en: "Salim",
  children: [
    {
      ar: "محمد", en: "Muhammad",
      children: [
        { ar: "علي", en: "Ali", children: [{ ar: "حمد", en: "Hamad" }, { ar: "زيد", en: "Zayd" }] },
        { ar: "فهد", en: "Fahd" },
        { ar: "عبد الكريم ذو النورين", en: "Abd al-Karim Dhu al-Nurayn" },
      ],
    },
    {
      ar: "عبد الرحمن بن عبد العزيز", en: "Abd al-Rahman ibn Abd al-Aziz", laqab: ["الأكبر", "the Elder"],
      children: [
        { ar: "عبد الملك الملقب بالأمين", en: "Abd al-Malik known as al-Amin", children: [{ ar: "سعد", en: "Saad" }, { ar: "عبد المحسن بن عبد الله", en: "Abd al-Muhsin ibn Abdullah" }] },
        { ar: "عمر", en: "Umar" },
        { ar: "هند", en: "Hind", gender: "FEMALE" },
      ],
    },
    { ar: "خالد", en: "Khalid" },
    { ar: "سليمان بن عبد الكريم الشيخ", en: "Sulayman ibn Abd al-Karim the Sheikh" },
    {
      ar: "نورة", en: "Noura", gender: "FEMALE",
      children: [{ ar: "ناصر", en: "Nasir" }, { ar: "لطيفة", en: "Latifa", gender: "FEMALE" }],
    },
    { ar: "عائشة أم عبد الرحمن", en: "Aisha Umm Abd al-Rahman", gender: "FEMALE" },
  ],
};

/** Long: a compound name, or two words or more. */
const isLong = (s: Spec) => s.en.split(/\s+/).length >= 2 || !!s.laqab;

/** The sample family in Arabic (`ar`) or English, and each person's case. */
export function nodeLabFamily(lang: "ar" | "en"): { tree: TreeDTO; cases: Record<string, LabCase> } {
  const members: MemberDTO[] = [];
  const cases: Record<string, LabCase> = {};
  let n = 0;
  const add = (name: string, gender: Gender, father: MemberDTO | null, mother: MemberDTO | null, laqab: string | null = null) => {
    const m: MemberDTO = {
      // (sample years, shown when a poster shows years: a second line under the name)
      id: `lab-${lang}-${n}`, name, laqab, gender, birthYear: 1880 + n * 6, deathYear: n < 9 ? 1945 + n * 5 : null, isDeceased: n < 9,
      birthOrder: n, generation: 0, notes: null, fatherId: father?.id ?? null, motherId: mother?.id ?? null,
    };
    n++;
    members.push(m);
    return m;
  };
  // a short trunk above the family's head, so the poster is complete
  const ancestors = lang === "ar" ? ["إبراهيم", "يوسف", "حسن"] : ["Ibrahim", "Yusuf", "Hasan"];
  let father: MemberDTO | null = null;
  for (const a of ancestors) father = add(a, "MALE", father, null);
  // a daughter's children have a father from another family (not drawn)
  const outside = add(lang === "ar" ? "راشد آل نصار" : "Rashid Al Nassar", "MALE", null, null);
  const place = (s: Spec, dad: MemberDTO | null, mum: MemberDTO | null): MemberDTO => {
    const gender = s.gender ?? "MALE";
    const m = add(lang === "ar" ? s.ar : s.en, gender, dad, mum, s.laqab ? s.laqab[lang === "ar" ? 0 : 1] : null);
    cases[m.id] = { kind: isLong(s) ? "long" : "ordinary", descendants: !!s.children?.length, gender };
    for (const c of s.children ?? []) {
      if (gender === "FEMALE") place(c, outside, m);
      else place(c, m, null);
    }
    return m;
  };
  const head = place(FAMILY, father, null);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  const daughters = members.filter((m) => m.gender === "FEMALE" && members.some((c) => c.motherId === m.id));
  return {
    tree: {
      id: `node-lab-${lang}`, name: `node-lab-${lang}`,
      title: lang === "ar" ? "عائلة للمعاينة" : "A Preview Family", subtitle: null,
      lineage: "PATRILINEAL", rootMemberId: members[0].id, crownBaseId: head.id, trunkStartId: null, soilText: null,
      settings: { showFemales: true, familiesThrough: daughters.map((d) => d.id), posterSize: "A3" },
      members, marriages: [{ id: `lab-${lang}-mar`, spouseAId: outside.id, spouseBId: daughters[0].id, startYear: null, endYear: null }],
      sources: [], citations: [], media: [],
    },
    cases,
  };
}
