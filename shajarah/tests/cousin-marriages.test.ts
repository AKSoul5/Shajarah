// Cousin marriages, shared ancestors and pedigree collapse: each person is
// one record however many ways they are related; a marriage and a child's
// parents point at the people already recorded; the relationship engine
// sees both ties; the poster draws each person once as a name, the
// children of a cousin marriage in their father's line (never as
// outsiders through their mother), linked to both parents, and marks a
// spouse drawn a second time beside their partner.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import { inspectPoster } from "@/lib/qa/layoutQa";
import { COUSIN_FIXTURES, type CousinCase } from "@/lib/qa/cousinFixtures";
import { ancestorPaths, computeGenerations, lineIds } from "@/lib/genealogy";
import { relationship } from "@/lib/relationship";
import type { ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

type Mode = "males" | "daughters" | "spouses" | "all";
const MODES: Record<Mode, { showFemales: boolean; motherNames: boolean; through: boolean }> = {
  males: { showFemales: false, motherNames: false, through: false },
  daughters: { showFemales: true, motherNames: false, through: false },
  spouses: { showFemales: false, motherNames: true, through: false },
  all: { showFemales: true, motherNames: true, through: true },
};
const daughtersWithFamilies = (tree: TreeDTO) =>
  tree.members.filter((m) => m.gender === "FEMALE" && m.fatherId && tree.members.some((c) => c.motherId === m.id)).map((m) => m.id);

function draw(tree: TreeDTO, mode: Mode, preset: ThemePreset = "classic", paper: "A2" | "A1" = "A2") {
  const m = MODES[mode];
  const settings = {
    posterSize: paper, showFemales: m.showFemales, familiesThrough: m.through ? daughtersWithFamilies(tree) : [],
    theme: { preset, v: 2, motherNames: m.motherNames },
  } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const layout = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(t, paper) });
  return { layout, t, settings };
}

const cases = Object.entries(COUSIN_FIXTURES).map(([name, make]) => [name, make()] as [string, CousinCase]);
const byId = (c: CousinCase) => new Map(c.tree.members.map((m) => [m.id, m]));

describe("cousin marriages: the records", () => {
  it.each(cases)("%s: one record per person, every link to an existing person", (_name, c) => {
    const ids = c.tree.members.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const people = byId(c);
    for (const m of c.tree.members) {
      if (m.fatherId) expect(people.has(m.fatherId), m.id).toBe(true);
      if (m.motherId) expect(people.has(m.motherId), m.id).toBe(true);
    }
    for (const x of c.tree.marriages) expect(people.has(x.spouseAId) && people.has(x.spouseBId)).toBe(true);
    // each couple's spouses were already in the family, with parents of their own
    for (const [h, w] of c.couples) {
      expect(people.get(h)!.fatherId, h).toBeTruthy();
      expect(people.get(w)!.fatherId, w).toBeTruthy();
    }
    // their children: one record each, linked to both parents
    for (const id of c.children) {
      const child = people.get(id)!;
      expect(c.couples.some(([h, w]) => child.fatherId === h && child.motherId === w), id).toBe(true);
    }
  });

  it.each(cases)("%s: the spouses share an ancestor; the relationship engine sees both ties", (_name, c) => {
    for (const [h, w] of c.couples) {
      const up = (id: string) => new Set(ancestorPaths(c.tree.members, id).keys());
      const shared = [...up(h)].filter((a) => up(w).has(a));
      expect(shared.length, `${h} & ${w}`).toBeGreaterThan(0);
      const r = relationship(c.tree.members, c.tree.marriages, h, w);
      // married, and related by blood as well
      expect(r.arabic + r.english, `${h} & ${w}`).toMatch(/زوج|wife|husband/i);
      expect(r.also, `${h} & ${w}: ${r.english}`).toBeTruthy();
    }
  });

  it("pedigree collapse: the child of double cousins reaches each great-grandparent by several lines", () => {
    const c = COUSIN_FIXTURES["related-twice"]();
    const child = byId(c).get(c.children[0])!;
    const paths = ancestorPaths(c.tree.members, child.id);
    // (the grandparents' parents: reached through both parents, more than once)
    const many = [...paths.entries()].filter(([, n]) => n >= 2);
    expect(many.length).toBeGreaterThan(0);
    expect(Math.max(...paths.values())).toBeGreaterThanOrEqual(4);
    // the ancestors are each one person, however many lines lead to them
    expect(new Set(paths.keys()).size).toBe(paths.size);
  });

  it.each(cases)("%s: the children's generation follows both parents (cousins of one generation)", (_name, c) => {
    const gens = computeGenerations(c.tree.members, "PATRILINEAL");
    const people = byId(c);
    for (const id of c.children) {
      const child = people.get(id)!;
      expect(gens.get(id)).toBe(gens.get(child.fatherId!)! + 1);
    }
  });
});

