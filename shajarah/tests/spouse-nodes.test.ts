// Spouses on the poster and in its key: who is drawn as a spouse comes from
// the records (a marriage, or the other parent of a child in the line), never
// from where a name happens to sit; every spouse gets the spouse frame, which
// the node design cannot change; and the key's spouse is drawn with the same
// frame as the poster's, only when spouses are drawn, in the right words.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { MemberDTO, PosterTheme, ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

type Mode = { showFemales?: boolean; motherNames?: boolean; through?: boolean };

const daughtersWithFamilies = (tree: TreeDTO) =>
  tree.members.filter((m) => m.gender === "FEMALE" && m.fatherId && tree.members.some((c) => c.motherId === m.id)).map((m) => m.id);

function draw(tree: TreeDTO, mode: Mode, theme: Partial<PosterTheme> = {}, preset: ThemePreset = "classic") {
  const settings = {
    posterSize: "A2", showFemales: !!mode.showFemales,
    familiesThrough: mode.through ? daughtersWithFamilies(tree) : [],
    theme: { preset, v: 2, motherNames: !!mode.motherNames, ...theme },
  } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const layout = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(t, "A2") });
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme: t }));
  return { layout, svg, theme: t };
}

/** The markup of each element carrying `attr`, as the outer tag plus its contents up to the next sibling of the same kind. */
const groupsWith = (svg: string, attr: string) => [...svg.matchAll(new RegExp(`<g[^>]*${attr}[^>]*>`, "g"))].map((m) => ({ tag: m[0], at: m.index! }));
const attrOf = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
/** The spouse frame's first shape after `at`: its element, fill, stroke and dash. */
function frameAfter(svg: string, at: number) {
  const rest = svg.slice(at);
  const frame = rest.match(/<g data-spouse-frame="(\w+)">(<(rect|path)[^>]*>)/)!;
  return { style: frame[1], el: frame[3], fill: attrOf(frame[2], "fill"), stroke: attrOf(frame[2], "stroke"), dashed: /stroke-dasharray=/.test(frame[2]) };
}
const legendEntry = (svg: string, key: string) => {
  const m = svg.match(new RegExp(`<g data-legend="${key}">`));
  return m ? { at: m.index!, text: svg.slice(m.index!).match(/<text[^>]*>([^<]*)<\/text>/)![1] } : null;
};

/** Whether the records make `b` a spouse of `a`: a marriage, or a child of both. */
const recordedCouple = (tree: TreeDTO, a: string, b: string) =>
  tree.marriages.some((x) => (x.spouseAId === a && x.spouseBId === b) || (x.spouseAId === b && x.spouseBId === a))
  || tree.members.some((c) => (c.fatherId === a && c.motherId === b) || (c.fatherId === b && c.motherId === a));

const holders = (layout: PosterLayout) => layout.spouses.filter((s) => !s.knot);

