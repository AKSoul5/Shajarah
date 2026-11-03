// The family engine (src/lib/family): kin, branches, descendant counts,
// completeness, consistency findings, possible duplicates and combined
// search filters, on hand-built families and the layout QA's families.
import { describe, expect, it } from "vitest";
import { buildFamilyIndex, nasabIn } from "@/lib/family/index";
import { completenessOf, findings, branchMembers, possibleDuplicates } from "@/lib/family/quality";
import { peopleSearch } from "@/lib/family/filters";
import { nasab } from "@/lib/genealogy";
import { relationship } from "@/lib/relationship";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";

type Row = [id: string, name: string, gender: "M" | "F", father?: string | null, mother?: string | null, born?: number | null, died?: number | null];

function tree(rows: Row[], marriages: [string, string, number?, number?][] = [], extra: Partial<TreeDTO> = {}): TreeDTO {
  const members: MemberDTO[] = rows.map(([id, name, g, f, m, born, died], i) => ({
    id, name, laqab: null, gender: (g === "F" ? "FEMALE" : "MALE") as Gender, birthYear: born ?? null, deathYear: died ?? null,
    isDeceased: died != null, birthOrder: i, generation: 0, notes: null, fatherId: f ?? null, motherId: m ?? null,
  }));
  return {
    id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: rows[0][0], crownBaseId: null, trunkStartId: null,
    soilText: null, settings: null, members,
    marriages: marriages.map(([a, b, s, e], i) => ({ id: `m${i}`, spouseAId: a, spouseBId: b, startYear: s ?? null, endYear: e ?? null })),
    sources: [], citations: [], media: [], ...extra,
  };
}
const ids = (list: { id: string }[]) => list.map((x) => x.id);

// founder P (wives W1, W2); sons A (by W1), B (by W2); daughter D (by W1), married to outside H;
// A's sons a1, a2; B's son b1; D's son d1 (father H), d2 (father unknown)
const fam = tree([
  ["P", "سالم", "M", null, null, 1900, 1970],
  ["W1", "نورة", "F", null, null, 1905],
  ["W2", "هند", "F", null, null, 1910],
  ["A", "محمد", "M", "P", "W1", 1925],
  ["B", "علي", "M", "P", "W2", 1930],
  ["D", "سارة", "F", "P", "W1", 1928],
  ["H", "راشد", "M", null, null, 1920],
  ["a1", "فهد", "M", "A", null, 1950],
  ["a2", "سعد", "M", "A", null, 1952],
  ["b1", "عمر", "M", "B", null, 1955],
  ["d1", "ناصر", "M", "H", "D", 1950],
  ["d2", "مريم", "F", null, "D", 1953],
], [["P", "W1", 1922], ["P", "W2", 1928], ["D", "H", 1948]]);
const ix = buildFamilyIndex(fam);

describe("kin", () => {
  it("parents, children (eldest first), spouses in marriage order", () => {
    expect(ix.parents("A")).toMatchObject({ father: { id: "P" }, mother: { id: "W1" } });
    expect(ids(ix.children("P"))).toEqual(["A", "B", "D"]);
    expect(ids(ix.children("D"))).toEqual(["d1", "d2"]);
    expect(ix.spouses("P").map((s) => s.person.id)).toEqual(["W1", "W2"]);
  });

  it("siblings by kind: full, paternal half, maternal half, and those that cannot be told", () => {
    expect(ix.siblings("A")).toEqual({ full: [ix.get("D")], paternal: [ix.get("B")], maternal: [], unknown: [] });
    expect(ix.siblings("B").paternal.map((x) => x.id).sort()).toEqual(["A", "D"]);
    // d1 and d2 share their mother; d2's father is not recorded
    expect(ids(ix.siblings("d1").unknown)).toEqual(["d2"]);
  });

  it("grandparents, grandchildren, uncles and aunts by side, first cousins, nephews and nieces", () => {
    expect(ids(ix.grandparents("a1")).sort()).toEqual(["P", "W1"]);
    expect(ids(ix.grandchildren("P")).sort()).toEqual(["a1", "a2", "b1", "d1", "d2"]);
    expect(ids(ix.parentsSiblings("a1").paternal).sort()).toEqual(["B", "D"]);
    expect(ids(ix.parentsSiblings("d1").maternal).sort()).toEqual(["A", "B"]);
    expect(ids(ix.firstCousins("a1")).sort()).toEqual(["b1", "d1", "d2"]);
    expect(ids(ix.nephewsNieces("A")).sort()).toEqual(["b1", "d1", "d2"]);
  });

  it("step-parents and step-children are derived from marriages, never from birth links", () => {
    expect(ids(ix.stepParents("A"))).toEqual(["W2"]);
    expect(ids(ix.stepParents("B"))).toEqual(["W1"]);
    expect(ids(ix.stepChildren("W2")).sort()).toEqual(["A", "D"]);
    expect(ix.stepChildren("P")).toEqual([]);
  });

  it("the lineage follows the traced parent upward (and the mother where no father is recorded)", () => {
    expect(ids(ix.lineage("a1"))).toEqual(["A", "P"]);
    expect(ids(ix.lineage("d2"))).toEqual(["D", "P"]);
  });

  it("agrees with the relationship engine on who are full and half brothers and sisters", () => {
    const r = (a: string, b: string) => relationship(fam.members, fam.marriages, a, b).english.toLowerCase();
    expect(r("A", "D")).not.toMatch(/half/);
    expect(r("A", "B")).toMatch(/half/);
  });
});

