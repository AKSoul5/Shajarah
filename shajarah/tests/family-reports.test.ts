// Reports (src/lib/family/reports.ts): the Ahnentafel's numbering, family
// group sheets for several marriages and an unrecorded parent, and the
// pedigree's slots.
import { describe, expect, it } from "vitest";
import { buildFamilyIndex } from "@/lib/family/index";
import { ahnentafel, groupSheets, pedigree } from "@/lib/family/reports";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";

type Row = [id: string, g: "M" | "F", father?: string | null, mother?: string | null];
function tree(rows: Row[], marriages: [string, string, number?][] = []): TreeDTO {
  return {
    id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: rows[0][0], crownBaseId: null, trunkStartId: null,
    soilText: null, settings: null, sources: [], citations: [], media: [],
    members: rows.map(([id, g, f, m], i): MemberDTO => ({
      id, name: id, laqab: null, gender: (g === "F" ? "FEMALE" : "MALE") as Gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: i, generation: 0, notes: null, fatherId: f ?? null, motherId: m ?? null,
    })),
    marriages: marriages.map(([a, b, y], i) => ({ id: `m${i}`, spouseAId: a, spouseBId: b, startYear: y ?? null, endYear: null })),
  };
}

describe("the Ahnentafel", () => {
  // me; father F, mother M; F's parents FF, FM; M's father MF (her mother unknown)
  const t = tree([["FF", "M"], ["FM", "F"], ["MF", "M"], ["F", "M", "FF", "FM"], ["M", "F", "MF"], ["me", "M", "F", "M"]]);
  const ix = buildFamilyIndex(t);
  it("numbers the subject 1, a father 2n and a mother 2n+1, keeping the gaps of those not recorded", () => {
    expect(ahnentafel(ix, "me").map((e) => [e.number, e.person.id, e.generation])).toEqual([
      [1, "me", 1], [2, "F", 2], [3, "M", 2], [4, "FF", 3], [5, "FM", 3], [6, "MF", 3],
    ]);
  });

  it("stops at the generations asked for", () => {
    expect(ahnentafel(ix, "me", 2).map((e) => e.number)).toEqual([1, 2, 3]);
  });

  it("an ancestor reached by two lines (cousins' child) is listed once, with the other number", () => {
    // G's son A and daughter B; A's son x and B's daughter y marry: their child k
    const c = tree([["G", "M"], ["A", "M", "G"], ["B", "F", "G"], ["x", "M", "A"], ["y", "F", null, "B"], ["k", "M", "x", "y"]]);
    const e = ahnentafel(buildFamilyIndex(c), "k").find((x) => x.person.id === "G")!;
    // k(1) → x(2) → A(4) → G(8); k(1) → y(3) → B(7) → G(14)
    expect(e.number).toBe(8);
    expect(e.alsoNumbers).toEqual([14]);
  });
});

describe("family group sheets", () => {
  // P married W1 (two children) and W2 (none); a child of P whose mother is not recorded
  const t = tree([["PF", "M"], ["P", "M", "PF"], ["W1", "F"], ["W2", "F"], ["c1", "M", "P", "W1"], ["c2", "F", "P", "W1"], ["c3", "M", "P"], ["s", "F"]],
    [["P", "W1", 1950], ["P", "W2", 1970], ["c1", "s"]]);
  const sheets = groupSheets(buildFamilyIndex(t), "P");
  it("one sheet per marriage, with the children the couple share, and one for children whose other parent is not recorded", () => {
    expect(sheets.map((s) => [s.husband?.id, s.wife?.id ?? null, s.marriage?.startYear ?? null, s.children.map((c) => c.person.id)])).toEqual([
      ["P", "W1", 1950, ["c1", "c2"]],
      ["P", "W2", 1970, []],
      ["P", null, null, ["c3"]],
    ]);
  });
  it("each partner's parents, and each child's own spouses", () => {
    expect(sheets[0].husbandParents.father?.id).toBe("PF");
    expect(sheets[0].wifeParents).toEqual({ father: undefined, mother: undefined });
    expect(sheets[0].children[0].spouses.map((x) => x.id)).toEqual(["s"]);
  });
  it("from the wife's side the same couple, she as the wife", () => {
    const fromHer = groupSheets(buildFamilyIndex(t), "W1");
    expect([fromHer[0].husband?.id, fromHer[0].wife?.id]).toEqual(["P", "W1"]);
  });
});