describe("spouse nodes", () => {
  const complex = QA_FIXTURES.B();

  it("every spouse drawn is a recorded spouse or co-parent of the person they are drawn beside", () => {
    for (const mode of [{ motherNames: true }, { showFemales: true, motherNames: true, through: true }, { showFemales: true, through: true }]) {
      const { layout, svg } = draw(complex, mode);
      expect(holders(layout).length, JSON.stringify(mode)).toBeGreaterThan(0);
      for (const s of holders(layout)) expect(recordedCouple(complex, s.partnerId, s.member.id), `${s.id}`).toBe(true);
      // drawn with the spouse frame, one per spouse
      const drawn = groupsWith(svg, 'data-kind="spouse"');
      expect(drawn.length).toBe(holders(layout).length);
      for (const g of drawn) expect(svg.slice(g.at, g.at + 400)).toMatch(/data-spouse-frame=/);
    }
  });

  it("a man's three wives are each drawn as his spouse", () => {
    const head = complex.members.find((m) => complex.marriages.filter((x) => x.spouseAId === m.id || x.spouseBId === m.id).length === 3)!;
    const wives = complex.marriages.filter((x) => x.spouseAId === head.id || x.spouseBId === head.id).map((x) => (x.spouseAId === head.id ? x.spouseBId : x.spouseAId));
    const { layout, svg } = draw(complex, { motherNames: true });
    const his = holders(layout).filter((s) => s.partnerId === head.id).map((s) => s.member.id);
    expect(new Set(his)).toEqual(new Set(wives));
    for (const w of wives) expect(svg).toContain(`data-spouse-of="${head.id}" data-spouse-member="${w}"`);
  });

  it("no person in the line is drawn as a spouse, and no spouse as a person", () => {
    const { layout, svg } = draw(complex, { showFemales: true, motherNames: true, through: true });
    const people = new Set(layout.nodes.map((n) => n.id));
    for (const g of groupsWith(svg, 'data-kind="person"')) expect(people.has(attrOf(g.tag, "data-person")!)).toBe(true);
    // a person node is never given the spouse frame
    for (const g of groupsWith(svg, 'data-kind="person"')) {
      const next = svg.indexOf("<g ", g.at + 1);
      expect(svg.slice(g.at, next > 0 ? next : undefined)).not.toMatch(/data-spouse-frame/);
    }
  });

  it("someone who is both in the line and a spouse is drawn as each, in each place", () => {
    // a daughter of the line married to her cousin in the line, their son in the line
    const tree = structuredClone(complex);
    const head = tree.members.find((m) => tree.marriages.filter((x) => x.spouseAId === m.id || x.spouseBId === m.id).length === 3)!;
    const sons = tree.members.filter((m) => m.fatherId === head.id && m.gender === "MALE" && tree.members.some((c) => c.fatherId === m.id));
    const [a, b] = [sons[0], sons[1]];
    const cousin = tree.members.find((m) => m.fatherId === a.id && m.gender === "MALE")!;
    const bride = tree.members.find((m) => m.fatherId === b.id && m.gender === "FEMALE")
      ?? (() => { const d: MemberDTO = { ...cousin, id: "bride", name: "مريم", gender: "FEMALE", fatherId: b.id, motherId: null }; tree.members.push(d); return d; })();
    tree.marriages.push({ id: "cousins", spouseAId: cousin.id, spouseBId: bride.id, startYear: null, endYear: null });
    tree.members.push({ ...cousin, id: "their-son", name: "يوسف", fatherId: cousin.id, motherId: bride.id, birthOrder: 99 });
    const { layout, svg } = draw(tree, { showFemales: true, motherNames: true });
    // a daughter in her own right (a person node) …
    expect(layout.nodes.some((n) => n.id === bride.id)).toBe(true);
    expect(svg).toContain(`data-person="${bride.id}"`);
    // … and her cousin's wife, the mother of his son (a spouse frame beside him)
    expect(holders(layout).some((s) => s.partnerId === cousin.id && s.member.id === bride.id)).toBe(true);
    expect(svg).toContain(`data-spouse-of="${cousin.id}" data-spouse-member="${bride.id}"`);
    // her own node stays a person's: the node design's shape, not the spouse frame
    const node = layout.nodes.find((n) => n.id === bride.id)!;
    expect(["leaf", "circle", "oval", "pill", "medallion"]).toContain(node.shape);
  });
});

