// The poster's key and number cards: each label says exactly what its symbol
// shows, for a paternal or a maternal lineage, never assuming a gender, and
// every colour on the poster is explained.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout, textWidth } from "@/lib/layout/botanical";
import { generationColor, generationLabel } from "@/lib/layout/palette";
import { LEGEND, spouseLabel, statCards } from "@/lib/legend";
import { computeGenerations } from "@/lib/genealogy";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const NAMES = { ar: ["محمد", "عبد الله", "سالم", "خالد", "عمر", "علي", "فهد", "سعد"], en: ["Muhammad", "Abdullah", "Salim", "Khalid", "Umar", "Ali", "Fahd", "Saad"] };

/** A family `depth` generations deep below its root, two or three children each, some daughters; spouses as given. */
function family(opts: { depth: number; lineage?: "PATRILINEAL" | "MATRILINEAL"; arabic?: boolean; spouseGenders?: Gender[]; width?: number }): TreeDTO {
  const { depth, lineage = "PATRILINEAL", arabic = true, spouseGenders = [], width = 2 } = opts;
  const names = arabic ? NAMES.ar : NAMES.en;
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0;
  const lineGender: Gender = lineage === "MATRILINEAL" ? "FEMALE" : "MALE";
  const add = (parent: MemberDTO | null, gender: Gender, d: number): MemberDTO => {
    const m: MemberDTO = {
      id: `m${n}`, name: names[n++ % names.length], laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false,
      birthOrder: n, generation: 0, notes: null,
      fatherId: parent && lineage === "PATRILINEAL" ? parent.id : null, motherId: parent && lineage === "MATRILINEAL" ? parent.id : null,
    };
    members.push(m);
    if (d < depth) {
      const k = d === 0 ? 4 : d < 3 ? width : 1;
      for (let i = 0; i < k; i++) add(m, i === k - 1 && k > 1 ? (lineGender === "MALE" ? "FEMALE" : "MALE") : lineGender, d + 1);
    }
    return m;
  };
  // three ancestors above the family's root, on the trunk
  let above: MemberDTO | null = null;
  for (let i = 0; i < 3; i++) {
    const a: MemberDTO = {
      id: `a${i}`, name: names[(i + 3) % names.length], laqab: null, gender: lineGender, birthYear: null, deathYear: null, isDeceased: false,
      birthOrder: 0, generation: 0, notes: null,
      fatherId: above && lineage === "PATRILINEAL" ? above.id : null, motherId: above && lineage === "MATRILINEAL" ? above.id : null,
    };
    members.push(a);
    above = a;
  }
  const root = add(above, lineGender, 0);
  // (married to the root's first child: spouses are drawn beside people in the canopy)
  const firstChild = members.find((m) => (m.fatherId ?? m.motherId) === root.id)!;
  spouseGenders.forEach((g, i) => {
    const s: MemberDTO = { ...root, id: `s${i}`, name: arabic ? `نورة ${i}` : `Spouse ${i}`, gender: g, fatherId: null, motherId: null };
    members.push(s);
    marriages.push({ id: `mar${i}`, spouseAId: firstChild.id, spouseBId: s.id, startYear: null, endYear: null });
  });
  const gens = computeGenerations(members, lineage);
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    id: "t", name: "t", title: arabic ? "شجرة" : "Tree", subtitle: null, lineage, rootMemberId: "a0", crownBaseId: root.id, trunkStartId: null,
    soilText: null, settings: null, members, marriages, sources: [], citations: [], media: [],
  };
}

function render(tree: TreeDTO, theme: Record<string, unknown>) {
  const settings = { theme: { preset: "classic", v: 2, ...theme } } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const layout = computePosterLayout({ ...tree, settings }, { showFemales: true, ...layoutOptionsFor(t, "A1") });
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme: t }));
  return { layout, svg, theme: t };
}