describe("the pedigree", () => {
  it("has 2^(g-1) slots in generation g, empty where a parent is not recorded", () => {
    const t = tree([["F", "M"], ["me", "M", "F"]]);
    const p = pedigree(buildFamilyIndex(t), "me", 3);
    expect(p.map((row) => row.length)).toEqual([1, 2, 4]);
    expect(p[1].map((n) => n.person?.id ?? null)).toEqual(["F", null]);
    expect(p[2].map((n) => n.number)).toEqual([4, 5, 6, 7]);
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartsPage } from "@/components/editor/ChartsPage";
import { LanguageProvider } from "@/lib/i18n";
import { QA_FIXTURES } from "@/lib/qa/fixtures";

describe("the Charts view", () => {
  (globalThis as unknown as { React: typeof React }).React = React;
  it("draws the pedigree for every person of a family, in English and Arabic", () => {
    const t = QA_FIXTURES.B();
    const ix = buildFamilyIndex(t);
    for (const lang of ["en", "ar"] as const) {
      for (const m of t.members) {
        const html = renderToStaticMarkup(React.createElement(LanguageProvider, { initial: lang, children: React.createElement(ChartsPage, { ix, marriages: t.marriages, sources: t, subjectId: m.id, onOpenMember: () => {} }) }));
        expect(html).toContain("<svg");
        expect(html).toContain(m.name);
      }
    }
  });

  it("draws the fan, hourglass and bowtie charts without error", async () => {
    const { FanChart, HourglassChart, BowtieChart } = await import("@/components/editor/MoreCharts");
    const { pedigree, descendantTree } = await import("@/lib/family/reports");
    const t = QA_FIXTURES.B();
    const ix = buildFamilyIndex(t);
    for (const m of t.members.slice(0, 40)) {
      const rows = pedigree(ix, m.id, 4);
      for (const el of [
        React.createElement(FanChart, { rows, rtl: true, onPick: () => {}, notRecorded: "—" }),
        React.createElement(HourglassChart, { rows, below: descendantTree(ix, m.id, 3), onPick: () => {}, notRecorded: "—" }),
        React.createElement(BowtieChart, { rows, rtl: false, onPick: () => {}, notRecorded: "—" }),
      ]) expect(renderToStaticMarkup(el)).toContain(m.name);
    }
  });
});

describe("the descendant tree (the hourglass's lower half)", () => {
  it("goes as deep as asked, eldest first, each descendant once", async () => {
    const { descendantTree } = await import("@/lib/family/reports");
    const t = tree([["P", "M"], ["A", "M", "P"], ["B", "F", "P"], ["a", "M", "A"], ["b", "F", null, "B"], ["k", "M", "a", "b"]]);
    const d = descendantTree(buildFamilyIndex(t), "P", 4)!;
    expect(d.children.map((c) => c.person.id)).toEqual(["A", "B"]);
    const ids: string[] = [];
    const walk = (n: typeof d) => { ids.push(n.person.id); n.children.forEach(walk); };
    walk(d);
    expect(ids.filter((x) => x === "k")).toHaveLength(1);
    expect(descendantTree(buildFamilyIndex(t), "P", 2)!.children.every((c) => c.children.length === 0)).toBe(true);
  });
});

describe("the family timeline", () => {
  it("lists births, marriages and deaths with recorded years, oldest first, and counts the undated", async () => {
    const { timeline } = await import("@/lib/family/reports");
    const t = tree([["P", "M"], ["W", "F"], ["c", "M", "P", "W"], ["d", "F", "P", "W"]], [["P", "W", 1920]]);
    t.members[0].birthYear = 1890; t.members[0].deathYear = 1960; t.members[0].isDeceased = true;
    t.members[2].birthYear = 1922;
    const ix = buildFamilyIndex(t);
    const { events, undatedBirths } = timeline(ix, t.marriages);
    expect(events.map((e) => [e.year, e.kind, e.people.map((p) => p.id).join("+")])).toEqual([
      [1890, "birth", "P"], [1920, "marriage", "P+W"], [1922, "birth", "c"], [1960, "death", "P"],
    ]);
    expect(undatedBirths).toBe(2);
    // limited to one branch
    expect(timeline(ix, t.marriages, new Set(["c"])).events.map((e) => e.people[0].id)).toEqual(["c"]);
  });
});

describe("the family register", () => {
  it("numbers families in order, lists children with roman numerals, and gives the number of those with families of their own", async () => {
    const { familyRegister, roman } = await import("@/lib/family/reports");
    const t = tree([["P", "M"], ["A", "M", "P"], ["B", "F", "P"], ["a1", "M", "A"], ["a2", "M", "A"], ["x", "M", "a1"]]);
    t.sources = [{ id: "s1", title: "Family papers", author: null, publication: null, notes: null } as never];
    t.citations = [{ id: "c1", sourceId: "s1", memberId: "A", eventType: null, page: null } as never, { id: "c2", sourceId: "s1", memberId: "A", eventType: null, page: null } as never];
    const r = familyRegister(buildFamilyIndex(t), t, "P", 4);
    expect(r.map((e) => [e.number, e.person.id, e.generation, e.line.join(">")])).toEqual([
      [1, "P", 1, ""], [2, "A", 2, "1"], [3, "a1", 3, "1>2"],
    ]);
    expect(r[0].children.map((c) => [c.roman, c.person.id, c.number])).toEqual([["i", "A", 2], ["ii", "B", null]]);
    expect(r[1].sources).toEqual(["Family papers"]);
    expect([roman(4), roman(9), roman(14)]).toEqual(["iv", "ix", "xiv"]);
  });
});
