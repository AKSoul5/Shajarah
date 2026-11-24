// The member list starts at the family, not at آدم: in a lineage of 78
// generations the 70 ancestors above the canopy base are folded into one
// row, and a person's generation is said from the canopy base, in words
// ("3rd generation from فضل"), with the number counted from the root kept
// small for genealogists. (It once read "Generation 60" from Adam, beside a
// dot whose colour cycled through ten with no meaning.)
import { describe, expect, it } from "vitest";
import { generationLabel, inAncestralLine, ordinal } from "@/lib/generationLabel";
import { kalaliRealistic150 } from "@/lib/samples/kalali";
import type { MemberDTO } from "@/lib/types";

const tree = kalaliRealistic150();
const byId = new Map(tree.members.map((m) => [m.id, m]));
const base = byId.get(tree.crownBaseId!)!;
const childOf = (p: MemberDTO, gender?: string) => tree.members.find((m) => m.fatherId === p.id && (!gender || m.gender === gender));
/** Plain text, without the marks that keep a name whole inside an English sentence. */
const plain = (s: string) => s.replace(/[⁨⁩]/g, "");

describe("the member list starts at the family", () => {
  it("everyone above the canopy base is the ancestral line; the canopy base and its family are not", () => {
    const ancestors = tree.members.filter((m) => inAncestralLine(m, base));
    expect(ancestors).toHaveLength(70);
    expect(ancestors.every((m) => m.generation < base.generation)).toBe(true);
    expect(inAncestralLine(base, base)).toBe(false);
    expect(inAncestralLine(childOf(base)!, base)).toBe(false);
    // (no canopy base: no fold at all)
    expect(inAncestralLine(tree.members[0], null)).toBe(false);
  });

  it("says where someone stands from the canopy base, in words, with the root's number kept small", () => {
    expect(generationLabel(base, base)).toEqual({ words: "Canopy base", absolute: `G${base.generation + 1}` });
    const son = childOf(base, "MALE")!;
    expect(generationLabel(son, base).words).toBe("Son of the canopy base");
    const grandson = childOf(son)!;
    expect(plain(generationLabel(grandson, base).words)).toBe(`2nd generation from ${base.name}`);
    const great = childOf(grandson)!;
    expect(plain(generationLabel(great, base).words)).toBe(`3rd generation from ${base.name}`);
    const father = byId.get(base.fatherId!)!;
    expect(plain(generationLabel(father, base).words)).toBe(`1 generation above ${base.name}`);
    let up = base;
    for (let i = 0; i < 5; i++) up = byId.get(up.fatherId!)!;
    expect(plain(generationLabel(up, base).words)).toBe(`5 generations above ${base.name}`);
    expect(generationLabel(up, base).absolute).toBe(`G${up.generation + 1}`);
    // (the canopy base's name kept whole in its own direction inside the sentence)
    expect(generationLabel(grandson, base).words).toContain(`⁨${base.name}⁩`);
  });

  it("a daughter of the canopy base, someone of its own generation, and a family with no canopy base", () => {
    const daughter = { ...childOf(base)!, id: "d", gender: "FEMALE" as const };
    expect(generationLabel(daughter, base).words).toBe("Daughter of the canopy base");
    const cousin = { ...base, id: "cousin", fatherId: "elsewhere" };
    expect(plain(generationLabel(cousin, base).words)).toBe(`Same generation as ${base.name}`);
    expect(generationLabel(base, null)).toEqual({ words: `Generation ${base.generation + 1}`, absolute: `G${base.generation + 1}` });
  });

  it("ordinals in English", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
});
