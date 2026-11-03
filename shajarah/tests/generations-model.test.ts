// Generation numbers (src/lib/family/generations.ts, docs/generation-numbering.md):
// every case the model names, on small hand-built families.
import { describe, expect, it } from "vitest";
import { generationBadge, generationLevels, generationText, referenceIdOf, type GenerationStatus } from "@/lib/family/generations";
import type { Gender, Lineage, MemberDTO, TreeDTO } from "@/lib/types";

/** A family from lines "id gender father mother" (- for unknown). */
function family(spec: string) {
  return spec.trim().split("\n").map((line) => {
    const [id, g, f, m] = line.trim().split(/\s+/);
    return { id, gender: (g === "F" ? "FEMALE" : "MALE") as Gender, fatherId: f === "-" ? null : f, motherId: m && m !== "-" ? m : null };
  });
}
const levels = (people: ReturnType<typeof family>, ref: string, marriages: [string, string][] = [], lineage: Lineage = "PATRILINEAL") =>
  generationLevels(people, lineage, ref, marriages.map(([a, b]) => ({ spouseAId: a, spouseBId: b })));
const lv = (m: Map<string, GenerationStatus>, id: string) => {
  const s = m.get(id);
  return s?.kind === "level" ? s.level : s?.kind;
};

describe("generation numbers", () => {
  // founder F; sons A, B; A's wife W (married in); A's children a1 (son), a2 (daughter);
  // a2's children by an outside husband H (h1) and by an unknown father (h2);
  // B's son b1; a2's grandchild g1 through h1.
  const base = family(`
    F M - -
    W F - -
    A M F -
    B M F -
    a1 M A W
    a2 F A W
    H M - -
    h1 M H a2
    h2 F - a2
    b1 M B -
    g1 M h1 -
  `);
  const marriages: [string, string][] = [["A", "W"], ["a2", "H"]];
  const g = levels(base, "F", marriages);

  it("the reference person is Generation 1; children 2; grandchildren 3", () => {
    expect([lv(g, "F"), lv(g, "A"), lv(g, "B"), lv(g, "a1"), lv(g, "b1")]).toEqual([1, 2, 2, 3, 3]);
  });

  it("a daughter's children follow her, whether their father is from another family or unknown, and so do theirs", () => {
    expect([lv(g, "h1"), lv(g, "h2"), lv(g, "g1")]).toEqual([4, 4, 5]);
    expect(g.get("h1")).toMatchObject({ via: "mother" });
  });

  it("spouses who married in have no number of their own and add no generation", () => {
    expect(g.get("W")).toEqual({ kind: "spouse", partnerLevels: [2] });
    expect(g.get("H")).toEqual({ kind: "spouse", partnerLevels: [3] });
    expect(lv(g, "a1")).toBe(3); // through his father, not his mother
  });

  it("someone with no birth link and no marriage to the family is unrelated, never given a number", () => {
    const m = levels([...base, ...family("X M - -")], "F", marriages);
    expect(m.get("X")).toEqual({ kind: "unrelated" });
  });

  it("multiple marriages: one father, three wives, every child the same generation", () => {
    const m = levels(family(`
      P M - -
      w1 F - -
      w2 F - -
      w3 F - -
      c1 M P w1
      c2 F P w2
      c3 M P w3
      c4 M P -
    `), "P", [["P", "w1"], ["P", "w2"], ["P", "w3"]]);
    expect(["c1", "c2", "c3", "c4"].map((id) => lv(m, id))).toEqual([2, 2, 2, 2]);
    expect(["w1", "w2", "w3"].map((id) => m.get(id)?.kind)).toEqual(["spouse", "spouse", "spouse"]);
  });

  it("a wife married into the family twice (two brothers in turn) is a spouse of both, still unnumbered", () => {
    const m = levels(family(`
      P M - -
      s1 M P -
      s2 M P -
      w F - -
      k1 M s1 w
      k2 M s2 w
    `), "P", [["s1", "w"], ["s2", "w"]]);
    expect(m.get("w")).toEqual({ kind: "spouse", partnerLevels: [2] });
    expect([lv(m, "k1"), lv(m, "k2")]).toEqual([3, 3]);
  });

  it("half-siblings: by the father, and by the mother, share a number", () => {
    const m = levels(family(`
      P M - -
      d F P -
      w1 F - -
      w2 F - -
      x1 M - -
      x2 M - -
      p1 M P w1
      p2 M P w2
      m1 M x1 d
      m2 F x2 d
    `), "P", [["P", "w1"], ["P", "w2"], ["d", "x1"], ["d", "x2"]]);
    expect([lv(m, "p1"), lv(m, "p2")]).toEqual([2, 2]);
    expect([lv(m, "m1"), lv(m, "m2")]).toEqual([3, 3]);
  });

  it("cousins: through brothers, through a brother and a sister, through two sisters, and second cousins", () => {
    const m = levels(family(`
      P M - -
      b1 M P -
      b2 M P -
      s1 F P -
      s2 F P -
      c1 M b1 -
      c2 M b2 -
      c3 M - s1
      c4 F - s2
      d1 M c1 -
      d2 M - c4
    `), "P");
    expect(["c1", "c2", "c3", "c4"].map((id) => lv(m, id))).toEqual([3, 3, 3, 3]);
    expect([lv(m, "d1"), lv(m, "d2")]).toEqual([4, 4]);
  });

  it("a person reached two ways keeps the traced parent's number and records the other", () => {
    // a son of generation 3 marries a granddaughter of his (generation 4): their child
    const m = levels(family(`
      P M - -
      a M P -
      b M a -
      c M b -
      x F c -
      y M a -
      kid M y x
    `), "P", [["y", "x"]]);
    // y is generation 3, x generation 5
    expect([lv(m, "y"), lv(m, "x")]).toEqual([3, 5]);
    expect(m.get("kid")).toEqual({ kind: "level", level: 4, via: "father", alt: { level: 6, via: "mother" } });
  });

  it("the reference person's ancestors, both sides, are numbered back from 1; their other descendants (uncles, cousins) too", () => {
    const m = levels(family(`
      GF M - -
      GM F - -
      MGF M - -
      father M GF GM
      mother F MGF -
      uncle M GF GM
      maunt F MGF -
      me M father mother
      cousin M uncle -
      mcousin F - maunt
    `), "me", [["father", "mother"]]);
    expect([lv(m, "me"), lv(m, "father"), lv(m, "mother"), lv(m, "GF"), lv(m, "GM"), lv(m, "MGF")]).toEqual([1, 0, 0, -1, -1, -1]);
    expect([lv(m, "uncle"), lv(m, "maunt"), lv(m, "cousin"), lv(m, "mcousin")]).toEqual([0, 0, 1, 1]);
  });

  it("unknown parents: a child of an unknown father follows the mother; a person with no parents is numbered only through a recorded link", () => {
    const m = levels(family(`
      P M - -
      d F P -
      k M - d
      lone M - -
    `), "P");
    expect(lv(m, "k")).toBe(3);
    expect(m.get("lone")?.kind).toBe("unrelated");
  });

  it("a maternal tree traces mothers first", () => {
    const m = levels(family(`
      M F - -
      h M - -
      d F h M
      x M - -
      k F x d
    `), "M", [["M", "h"], ["d", "x"]], "MATRILINEAL");
    expect([lv(m, "d"), lv(m, "k")]).toEqual([2, 3]);
    expect(m.get("k")).toMatchObject({ via: "mother" });
    expect(m.get("x")?.kind).toBe("spouse");
  });

  it("changing the reference person shifts every number by the same amount", () => {
    const fromF = levels(base, "F", marriages);
    const fromA = levels(base, "A", marriages);
    for (const id of ["F", "A", "B", "a1", "a2", "h1", "b1", "g1"]) expect(lv(fromA, id), id).toBe((lv(fromF, id) as number) - 1);
  });

  it("growing upward (a father added above the oldest ancestor) changes no number", () => {
    const grown = family(`
      OLD M - -
      F M OLD -
      A M F -
      a1 M A -
    `);
    const before = levels(grown.slice(1).map((p) => (p.id === "F" ? { ...p, fatherId: null } : p)), "F");
    const after = levels(grown, "F");
    for (const id of ["F", "A", "a1"]) expect(lv(after, id)).toBe(lv(before, id));
    expect(lv(after, "OLD")).toBe(0);
  });

  it("is safe on a cycle in bad data (no hang; those caught in it are not numbered)", () => {
    const m = levels(family(`
      P M - -
      x M y -
      y M x -
    `), "P");
    expect(lv(m, "P")).toBe(1);
    expect(m.get("x")?.kind).toBe("unrelated");
  });

  it("10,000 people in well under a second", () => {
    const people: { id: string; gender: Gender; fatherId: string | null; motherId: string | null }[] = [{ id: "0", gender: "MALE", fatherId: null, motherId: null }];
    for (let i = 1; i < 10_000; i++) people.push({ id: String(i), gender: i % 3 ? "MALE" : "FEMALE", fatherId: String(Math.floor((i - 1) / 4)), motherId: null });
    const t0 = performance.now();
    const m = levels(people, "0");
    expect(performance.now() - t0).toBeLessThan(500);
    expect(m.size).toBe(10_000);
    expect(lv(m, "9999")).toBe(8);
  });
});

