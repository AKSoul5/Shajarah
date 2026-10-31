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
add("g", "مبارك", "MALE", "gg");
add("gb", "عوض", "MALE", "gg"); // the grandfather's brother
add("gb1", "حسن", "MALE", "gb");
add("gb2", "جمال", "MALE", "gb1");
add("f", "محمد", "MALE", "g");
add("u", "عمر", "MALE", "g");
add("t", "عائشة", "FEMALE", "g");
// the mother's side
add("mg", "علي", "MALE");
add("m", "نور", "FEMALE", "mg");
add("k", "فضل", "MALE", "mg");
add("w2", "مريم", "FEMALE");
// A, his sisters and brothers
add("a", "أحمد", "MALE", "f", "m");
add("s", "سارة", "FEMALE", "f", "m");
add("h", "حامد", "MALE", "f", "w2");
// cousins, a niece, a grandson
add("c1", "طلال", "MALE", "u");
add("c2", "منى", "FEMALE", null, "t");
add("c3", "خالد", "MALE", "k");
add("n", "ريم", "FEMALE", null, "s");
add("n2", "يوسف", "MALE", null, "n");
add("a1", "نوفل", "MALE", "a");
add("a2", "باسل", "MALE", "a1");
const marriages = [{ spouseAId: "f", spouseBId: "m" }, { spouseAId: "f", spouseBId: "w2" }];
const rel = (b: string) => relationship(people, marriages, "a", b);

describe("how two people are related", () => {
  it("names brothers and sisters: full, or through the father or the mother only", () => {
    expect(rel("s").arabic).toBe("سارة أخت أحمد الشقيقة");
    expect(rel("h").arabic).toBe("حامد أخو أحمد لأبيه");
    expect(relationship(people, marriages, "s", "h").arabic).toBe("حامد أخو سارة لأبيها");
    expect(rel("h").english).toContain("half-brother (same father)");
  });
  it("names uncles and aunts by the side they are on: عمّ and عمّة, خال", () => {
    expect(rel("u").arabic).toBe("عمر عمّ أحمد");
    expect(rel("t").arabic).toBe("عائشة عمّة أحمد");
    expect(rel("k").arabic).toBe("فضل خال أحمد");
  });
  it("names cousins by the parent they come through", () => {
    expect(rel("c1").arabic).toBe("طلال ابن عمّ أحمد");
    expect(rel("c2").arabic).toBe("منى بنت عمّة أحمد");
    expect(rel("c3").arabic).toBe("خالد ابن خال أحمد");
    expect(rel("c3").english).toContain("first cousin (mother's side)");
  });
  it("names nephews, nieces and their children, and great-uncles", () => {
    expect(rel("n").arabic).toBe("ريم بنت أخت أحمد");
    expect(rel("n2").arabic).toBe("يوسف حفيد أخت أحمد");
    expect(rel("gb").arabic).toBe("عوض عمّ والد أحمد");
  });
  it("names parents, grandparents and descendants", () => {
    expect(rel("f").arabic).toBe("محمد أب أحمد");
    expect(rel("mg").arabic).toBe("علي جد أحمد لأمّه");
    expect(rel("a1").arabic).toBe("نوفل ابن أحمد");
    expect(rel("a2").arabic).toBe("باسل حفيد أحمد");
  });
  it("goes further through the shared ancestor, and gives the path between them", () => {
    const r = rel("gb2");
    expect(r.english).toBe("جمال is أحمد's second cousin (through سالم)");
    expect(r.arabic).toContain("في سالم");
    expect(r.common).toEqual(["gg"]);
    expect(r.path).toEqual(["a", "f", "g", "gg", "gb", "gb1", "gb2"]);
    // a brother and sister share both parents
    expect(new Set(rel("s").common)).toEqual(new Set(["f", "m"]));
  });
  it("names a spouse, and says when there is no recorded kinship", () => {
    expect(relationship(people, marriages, "m", "w2").arabic).toBe("لا تجمع نور ومريم قرابة نسب مسجّلة");
    expect(relationship(people, marriages, "f", "m").arabic).toBe("نور زوجة محمد");
  });
});
