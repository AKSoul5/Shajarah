// Families for the name typography and spacing checks (tests/qa/typography-spacing):
// names with titles and honorifics of every kind, in Arabic and English,
// beside short names; and sisters with several husbands (cases A-F), each
// with a control that differs only in that sister having one husband, so a
// comparison measures what the extra marriages alone move. Deterministic.
import { computeGenerations } from "../genealogy";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

class Fam {
  members: MemberDTO[] = [];
  marriages: MarriageDTO[] = [];
  private n = 0;
  constructor(readonly id: string) {}
  person(name: string, gender: Gender, father: MemberDTO | null = null, mother: MemberDTO | null = null, laqab: string | null = null): MemberDTO {
    const order = this.members.filter((m) => father && m.fatherId === father.id).length;
    const m: MemberDTO = {
      id: `${this.id}-${this.n++}`, name, laqab, gender, birthYear: null, deathYear: null, isDeceased: false,
      birthOrder: father ? order : 0, generation: 0, notes: null, fatherId: father?.id ?? null, motherId: mother?.id ?? null,
    };
    this.members.push(m);
    return m;
  }
  marry(h: MemberDTO, w: MemberDTO) {
    this.marriages.push({ id: `${this.id}-mar${this.marriages.length}`, spouseAId: h.id, spouseBId: w.id, startYear: null, endYear: null });
  }
  /** A spouse from outside and their children (named in turn from `names`). */
  family(person: MemberDTO, spouseName: string, children: [string, Gender][]): MemberDTO[] {
    const outside = this.person(spouseName, person.gender === "MALE" ? "FEMALE" : "MALE");
    const [h, w] = person.gender === "MALE" ? [person, outside] : [outside, person];
    this.marry(h, w);
    return children.map(([name, g]) => this.person(name, g, h, w));
  }
  tree(title: string, crown: MemberDTO): TreeDTO {
    const gens = computeGenerations(this.members, "PATRILINEAL");
    for (const m of this.members) m.generation = gens.get(m.id) ?? 0;
    return {
      id: this.id, name: this.id, title, subtitle: null, lineage: "PATRILINEAL", rootMemberId: this.members[0].id,
      crownBaseId: crown.id, trunkStartId: null, soilText: null, settings: null,
      members: this.members, marriages: this.marriages, sources: [], citations: [], media: [],
    };
  }
}

const M = "MALE" as const, F = "FEMALE" as const;

/** Titles and honorifics in Arabic: before the name, after it (laqab), several at once, with diacritics, beside short names. */
export function titlesArabic(): TreeDTO {
  const f = new Fam("ty-ar");
  const a = f.person("عبدالكريم", M);
  const head = f.person("الشيخ محمد بن عبدالرحمن بن فيصل", M, a, null, "رحمه الله");
  const kids = f.family(head, "صاحبة السمو الأميرة الجوهرة بنت فيصل آل سعود", [
    ["صاحب السمو الملكي الأمير عبدالعزيز بن فيصل آل سعود", M], ["علي", M], ["سعادة الدكتور عبدالرحمن بن محمد الكلالي", M],
    ["سمو الأميرة نورة بنت عبدالعزيز آل سعود", F], ["زيد", M], ["معالي الأستاذ الدكتور أحمد بن عبدالله العتيبي", M],
    ["هند", F], ["صاحب السعادة المهندس خالد بن عبدالعزيز", M], ["مُحَمَّد", M], ["فضيلة الشيخ عبدالله بن صالح بن محمد", M],
  ]);
  const [prince, ali, doctor, , zayd, maali, , eng, , sheikh] = kids;
  f.family(prince, "منى", [["عَبْدُ الرَّحْمٰنِ", M], ["عمر", M], ["الدكتورة لولوة بنت عبدالعزيز", F]]);
  f.family(ali, "الأستاذة عائشة بنت سليمان الشمري", [["سعد", M], ["عبدالمحسن", M]]);
  f.family(doctor, "ريم", [["المهندس فهد", M], ["طلال", M], ["العنود", F]]).forEach((k, i) => { if (i === 1) k.laqab = "الأصغر"; });
  f.family(zayd, "سارة", [["عبدالله الأول", M], ["عبدالله الثاني", M]]);
  f.family(maali, "الدكتورة هيا", [["Dr. محمد العتيبي", M], ["الدكتور John Smith", M]]);
  f.family(eng, "منيرة", [["بدر", M]]);
  f.family(sheikh, "حصة", [["الشيخ سليمان بن عبدالله", M], ["يوسف", M]]);
  return f.tree("شجرة الألقاب", head);
}