describe("how generations read", () => {
  it("in English and Arabic, never as 0 or a negative number", () => {
    const at = (level: number): GenerationStatus => ({ kind: "level", level, via: "father" });
    expect(generationText(at(4))).toBe("Generation 4");
    expect(generationText(at(4), "ar")).toBe("الجيل الرابع");
    expect(generationText(at(0))).toBe("1 generation before Generation 1");
    expect(generationText(at(-2))).toBe("3 generations before Generation 1");
    expect(generationText(at(0), "ar")).toBe("قبل الجيل الأول بجيل واحد");
    expect(generationText({ kind: "spouse", partnerLevels: [4] }, "en", "FEMALE")).toBe("Wife of a Generation 4 member");
    expect(generationText({ kind: "spouse", partnerLevels: [4] }, "ar", "FEMALE")).toBe("زوجة من الجيل الرابع");
    expect(generationText({ kind: "unrelated" })).toBe("Not related by blood");
    expect([generationBadge(at(3)), generationBadge(at(0)), generationBadge({ kind: "unrelated" })]).toEqual(["G3", "G−1", "—"]);
  });
});

describe("the reference person", () => {
  const t = (over: Partial<TreeDTO>) => ({ settings: null, crownBaseId: null, rootMemberId: null, members: [{ id: "r" }, { id: "c" }, { id: "x" }] as MemberDTO[], ...over });
  it("is the chosen one; else the canopy's start; else the root; a removed person is skipped", () => {
    expect(referenceIdOf(t({ settings: { referenceId: "x" }, crownBaseId: "c", rootMemberId: "r" }))).toBe("x");
    expect(referenceIdOf(t({ crownBaseId: "c", rootMemberId: "r" }))).toBe("c");
    expect(referenceIdOf(t({ rootMemberId: "r" }))).toBe("r");
    expect(referenceIdOf(t({ settings: { referenceId: "gone" }, rootMemberId: "r" }))).toBe("r");
  });
});
