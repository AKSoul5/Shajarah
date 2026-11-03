// The family in figures (src/lib/family/analytics.ts): every count checked
// on a hand-built family, and no figure stretched past the records.
import { describe, expect, it } from "vitest";
import { familyFigures } from "@/lib/family/analytics";
import { buildFamilyIndex } from "@/lib/family/index";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";

type Row = [id: string, name: string, g: "M" | "F", father?: string | null, mother?: string | null, born?: number | null, died?: number | null, deceased?: boolean];
function tree(rows: Row[], marriages: [string, string, number?][] = []): TreeDTO {
  return {
    id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: rows[0][0], crownBaseId: null, trunkStartId: null,
    soilText: null, settings: null, sources: [], citations: [], media: [],
    members: rows.map(([id, name, g, f, m, born, died, dec], i): MemberDTO => ({
      id, name, laqab: null, gender: (g === "F" ? "FEMALE" : "MALE") as Gender, birthYear: born ?? null, deathYear: died ?? null,
      isDeceased: dec ?? died != null, birthOrder: i, generation: 0, notes: null, fatherId: f ?? null, motherId: m ?? null,
    })),
    marriages: marriages.map(([a, b, y], i) => ({ id: `m${i}`, spouseAId: a, spouseBId: b, startYear: y ?? null, endYear: null })),
  };
}

const fam = tree([
  ["P", "سالم", "M", null, null, 1880, 1950],
  ["W1", "نورة", "F", null, null, 1885, 1960],
  ["W2", "هند", "F"],
  ["A", "محمد", "M", "P", "W1", 1905, 1980],
  ["B", "محمد", "M", "P", "W2", 1910, null, true],
  ["D", "سارة", "F", "P", "W1", 1912],
  ["a1", "أحمد", "M", "A", null, 1935],
  ["a2", "احمد", "M", "A", null, 1938],
  ["b1", "علي", "M", "B", null, 1940],
  ["d1", "مريم", "F", null, "D", 1950],
], [["P", "W1", 1903], ["P", "W2"], ["A", "D"]]);
const f = familyFigures(buildFamilyIndex(fam), fam, 2026);

describe("the family in figures", () => {
  it("overview: people, of the blood and married in, generations, branches, families, men and women, deceased", () => {
    expect(f.overview).toEqual({
      people: 10, bloodRelatives: 8, marriedIn: 2, unrelated: 0, generations: 3, branches: 3, families: 5,
      men: 6, women: 4, genderUnknown: 0, recordedDeceased: 4, notRecordedDeceased: 6,
    });
  });

  it("people by generation, men and women", () => {
    expect(f.byGeneration).toEqual([
      { level: 1, people: 1, men: 1, women: 0 },
      { level: 2, people: 3, men: 2, women: 1 },
      // (the daughter's child, whose father is not recorded, follows her)
      { level: 3, people: 4, men: 3, women: 1 },
    ]);
  });

  it("years: counted only where recorded, and saying how many that covers", () => {
    expect(f.birthCoverage).toEqual({ known: 9, of: 10 });
    expect(f.deathCoverage).toEqual({ known: 3, of: 4 }); // B is deceased with no year
    expect(f.birthsByDecade[0]).toEqual({ decade: 1880, count: 2 });
    expect(f.lifespans).toEqual([{ decade: 70, count: 3 }]);
  });

  it("the oldest not recorded as deceased, never anyone born over 110 years ago", () => {
    const t = tree([["P", "x", "M", null, null, 1900], ["c", "y", "M", "P", null, 1930], ["d", "z", "M", "P", null, 1945]]);
    expect(familyFigures(buildFamilyIndex(t), t, 2026).oldestLiving.map((p) => [p.id, p.age])).toEqual([["c", 96], ["d", 81]]);
  });

  it("names counted with letters normalised (أحمد and احمد are one name), shown as most often written", () => {
    expect(f.topNames.men.slice(0, 2)).toEqual([{ name: "محمد", count: 2 }, { name: "أحمد", count: 2 }]);
  });

  it("marriages: recorded, with a year, people married more than once, marriages within the family", () => {
    expect(f.marriages).toEqual({ total: 3, withYear: 1, severalMarriages: 1, withinFamily: 1 });
  });

  it("branches by size, with their depth", () => {
    expect(f.branches.map((b) => [b.id, b.people, b.generationsDeep])).toEqual([["A", 3, 2], ["B", 2, 2], ["D", 2, 2]]);
  });
});