describe("branches and descendants", () => {
  it("the main branches are the reference person's children; a daughter's family belongs to her branch", () => {
    expect(ids(ix.branchHeads())).toEqual(["A", "B", "D"]);
    expect(ids(ix.branchesOf("a1"))).toEqual(["A"]);
    expect(ids(ix.branchesOf("d1"))).toEqual(["D"]);
    expect(ix.branchesOf("P")).toEqual([]);
    expect(ix.branchesOf("H")).toEqual([]);
  });

  it("someone descended from two branches is in both, the traced one first", () => {
    const t = tree([["P", "x", "M"], ["A", "x", "M", "P"], ["B", "x", "F", "P"], ["a", "x", "M", "A"], ["b", "x", "F", null, "B"], ["k", "x", "M", "a", "b"]]);
    expect(ids(buildFamilyIndex(t).branchesOf("k"))).toEqual(["A", "B"]);
  });

  it("descendants are counted once each, however many paths lead to them (cousin marriage)", () => {
    const t = tree([["P", "x", "M"], ["A", "x", "M", "P"], ["B", "x", "F", "P"], ["k", "x", "M", "A", "B"], ["g", "x", "M", "k"]]);
    const i = buildFamilyIndex(t);
    expect(i.descendants("P").size).toBe(4);
    expect(i.depthBelow("P")).toBe(3);
    expect(i.depthBelow("g")).toBe(0);
  });

  it("each branch's members are its head and their descendants", () => {
    expect(branchMembers(ix).map((b) => [b.head.id, b.ids.length])).toEqual([["A", 3], ["B", 2], ["D", 3]]);
  });
});

describe("completeness and findings (reported, never changed)", () => {
  it("missing fields only where they apply: no death year asked of the living; no parents asked of the root or of spouses", () => {
    const f = findings(ix, fam);
    const of = (id: string) => f.filter((x) => x.memberId === id && x.level === "missing").map((x) => x.kind);
    expect(of("A")).not.toContain("no-death-year");
    expect(of("P")).not.toContain("no-father");
    expect(of("W1")).not.toContain("no-father");
    expect(of("a1")).toContain("no-mother");
    expect(of("d2")).toContain("no-father");
  });

  it("confirmed problems: death before birth, a child born before a parent, a marriage ending before it began", () => {
    const t = tree([["P", "x", "M", null, null, 1900, 1890], ["c", "y", "M", "P", null, 1880], ["w", "z", "F"]], [["P", "w", 1930, 1920]]);
    const f = findings(buildFamilyIndex(t), t).filter((x) => x.level === "confirmed").map((x) => x.kind).sort();
    expect(f).toEqual(["child-before-parent", "death-before-birth", "marriage-ends-before-start"]);
  });

  it("possible issues, with the figures: a parent aged 9, a child born two years after the father died", () => {
    const t = tree([["P", "x", "M", null, null, 1900, 1940], ["c1", "y", "M", "P", null, 1909], ["c2", "z", "M", "P", null, 1942]]);
    const f = findings(buildFamilyIndex(t), t).filter((x) => x.level === "possible");
    expect(f.find((x) => x.kind === "young-parent")?.detail).toEqual({ age: 9 });
    expect(f.find((x) => x.kind === "born-after-father-died")?.memberId).toBe("c2");
  });

  it("no false alarms: a child born within a year of the father's death, an ordinary parent's age", () => {
    const t = tree([["P", "x", "M", null, null, 1900, 1940], ["c1", "y", "M", "P", null, 1941], ["c2", "z", "M", "P", null, 1930]]);
    expect(findings(buildFamilyIndex(t), t).filter((x) => x.level !== "missing")).toEqual([]);
  });

  it("a person recorded as their own ancestor is a confirmed problem", () => {
    const t = tree([["P", "x", "M"], ["a", "y", "M", "b"], ["b", "z", "M", "a"]]);
    expect(findings(buildFamilyIndex(t), t).filter((x) => x.kind === "own-ancestor").map((x) => x.memberId).sort()).toEqual(["a", "b"]);
  });

  it("possible duplicates: same name and same parent, years close; never brothers named alike years apart", () => {
    const t = tree([
      ["P", "x", "M"],
      ["s1", "عبد الله", "M", "P", null, 1950],
      ["s2", "عبدالله", "M", "P", null, 1951],
      ["s3", "محمد", "M", "P", null, 1950],
      ["s4", "محمد", "M", "P", null, 1962],
    ]);
    const d = possibleDuplicates(buildFamilyIndex(t));
    expect(d.map((x) => [x.memberId, ...(x.otherIds ?? [])])).toEqual([["s1", "s2"]]);
  });

  it("branch completeness by area: personal, relationships, history", () => {
    const c = completenessOf(ix, fam, branchMembers(ix)[0].ids);
    expect(c.people).toBe(3);
    expect(c.areas.personal.share).toBe(1);
    // a1 and a2 have no mother recorded; A has both parents
    expect(c.fields["no-mother"]).toEqual({ applicable: 3, missing: 2 });
    expect(c.areas.history.share).toBe(0);
  });
});

