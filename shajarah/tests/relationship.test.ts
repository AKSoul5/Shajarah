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
    expect(rel("f").arabic).toBe("محمد أب أحمد");
    expect(rel("mg").arabic).toBe("علي جد أحمد لأمّه");
    expect(rel("a1").arabic).toBe("زياد ابن أحمد");
    expect(rel("a2").arabic).toBe("وليد حفيد أحمد");
  });
  it("goes further through the shared ancestor, and gives the path between them", () => {
    const r = rel("gb2");
    expect(r.english).toBe("ماهر is أحمد's second cousin (through سالم)");
    expect(r.arabic).toContain("في سالم");
    expect(r.common).toEqual(["gg"]);
    expect(r.path).toEqual(["a", "f", "g", "gg", "gb", "gb1", "gb2"]);
    // a brother and sister share both parents
    expect(new Set(rel("s").common)).toEqual(new Set(["f", "m"]));
  });
  it("names a spouse, and says when there is no recorded kinship", () => {
    expect(relationship(people, marriages, "m", "w2").arabic).toBe("لا تجمع ندى وخلود قرابة نسب مسجّلة");
    expect(relationship(people, marriages, "f", "m").arabic).toBe("ندى زوجة محمد");
  });
});