describe("legend wording", () => {
  it("the spouse label never takes an unrecorded gender for either", () => {
    expect(spouseLabel(["MALE"], true)).toBe("زوج");
    expect(spouseLabel(["MALE", "MALE"], true)).toBe("زوج");
    expect(spouseLabel(["FEMALE"], true)).toBe("زوجة");
    expect(spouseLabel(["MALE", "FEMALE"], true)).toBe("زوج / زوجة");
    expect(spouseLabel(["UNKNOWN"], true)).toBe("زوج / زوجة");
    expect(spouseLabel(["UNKNOWN", "FEMALE"], true)).toBe("زوج / زوجة");
    expect(spouseLabel(["UNKNOWN", "MALE"], true)).toBe("زوج / زوجة");
    expect(spouseLabel([null, undefined], true)).toBe("زوج / زوجة");
    expect(spouseLabel(["MALE"], false)).toBe("Husband");
    expect(spouseLabel(["FEMALE"], false)).toBe("Wife");
    expect(spouseLabel(["UNKNOWN"], false)).toBe("Spouse");
  });

  it("the number cards", () => {
    const s = { total: 243, males: 181, females: 62, generations: 86 };
    expect(statCards(s, true).map((c) => c[0])).toEqual(["إجمالي الأفراد", "الذكور", "الإناث", "عدد الأجيال"]);
    expect(statCards(s, false).map((c) => c[0])).toEqual(["Total people", "Males", "Females", "Number of generations"]);
    expect(statCards(s, true).map((c) => c[1])).toEqual([243, 181, 62, 86]);
  });

  it("generations past the twentieth are numbered in Arabic-Indic digits", () => {
    expect(generationLabel(0, true)).toBe("الجيل الأول");
    expect(generationLabel(19, true)).toBe("الجيل العشرون");
    expect(generationLabel(20, true)).toBe("الجيل ٢١");
    expect(generationLabel(20, false)).toBe("Generation 21");
  });

  for (const lineage of ["PATRILINEAL", "MATRILINEAL"] as const) {
    it(`a ${lineage.toLowerCase()} poster calls the trunk's line سلسلة النسب`, () => {
      const { svg } = render(family({ depth: 4, lineage }), {});
      expect(svg).toContain(LEGEND.lineage.ar);
      expect(svg).not.toContain("سلسلة الآباء");
      expect(svg).toContain(LEGEND.descendants.ar);
      expect(svg).toContain("إجمالي الأفراد");
      expect(svg).toContain("عدد الأجيال");
    });
  }

  it("English posters use the English wording", () => {
    const { svg } = render(family({ depth: 4, arabic: false, spouseGenders: ["UNKNOWN"] }), { motherNames: true });
    for (const w of [LEGEND.lineage.en, LEGEND.descendants.en, "Total people", "Number of generations"]) expect(svg).toContain(w);
    expect(svg).toContain(">Spouse<");
  });

  for (const [genders, label] of [[["MALE"], "زوج"], [["FEMALE"], "زوجة"], [["UNKNOWN"], "زوج / زوجة"], [["FEMALE", "UNKNOWN"], "زوج / زوجة"]] as const) {
    it(`spouses drawn ${genders.join(" + ")}: "${label}"`, () => {
      const { svg, layout } = render(family({ depth: 3, spouseGenders: [...genders] }), { motherNames: true });
      expect(layout.spouses.filter((s) => !s.knot).length).toBe(genders.length);
      expect(svg).toContain(`>${label}<`);
      if (label !== "زوجة") expect(svg).not.toContain(">زوجة<");
    });
  }

  it("the dotted-line entry appears only when dotted lines are drawn, in the new wording", () => {
    const { svg, layout } = render(family({ depth: 3 }), {});
    expect(svg.includes(LEGEND.throughDaughters.ar)).toBe(layout.branches.some((b) => b.dotted));
    expect(svg).not.toContain(">عن طريق البنات<");
  });
});

describe("every colour on the poster is in the key", () => {
  it("each branch colour the poster uses is shown (no longer a fixed three)", () => {
    const { svg, layout } = render(family({ depth: 4 }), { branchColors: true });
    const lineages = new Set(layout.nodes.map((n) => n.lineage).filter((x) => x != null));
    expect(lineages.size).toBeGreaterThanOrEqual(4);
    const bars = [...svg.matchAll(/data-branch-colour="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase());
    // one bar for each colour drawn (the palette's four repeat past four branches)
    expect(bars.length).toBe(new Set(bars).size);
    expect(bars.length).toBe(Math.min(lineages.size, 4));
    expect(svg).toContain(LEGEND.branchColours.ar);
  });

  for (const depth of [1, 8, 9, 16, 22]) {
    it(`colour by generation, ${depth} generations: every generation present is in the key, in order`, () => {
      const { svg, layout } = render(family({ depth, width: 1 }), { colorBy: "generation" });
      const present = layout.generationsPresent;
      expect(present.length).toBeGreaterThan(0);
      if (present.length <= 8) {
        for (const g of present) expect(svg).toContain(generationLabel(g - layout.generationOffset, true));
      } else {
        // one chip per generation, numbered in reading order, in its colour
        const chips = [...svg.matchAll(/data-generation="(\d+)"><rect [^>]*fill="(#[0-9a-f]{6})"[^>]*><\/rect><text[^>]*>([٠-٩]+)<\/text>/gi)];
        expect(chips.map((c) => Number(c[1]))).toEqual(present.map((g) => g - layout.generationOffset + 1));
        for (const [i, g] of present.entries()) {
          expect(chips[i][2].toLowerCase()).toBe(generationColor(g - layout.generationOffset).fill.toLowerCase());
          expect(chips[i][3]).toBe((g - layout.generationOffset + 1).toLocaleString("ar-EG", { useGrouping: false }));
        }
      }
    }, 60_000);
  }

  it("the key fits inside the frame, the generation strip and every entry included", () => {
    for (const framed of [true, false]) for (const rtl of [true, false]) {
      const { svg } = render(family({ depth: 22, width: 1, arabic: rtl, spouseGenders: ["UNKNOWN"] }), { colorBy: "generation", frame: framed, motherNames: true });
      const m = svg.match(/data-key-width="([\d.]+)" data-key-room="([\d.]+)"/)!;
      expect(Number(m[1]), `${framed ? "framed" : "unframed"} ${rtl ? "ar" : "en"}`).toBeLessThanOrEqual(Number(m[2]) + 0.1);
    }
  }, 120_000);
});
