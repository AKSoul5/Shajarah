// How two people are related: the nearest shared ancestor through fathers
// and mothers, and the Arabic name of the relation (عمّ or خال by the
// side it runs through, أخ شقيق or لأب or لأم, ابن عمّة …).
import { describe, expect, it } from "vitest";
import { relationship } from "@/lib/relationship";
import type { MemberDTO } from "@/lib/types";

const people: Pick<MemberDTO, "id" | "name" | "gender" | "fatherId" | "motherId">[] = [];
const add = (id: string, name: string, gender: "MALE" | "FEMALE", fatherId: string | null = null, motherId: string | null = null) =>
  people.push({ id, name, gender, fatherId, motherId });
// the father's side
add("gg", "سالم", "MALE");
add("g", "نبيل", "MALE", "gg");
add("gb", "قاسم", "MALE", "gg"); // the grandfather's brother
add("gb1", "حازم", "MALE", "gb");
add("gb2", "ماهر", "MALE", "gb1");
add("f", "محمد", "MALE", "g");
add("u", "عمر", "MALE", "g");
add("t", "بشرى", "FEMALE", "g");
// the mother's side
add("mg", "علي", "MALE");
add("m", "ندى", "FEMALE", "mg");
add("k", "معاذ", "MALE", "mg");
add("w2", "خلود", "FEMALE");
// A, his sisters and brothers
add("a", "أحمد", "MALE", "f", "m");
add("s", "مها", "FEMALE", "f", "m");
add("h", "هشام", "MALE", "f", "w2");
// cousins, a niece, a grandson
add("c1", "راكان", "MALE", "u");
add("c2", "لينا", "FEMALE", null, "t");
add("c3", "عاصم", "MALE", "k");
add("n", "غدير", "FEMALE", null, "s");
add("n2", "إدريس", "MALE", null, "n");
add("a1", "زياد", "MALE", "a");
add("a2", "وليد", "MALE", "a1");
const marriages = [{ spouseAId: "f", spouseBId: "m" }, { spouseAId: "f", spouseBId: "w2" }];
const rel = (b: string) => relationship(people, marriages, "a", b);

