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
        const html = renderToStaticMarkup(React.createElement(LanguageProvider, { initial: lang, children: React.createElement(ChartsPage, { ix, subjectId: m.id, onOpenMember: () => {} }) }));
        expect(html).toContain("<svg");
        expect(html).toContain(m.name);
      }
    }
  });
});
