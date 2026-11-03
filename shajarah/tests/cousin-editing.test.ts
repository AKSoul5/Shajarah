// Adding a relative by name who is already recorded (a cousin): the people
// it may be are offered with their nasab, so they are linked rather than
// recorded twice; and a deletion says what is still linked to the person.
import { describe, expect, it } from "vitest";
import { existingByName, referencesTo } from "@/lib/family/matches";
import type { MemberDTO } from "@/lib/types";

const person = (id: string, name: string, gender: MemberDTO["gender"], fatherId: string | null = null, motherId: string | null = null): MemberDTO => ({
  id, name, gender, fatherId, motherId, laqab: null, birthYear: null, deathYear: null, isDeceased: false, birthOrder: 0, generation: 0, notes: null,
});

describe("someone already recorded", () => {
  const members = [
    person("g", "سالم", "MALE"),
    person("a", "خالد", "MALE", "g"), person("b", "عمر", "MALE", "g"),
    person("ahmad", "أحمد", "MALE", "a"),
    person("fatimah", "فاطمة", "FEMALE", "b"),
    // a namesake with no parents recorded (married in from another family)
    person("fatimah2", "فاطمة بنت ناصر", "FEMALE"),
  ];

  it("finds the cousin by her name, hamza forms aside, with the one of the family first", () => {
    const found = existingByName(members, "فاطمه", { gender: "FEMALE" });
    expect(found.map((m) => m.id)).toEqual(["fatimah", "fatimah2"]);
    // the whole name matches exactly
    expect(existingByName(members, "فاطمة بنت ناصر").map((m) => m.id)).toEqual(["fatimah2"]);
    // hamza: احمد finds أحمد
    expect(existingByName(members, "احمد").map((m) => m.id)).toEqual(["ahmad"]);
  });

  it("never offers the wrong gender, the person themself, or a name that is only a part", () => {
    expect(existingByName(members, "فاطمة", { gender: "MALE" })).toEqual([]);
    expect(existingByName(members, "أحمد", { exclude: new Set(["ahmad"]) })).toEqual([]);
    expect(existingByName(members, "فاطمة بنت")).toEqual([]);
    expect(existingByName(members, "ف")).toEqual([]);
  });

  it("says what a deletion would unlink", () => {
    const tree = {
      members: [...members, person("c1", "يوسف", "MALE", "ahmad", "fatimah")],
      marriages: [{ spouseAId: "ahmad", spouseBId: "fatimah" }],
      citations: [{ memberId: "fatimah" }, { memberId: "ahmad" }],
      media: [{ memberId: "fatimah" }],
    };
    expect(referencesTo(tree, "fatimah")).toEqual({ children: 1, spouses: 1, citations: 1, media: 1 });
    expect(referencesTo(tree, "g")).toEqual({ children: 2, spouses: 0, citations: 0, media: 0 });
  });
});