/** The same in English: titles before and after names, several at once, particles, beside short names. */
export function titlesEnglish(): TreeDTO {
  const f = new Fam("ty-en");
  const a = f.person("Abdul Karim", M);
  const head = f.person("Sheikh Abdulrahman bin Faisal Al-Kalali", M, a, null, "the Elder");
  const kids = f.family(head, "HRH Princess Jawahir bint Faisal Al Saud", [
    ["Dr. Alexander William Thompson", M], ["Al", M], ["Professor Jonathan Christopher Montgomery", M],
    ["Lady Charlotte Elizabeth Ashworth", F], ["Jo", M], ["His Excellency Ahmed bin Mohammed Al-Fulan", M],
    ["Ann", F], ["Sir William Alexander Fitzgerald", M], ["WILLIAM", M], ["HRH Prince Abdullah bin Khalid", M],
  ]);
  const [dr, al, prof, , jo, he, , sir, , hrh] = kids;
  f.family(dr, "Mary", [["H.E. Ambassador Mohammed bin Saleh", M], ["Ed", M], ["Dr. Grace O'Neill-Montgomery", F]]);
  f.family(al, "Professor Emma Lindqvist", [["Sam", M], ["Jean-Baptiste de la Croix", M]]);
  f.family(prof, "Eve", [["Rev. Canon Thomas Hughes", M], ["Tom", M], ["Lucy", F]]).forEach((k, i) => { if (i === 1) k.laqab = "Jr."; });
  f.family(jo, "Sarah", [["Ibn Battuta", M], ["Ibrahim ibn Yusuf", M]]);
  f.family(he, "Dr. Hessa", [["Dr. محمد العتيبي", M], ["الدكتور John Smith", M]]);
  f.family(sir, "Rose", [["Ben", M]]);
  f.family(hrh, "Jane", [["Sheikh Sulayman bin Abdullah", M], ["Hugh", M]]);
  return f.tree("Family Tree of Titles", head);
}

/** Sisters with several husbands. `husbands` lists each sister's marriages as their numbers of children; sons sit between them. */
function sisters(id: string, lang: "ar" | "en", husbands: number[][], sonKids: number[], grandkids = 0): TreeDTO {
  const ar = lang === "ar";
  const f = new Fam(id);
  const head = f.person(ar ? "محمد" : "Muhammad", M, f.person(ar ? "عبدالله" : "Abdullah", M));
  const wife = f.person(ar ? "نورة" : "Noura", F);
  f.marry(head, wife);
  const sons = ar ? ["خالد", "عبدالرحمن", "سعد", "فهد", "ناصر"] : ["Khalid", "Abdulrahman", "Saad", "Fahd", "Nasir"];
  const daughters = ar ? ["سارة", "الجوهرة", "هند", "مريم", "لطيفة"] : ["Sarah", "Jawahir", "Hind", "Maryam", "Latifa"];
  const husbandsOut = ar ? ["فيصل العتيبي", "سلطان القحطاني", "تركي الدوسري", "بدر الشمري", "ماجد الحربي"] : ["Faisal Al-Otaibi", "Sultan Al-Qahtani", "Turki Al-Dosari", "Badr Al-Shammari", "Majid Al-Harbi"];
  const kidNames = ar ? ["علي", "عمر", "زيد", "منى", "ريم", "يوسف", "حمد", "لولوة"] : ["Ali", "Umar", "Zayd", "Mona", "Reem", "Yusuf", "Hamad", "Lulwa"];
  let k = 0, h = 0;
  const kid = (): [string, Gender] => [kidNames[k % kidNames.length], k++ % 3 === 2 ? F : M];
  const n = Math.max(husbands.length, sonKids.length);
  for (let i = 0; i < n; i++) {
    if (i < sonKids.length) {
      const s = f.person(sons[i], M, head, wife);
      if (sonKids[i]) for (const c of f.family(s, ar ? "منيرة" : "Munira", Array.from({ length: sonKids[i] }, kid))) {
        if (grandkids && c.gender === M) f.family(c, ar ? "هيا" : "Haya", Array.from({ length: grandkids }, kid));
      }
    }
    if (i < husbands.length) {
      const d = f.person(daughters[i], F, head, wife);
      for (const count of husbands[i]) {
        for (const c of f.family(d, husbandsOut[h++ % husbandsOut.length], Array.from({ length: count }, kid))) {
          if (grandkids && c.gender === M) f.family(c, ar ? "هيا" : "Haya", Array.from({ length: grandkids }, kid));
        }
      }
    }
  }
  return f.tree(ar ? "شجرة العائلة" : "Family Tree", head);
}