describe("the key's spouse", () => {
  const complex = QA_FIXTURES.B();
  const presets = Object.keys(THEME_PRESETS) as ThemePreset[];

  it("is drawn with the poster's own spouse frame, in every design, spouse style and node shape", () => {
    for (const preset of presets) {
      for (const spouseStyle of ["manuscript", "capsule", "inscribed"] as const) {
        for (const nodeShape of ["auto", "leaf", "circle", "oval"] as const) {
          // (the node shape is only checked in one design: it never reaches the spouse frame)
          if (nodeShape !== "auto" && preset !== "classic") continue;
          const { svg } = draw(complex, { motherNames: true }, { spouseStyle, nodeShape }, preset);
          const key = legendEntry(svg, "spouse");
          expect(key, `${preset} ${spouseStyle} ${nodeShape}`).not.toBeNull();
          const onPoster = frameAfter(svg, groupsWith(svg, 'data-kind="spouse"')[0].at);
          const inKey = frameAfter(svg, key!.at);
          expect(inKey, `${preset} ${spouseStyle} ${nodeShape}`).toEqual({ ...onPoster, dashed: inKey.dashed });
          expect(onPoster.style).toBe(spouseStyle);
        }
      }
    }
  });

  it("is dashed when every spouse drawn is a daughter's husband on her dotted line", () => {
    const { layout, svg } = draw(complex, { showFemales: true, through: true });
    expect(holders(layout).length).toBeGreaterThan(0);
    expect(holders(layout).every((s) => s.dotted)).toBe(true);
    expect(frameAfter(svg, legendEntry(svg, "spouse")!.at).dashed).toBe(true);
    expect(frameAfter(svg, groupsWith(svg, 'data-kind="spouse"')[0].at).dashed).toBe(true);
  });

  it("is absent when no spouse is drawn, and follows the display mode as it changes", () => {
    const off = draw(complex, { showFemales: true });
    expect(holders(off.layout).length).toBe(0);
    expect(legendEntry(off.svg, "spouse")).toBeNull();
    expect(off.svg).not.toMatch(/data-spouse-frame/);
    const on = draw(complex, { showFemales: true, motherNames: true });
    expect(legendEntry(on.svg, "spouse")).not.toBeNull();
    // the style changes, the key changes with it
    const capsule = draw(complex, { motherNames: true }, { spouseStyle: "capsule" });
    expect(frameAfter(capsule.svg, legendEntry(capsule.svg, "spouse")!.at).style).toBe("capsule");
  });

  it("is named from the genders of the spouses drawn, in Arabic and in English", () => {
    // the wives of the line: زوجة / Wife
    const wives = draw(complex, { motherNames: true });
    expect(holders(wives.layout).every((s) => s.member.gender === "FEMALE")).toBe(true);
    expect(legendEntry(wives.svg, "spouse")!.text).toBe("زوجة");
    // daughters' husbands only: زوج
    const husbands = draw(complex, { showFemales: true, through: true });
    expect(legendEntry(husbands.svg, "spouse")!.text).toBe("زوج");
    // both: زوج / زوجة
    const both = draw(complex, { showFemales: true, motherNames: true, through: true });
    expect(legendEntry(both.svg, "spouse")!.text).toBe("زوج / زوجة");
    // in English
    const english = QA_FIXTURES["C-en"]();
    const en = draw(english, { motherNames: true });
    expect(holders(en.layout).length).toBeGreaterThan(0);
    expect(["Wife", "Husband", "Spouse"]).toContain(legendEntry(en.svg, "spouse")!.text);
    expect(legendEntry(en.svg, "spouse")!.text).toBe(holders(en.layout).every((s) => s.member.gender === "FEMALE") ? "Wife" : "Spouse");
  });

  it("a spouse is told from a person by its frame, not by colour alone", () => {
    // in black ink only, every spouse style still draws its own cue
    for (const spouseStyle of ["manuscript", "capsule", "inscribed"] as const) {
      const { svg } = draw(complex, { motherNames: true }, { spouseStyle }, "mono");
      const g = groupsWith(svg, 'data-kind="spouse"')[0];
      const body = svg.slice(g.at, svg.indexOf("</g></g>", g.at));
      if (spouseStyle === "manuscript") expect(body).toMatch(/<path d="M[^"]*Q/); // pointed, curved ends
      if (spouseStyle === "capsule") expect((body.match(/L/g) ?? []).length).toBeGreaterThanOrEqual(6); // a lozenge at each end
      if (spouseStyle === "inscribed") expect(body).toMatch(/H[^"]*M[^"]*H/); // a rule, no box
    }
  });
});