describe("people search with combined filters", () => {
  const search = peopleSearch(ix, fam);
  it("several words of a name and its line, Arabic letters normalised, in any order", () => {
    expect(ids(search.run({ text: "فهد محمد" }))).toEqual(["a1"]);
    expect(ids(search.run({ text: "سالم بن" })).length).toBeGreaterThan(1);
  });

  it("filters narrow together: gender, status, generation, branch, birth years, missing fields", () => {
    expect(ids(search.run({ gender: "FEMALE", generationFrom: 3 }))).toEqual(["d2"]);
    expect(ids(search.run({ branchId: "D" })).sort()).toEqual(["D", "d1", "d2"]);
    expect(ids(search.run({ branchId: "D", bornFrom: 1951 }))).toEqual(["d2"]);
    expect(ids(search.run({ status: "deceased" }))).toEqual(["P"]);
    expect(ids(search.run({ missing: "no-father", generationFrom: 2 }))).toEqual(["d2"]);
    expect(ids(search.run({ generationFrom: 2, generationTo: 2, includeSpouses: true })).sort()).toEqual(["A", "B", "D", "H"]);
  });

  it("is fast on a large family: 10,000 people indexed and searched", () => {
    const rows: Row[] = [["0", "جد", "M"]];
    const names = ["محمد", "علي", "سالم", "فهد", "نورة", "سارة"];
    for (let i = 1; i < 10_000; i++) rows.push([String(i), names[i % 6], i % 6 >= 4 ? "F" : "M", String(Math.floor((i - 1) / 4)), null, 1900 + (i % 100)]);
    const big = tree(rows);
    const t0 = performance.now();
    const bix = buildFamilyIndex(big);
    const s = peopleSearch(bix, big);
    const built = performance.now() - t0;
    const t1 = performance.now();
    const found = s.run({ text: "سالم محمد", gender: "MALE", bornFrom: 1950, generationFrom: 3 });
    const ran = performance.now() - t1;
    expect(found.length).toBeGreaterThan(0);
    expect(built).toBeLessThan(1500);
    expect(ran).toBeLessThan(100);
  });
});

describe("on the layout QA families", () => {
  it("the fast nasab is word for word the editor's", () => {
    for (const make of Object.values(QA_FIXTURES)) {
      const t = make();
      const i = buildFamilyIndex(t);
      for (const m of t.members.slice(0, 80)) expect(nasabIn(i, m.id, 3)).toBe(nasab(t.members, m.id, 3));
    }
  });

  it("every child is listed under each recorded parent, and every branch member descends from its head", () => {
    for (const make of Object.values(QA_FIXTURES)) {
      const t = make();
      const i = buildFamilyIndex(t);
      for (const m of t.members) {
        if (m.fatherId) expect(ids(i.children(m.fatherId))).toContain(m.id);
        if (m.motherId) expect(ids(i.children(m.motherId))).toContain(m.id);
      }
      for (const b of branchMembers(i)) for (const id of b.ids) if (id !== b.head.id) expect(i.descendants(b.head.id).has(id)).toBe(true);
    }
  });
});