/**
 * Cases A-F, each with its control (the same family, the sister with several
 * husbands married once, with the same children). `paper`: where the case is
 * judged (D roomy, E constrained).
 */
export const SISTER_CASES = {
  A: { test: [[2], [1, 2]], control: [[2], [3]], sons: [2, 1], paper: "A2" },
  B: { test: [[2], [1, 2], [1, 1, 1]], control: [[2], [3], [3]], sons: [2, 1, 2], paper: "A2" },
  C: { test: [[], [3], [1, 1], [2, 1, 2], [4]], control: [[], [3], [2], [5], [4]], sons: [1, 0, 2], paper: "A1" },
  D: { test: [[1], [1, 1], [1, 1, 1]], control: [[1], [2], [3]], sons: [1, 1], paper: "A1" },
  E: { test: [[4], [3, 4], [3, 3, 3]], control: [[4], [7], [9]], sons: [5, 4, 5], paper: "A3", grandkids: 2 },
} as const;
export type SisterCase = keyof typeof SISTER_CASES | "F";

export function sisterCase(c: keyof typeof SISTER_CASES, variant: "test" | "control", lang: "ar" | "en" = "ar"): TreeDTO {
  const s = SISTER_CASES[c];
  return sisters(`sis-${c}-${variant}-${lang}`, lang, s[variant].map((x) => [...x]), [...s.sons], "grandkids" in s ? s.grandkids : 0);
}

/** F: the same shapes for brothers with several wives (spouses shown): is the behaviour the daughters', or the shared geometry's? */
export function brothersCase(variant: "test" | "control", lang: "ar" | "en" = "ar"): TreeDTO {
  const ar = lang === "ar";
  const f = new Fam(`bro-F-${variant}-${lang}`);
  const head = f.person(ar ? "محمد" : "Muhammad", M, f.person(ar ? "عبدالله" : "Abdullah", M));
  const wife = f.person(ar ? "نورة" : "Noura", F);
  f.marry(head, wife);
  const wives = variant === "test" ? [[2], [1, 2], [1, 1, 1]] : [[2], [3], [3]];
  const sons = ar ? ["خالد", "سعد", "فهد"] : ["Khalid", "Saad", "Fahd"];
  const wifeNames = ar ? ["منيرة العتيبي", "هيا القحطاني", "ريم الدوسري"] : ["Munira Al-Otaibi", "Haya Al-Qahtani", "Reem Al-Dosari"];
  const kidNames = ar ? ["علي", "عمر", "زيد", "منى"] : ["Ali", "Umar", "Zayd", "Mona"];
  let k = 0;
  for (const [i, marriages] of wives.entries()) {
    const s = f.person(sons[i], M, head, wife);
    f.person(ar ? "هند" : "Hind", F, head, wife);
    marriages.forEach((count, j) => f.family(s, wifeNames[j], Array.from({ length: count }, (): [string, Gender] => [kidNames[k++ % 4], M])));
  }
  return f.tree(ar ? "شجرة العائلة" : "Family Tree", head);
}
