// A poster that follows the mother's line from a man is all but empty (a
// man's children belong to their mother's line): the editor warns, and
// nothing about the genealogy is changed for the owner.
import { describe, expect, it } from "vitest";
import { maleRootOfMothersLine } from "@/lib/lineageNotice";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const person = (id: string, gender: "MALE" | "FEMALE", fatherId: string | null = null, motherId: string | null = null): MemberDTO => ({
  id, name: id, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId, motherId,
});
const tree = (lineage: TreeDTO["lineage"], rootMemberId: string | null): Pick<TreeDTO, "lineage" | "members" | "rootMemberId"> => ({
  lineage, rootMemberId,
  members: [person("grandfather", "MALE"), person("grandmother", "FEMALE"), person("daughter", "FEMALE", "grandfather", "grandmother"), person("son", "MALE", "grandfather", "grandmother")],
});

describe("mother's line from a man", () => {
  it("warns when the mother's line starts from a man", () => {
    expect(maleRootOfMothersLine(tree("MATRILINEAL", "grandfather"))?.id).toBe("grandfather");
  });
  it("does not warn when it starts from a woman", () => {
    expect(maleRootOfMothersLine(tree("MATRILINEAL", "grandmother"))).toBeNull();
  });
  it("does not warn on a father's-line poster, whoever the root", () => {
    expect(maleRootOfMothersLine(tree("PATRILINEAL", "grandfather"))).toBeNull();
    expect(maleRootOfMothersLine(tree("PATRILINEAL", "grandmother"))).toBeNull();
  });
  it("judges the root the poster actually uses when none is set", () => {
    // (the largest line in the mother's-line index: here the grandmother's)
    expect(maleRootOfMothersLine(tree("MATRILINEAL", null))).toBeNull();
  });
});