describe("cousin marriages: the poster", () => {
  it.each(cases)("%s: every person drawn as a name once, in every display mode", (_name, c) => {
    for (const mode of Object.keys(MODES) as Mode[]) {
      const { layout } = draw(c.tree, mode);
      const names = [...layout.nodes.map((n) => n.id), ...layout.stubs.map((n) => n.id), ...layout.trunkLabels.map((t) => t.member.id), ...(layout.base ? [layout.base.id] : [])];
      expect(new Set(names).size, mode).toBe(names.length);
    }
  });

  it.each(cases)("%s: the children of cousins are drawn in their father's line, from their father, in every mode", (_name, c) => {
    const people = byId(c);
    for (const mode of Object.keys(MODES) as Mode[]) {
      const { layout } = draw(c.tree, mode);
      const line = new Set(layout.lineIds ?? []);
      const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
      for (const id of c.children) {
        const child = people.get(id)!;
        // (a daughter of the line is drawn only when daughters are shown)
        if (!nodes.has(id)) { expect(child.gender === "FEMALE" && !MODES[mode].showFemales, `${mode} ${id} missing`).toBe(true); continue; }
        expect(line.has(child.fatherId!), `${mode}: father of ${id} in the line`).toBe(true);
        // drawn from the father (directly, or from his wife's frame beside him), never from the mother's dotted line
        const edge = layout.edges.find((e) => e.childId === id)!;
        const from = layout.spouses.find((s) => s.id === edge.parentId);
        expect(from ? from.partnerId : edge.parentId, `${mode} ${id}`).toBe(child.fatherId);
        if (from) expect(from.member.id, `${mode} ${id}: the frame is the mother's`).toBe(child.motherId);
      }
    }
  });

  it.each(cases)("%s: no defect in any mode, on A2", (_name, c) => {
    for (const mode of Object.keys(MODES) as Mode[]) {
      const { layout, settings } = draw(c.tree, mode);
      const ins = inspectPoster(layout, { ...c.tree, settings }, 420);
      expect(ins.defects, `${mode}: ${JSON.stringify(ins.counts)}`).toBe(0);
    }
  });

  it("a cousin wife drawn in her own branch is drawn again beside her husband only as a marked reference", () => {
    const c = COUSIN_FIXTURES["two-roles"]();
    const [h, w] = c.couples[0];
    const { layout, t } = draw(c.tree, "all");
    expect(layout.nodes.some((n) => n.id === w)).toBe(true);
    const frame = layout.spouses.find((s) => s.partnerId === h && s.member.id === w)!;
    expect(frame.elsewhere).toBe(true);
    // her first husband (of another family) is not drawn elsewhere: no mark
    expect(layout.spouses.filter((s) => s.member.id !== w).every((s) => !s.elsewhere)).toBe(true);
    const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: c.tree.title, subtitle: null, name: c.tree.name }, theme: t }));
    expect(svg).toContain(`data-spouse-member="${w}" data-elsewhere="true"`);
    expect(svg).toMatch(/data-legend="elsewhere"/);
    // (worded so it explains itself: the spouse is also in their own branch)
    expect(svg).toContain("يظهر الزوج/الزوجة أيضاً في فرعه/فرعها من الشجرة");
    // with daughters hidden she is not drawn in her own branch: her frame is not marked
    const hidden = draw(c.tree, "spouses").layout;
    expect(hidden.spouses.find((s) => s.member.id === w)?.elsewhere ?? false).toBe(false);
    expect(renderToStaticMarkup(React.createElement(TreePoster, { layout: hidden, meta: { title: c.tree.title, subtitle: null, name: c.tree.name }, theme: t }))).not.toMatch(/data-legend="elsewhere"/);
  });

  it("a cousin marriage with no children yet is still shown, once, from the husband's side", () => {
    const c = COUSIN_FIXTURES["several-paths"]();
    const [h, w] = c.couples[c.couples.length - 1];
    const { layout } = draw(c.tree, "all");
    const frames = layout.spouses.filter((s) => (s.partnerId === h && s.member.id === w) || (s.partnerId === w && s.member.id === h));
    expect(frames.length).toBe(1);
    expect(frames[0].partnerId).toBe(h);
  });

  it("the large family with many marriages between branches is clean in every poster design", () => {
    const c = COUSIN_FIXTURES.large();
    for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) {
      const { layout, settings } = draw(c.tree, "all", preset, "A1");
      const ins = inspectPoster(layout, { ...c.tree, settings }, 594);
      expect(ins.defects, `${preset}: ${JSON.stringify(ins.counts)}`).toBe(0);
    }
  });

  it("the line: everyone descended from the root through fathers, each once", () => {
    const c = COUSIN_FIXTURES["several-marriages"]();
    const line = lineIds(c.tree.members, "PATRILINEAL", c.tree.rootMemberId);
    for (const [h] of c.couples) expect(line.has(h)).toBe(true);
    for (const id of c.children) expect(line.has(id)).toBe(true);
  });
});