describe("how two people are related", () => {
  it("names brothers and sisters: full, or through the father or the mother only", () => {
    expect(rel("s").arabic).toBe("مها أخت أحمد الشقيقة");
    expect(rel("h").arabic).toBe("هشام أخو أحمد لأبيه");
    expect(relationship(people, marriages, "s", "h").arabic).toBe("هشام أخو مها لأبيها");
    expect(rel("h").english).toContain("half-brother (same father)");
  });
  it("names uncles and aunts by the side they are on: عمّ and عمّة, خال", () => {
    expect(rel("u").arabic).toBe("عمر عمّ أحمد");
    expect(rel("t").arabic).toBe("بشرى عمّة أحمد");
    expect(rel("k").arabic).toBe("معاذ خال أحمد");
  });
  it("names cousins by the parent they come through", () => {
    expect(rel("c1").arabic).toBe("راكان ابن عمّ أحمد");
    expect(rel("c2").arabic).toBe("لينا بنت عمّة أحمد");
    expect(rel("c3").arabic).toBe("عاصم ابن خال أحمد");
    expect(rel("c3").english).toContain("first cousin (mother's side)");
  });
  it("names nephews, nieces and their children, and great-uncles", () => {
    expect(rel("n").arabic).toBe("غدير بنت أخت أحمد");
    expect(rel("n2").arabic).toBe("إدريس حفيد أخت أحمد");
    expect(rel("gb").arabic).toBe("قاسم عمّ والد أحمد");
  });
  it("names parents, grandparents and descendants", () => {
    expect(rel("f").arabic).toBe("محمد والد أحمد");
    expect(rel("mg").arabic).toBe("علي جد أحمد لأمّه");
    expect(rel("a1").arabic).toBe("زياد ابن أحمد");
    expect(rel("a2").arabic).toBe("وليد حفيد أحمد");
  });
  it("goes further through the shared ancestor, and gives the path between them", () => {
    const r = rel("gb2");
    expect(r.english).toBe("ماهر is أحمد's second cousin (father's side) (through سالم)");
    expect(r.arabic).toBe("ماهر ابن عمّ أحمد من الدرجة الثانية");
    expect(r.steps).toEqual(["up", "up", "up", "down", "down", "down"]);
    expect(r.common).toEqual(["gg"]);
    expect(r.path).toEqual(["a", "f", "g", "gg", "gb", "gb1", "gb2"]);
    // a brother and sister share both parents
    expect(new Set(rel("s").common)).toEqual(new Set(["f", "m"]));
  });
  it("names a spouse, and says when there is no recorded kinship", () => {
    // two wives of one husband
    expect(relationship(people, marriages, "m", "w2").arabic).toBe("خلود زوجة أخرى لمحمد، زوجة ندى (ضرّتها)");
    const stranger = [...people, { id: "z", name: "منيرة", gender: "FEMALE" as const, fatherId: null, motherId: null }];
    expect(relationship(stranger, marriages, "gb2", "z").arabic).toBe("لا تجمع ماهر ومنيرة قرابة نسب ولا مصاهرة مسجّلة");
    // (خلود is no stranger to ماهر: the mother of هشام, his father's cousin's son)
    expect(relationship(people, [], "gb2", "w2").arabic).toBe("خلود زوجة ابن عمّ والد ماهر");
    expect(relationship(people, marriages, "f", "m").arabic).toBe("ندى زوجة محمد");
  });

  it("names in-laws: by the spouse they come through, or the relative they married", () => {
    // a son's wife and her father-in-law, a sister's husband, a wife's brother
    const fam = [...people,
      { id: "a1w", name: "سلمى", gender: "FEMALE" as const, fatherId: "x", motherId: null },
      { id: "x", name: "خالد", gender: "MALE" as const, fatherId: null, motherId: null },
      { id: "xb", name: "طارق", gender: "MALE" as const, fatherId: "x", motherId: null },
      { id: "sh", name: "فهد", gender: "MALE" as const, fatherId: null, motherId: null },
      { id: "c1w", name: "نورة", gender: "FEMALE" as const, fatherId: null, motherId: null },
    ];
    const wed = [...marriages, { spouseAId: "a1", spouseBId: "a1w" }, { spouseAId: "s", spouseBId: "sh" }, { spouseAId: "c1", spouseBId: "c1w" }];
    const r = (x: string, y: string) => relationship(fam, wed, x, y);
    expect(r("a", "a1w").arabic).toBe("سلمى زوجة ابن أحمد (كنّته)");
    expect(r("a", "a1w").english).toBe("سلمى is أحمد's daughter-in-law (son's wife)");
    expect(r("a1w", "a").arabic).toBe("أحمد والد زوج سلمى (حموها)");
    expect(r("a1w", "a").english).toBe("أحمد is سلمى's father-in-law (husband's father)");
    expect(r("a1w", "a").steps).toEqual(["spouse", "up"]);
    expect(r("a", "sh").arabic).toBe("فهد زوج أخت أحمد الشقيقة");
    expect(r("a", "sh").english).toBe("فهد is أحمد's brother-in-law (sister's husband)");
    expect(r("a1", "xb").arabic).toBe("طارق أخو زوجة زياد");
    expect(r("a1", "x").arabic).toBe("خالد والد زوجة زياد (حموه)");
    expect(r("a", "c1w").arabic).toBe("نورة زوجة ابن عمّ أحمد");
    expect(r("a", "c1w").path).toEqual(["a", "f", "g", "u", "c1", "c1w"]);
    expect(r("a", "x").arabic).toBe("خالد والد زوجة ابن أحمد");
  });
  it("names a spouse who is also a relative by both ties, the marriage first", () => {
    const wed = [...marriages, { spouseAId: "c1", spouseBId: "c2" }];
    const r = relationship(people, wed, "c1", "c2");
    expect(r.arabic).toBe("لينا زوجة راكان");
    expect(r.also?.arabic).toBe("لينا بنت عمّة راكان");
    // a man's own daughter is not also "his wife's daughter"
    expect(relationship(people, marriages, "f", "s").also).toBeUndefined();
  });
  it("names further cousins by their degree, and those a generation apart", () => {
    expect(rel("gb2").english).toContain("second cousin");
    expect(rel("gb1").arabic).toBe("حازم ابن عمّ والد أحمد");
    expect(rel("gb1").english).toBe("حازم is أحمد's first cousin once removed (father's first cousin) (through سالم)");
    expect(relationship(people, marriages, "gb1", "a").arabic).toBe("أحمد ابن ابن عمّ حازم");
  });
});
