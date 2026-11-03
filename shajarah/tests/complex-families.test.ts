// Complex families on the poster, and which parent's branch a child is
// drawn in. Every person is one record; a child's parents are recorded on the
// child, never inferred from a marriage; every marriage is its own record;
// a poster shows a chosen view of that network (a branch, spouses or not, a
// marriage hidden) and never changes it.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import { inspectPoster } from "@/lib/qa/layoutQa";
import { COMPLEX_FIXTURES, type ComplexCase } from "@/lib/qa/complexFixtures";
import { COUSIN_FIXTURES } from "@/lib/qa/cousinFixtures";
import { relationship } from "@/lib/relationship";
import type { ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

type View = { showFemales?: boolean; motherNames?: boolean; through?: string[]; focusId?: string; hiddenSpouses?: string[] };
function draw(tree: TreeDTO, view: View, preset: ThemePreset = "classic") {
  const settings = {
    posterSize: "A2", showFemales: !!view.showFemales, familiesThrough: view.through ?? [], hiddenSpouses: view.hiddenSpouses ?? [],
    ...(view.focusId ? { focusId: view.focusId } : {}),
    theme: { preset, v: 2, motherNames: !!view.motherNames },
  } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const layout = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(t, "A2") });
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme: t }));
  return { layout, svg, settings };
}
const drawnNames = (l: PosterLayout) => [...l.nodes.map((n) => n.id), ...l.stubs.map((n) => n.id), ...l.trunkLabels.map((t) => t.member.id), ...(l.base ? [l.base.id] : [])];
/** Where a child's line comes from: the partner a spouse frame or bead stands beside, or the parent directly. */
const drawnFrom = (l: PosterLayout, id: string) => {
  const e = l.edges.find((x) => x.childId === id);
  if (!e) return null;
  const via = l.spouses.find((s) => s.id === e.parentId);
  return { parent: via ? via.partnerId : e.parentId, via };
};
const cases = Object.entries(COMPLEX_FIXTURES).map(([name, make]) => [name, make()] as [string, ComplexCase]);

describe("complex families: the records", () => {
  it.each(cases)("%s: one record per person; every child's parents as recorded, never inferred from a marriage", (_n, c) => {
    const ids = c.tree.members.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const byId = new Map(c.tree.members.map((m) => [m.id, m]));
    for (const f of c.families) for (const id of f.children) {
      expect(byId.get(id)!.fatherId ?? null, id).toBe(f.parents[0]);
      expect(byId.get(id)!.motherId ?? null, id).toBe(f.parents[1]);
    }
  });

  it("five marriages: five marriage records, the children of each husband only his, half-siblings by their mother", () => {
    const c = COMPLEX_FIXTURES["five-marriages"]();
    const hers = c.tree.marriages.filter((x) => x.spouseAId === c.focus || x.spouseBId === c.focus);
    expect(hers.length).toBe(5);
    expect(c.families.map((f) => f.children.length)).toEqual([1, 3, 2, 1, 2]);
    for (const f of c.families) {
      const fathered = c.tree.members.filter((m) => m.fatherId === f.parents[0]).map((m) => m.id);
      expect(fathered.sort()).toEqual([...f.children].sort());
    }
    // a child of the first husband and one of the second: half-siblings through their mother
    const r = relationship(c.tree.members, c.tree.marriages, c.families[0].children[0], c.families[1].children[0]);
    expect(r.arabic).toMatch(/لأم/);
    // two children of the second husband: full siblings
    const full = relationship(c.tree.members, c.tree.marriages, c.families[1].children[0], c.families[1].children[1]);
    expect(full.arabic).not.toMatch(/لأم|لأب/);
  });

  it("blended: a man's step-children are his wife's, never his", () => {
    const c = COMPLEX_FIXTURES.blended();
    const step = c.families[0].children;
    for (const id of step) expect(c.tree.members.find((m) => m.id === id)!.fatherId).not.toBe(c.focus);
  });
});

describe("complex families: the poster", () => {
  const views: [string, (c: ComplexCase) => View][] = [
    ["males", () => ({})],
    ["daughters", () => ({ showFemales: true })],
    ["spouses", () => ({ motherNames: true })],
    ["all", (c) => ({ showFemales: true, motherNames: true, through: [c.focus] })],
  ];

  it.each(cases)("%s: every person drawn once, no defect, in every view", (_n, c) => {
    for (const [name, view] of views) {
      const { layout, settings } = draw(c.tree, view(c));
      const names = drawnNames(layout);
      expect(new Set(names).size, name).toBe(names.length);
      const ins = inspectPoster(layout, { ...c.tree, settings }, 420);
      expect(ins.defects, `${name}: ${JSON.stringify(ins.counts)}`).toBe(0);
    }
  });

  it("five marriages, her family shown: each husband in his own frame beside her, with exactly his children", () => {
    const c = COMPLEX_FIXTURES["five-marriages"]();
    const { layout, svg } = draw(c.tree, { showFemales: true, motherNames: true, through: [c.focus] });
    const frames = layout.spouses.filter((s) => s.partnerId === c.focus && !s.knot);
    expect(frames.length).toBe(5);
    for (const f of c.families) {
      const frame = frames.find((s) => s.member.id === f.parents[0])!;
      expect([...frame.childIds].sort(), f.parents[0]!).toEqual([...f.children].sort());
      for (const id of f.children) expect(drawnFrom(layout, id)!.via?.id).toBe(frame.id);
    }
    expect(svg).toMatch(/data-legend="spouse"/);
  });

  it("a marriage hidden on the poster: the husband not drawn, his children still drawn from her, nothing changed", () => {
    const c = COMPLEX_FIXTURES["five-marriages"]();
    const before = JSON.stringify(c.tree);
    const second = c.families[1], fourth = c.families[3];
    const hide = [`${c.focus}:${second.parents[0]}`, `${c.focus}:${fourth.parents[0]}`];
    const { layout, svg } = draw(c.tree, { showFemales: true, motherNames: true, through: [c.focus], hiddenSpouses: hide });
    // three named frames, two open beads (one with a single child)
    expect(layout.spouses.filter((s) => s.partnerId === c.focus && !s.knot).length).toBe(3);
    const beads = layout.spouses.filter((s) => s.partnerId === c.focus && s.collapsed);
    expect(beads.length).toBe(2);
    expect(layout.spouses.some((s) => s.member.id === second.parents[0] && !s.knot)).toBe(false);
    for (const f of [second, fourth]) for (const id of f.children) {
      expect(layout.nodes.some((n) => n.id === id), id).toBe(true);
      expect(drawnFrom(layout, id)!.via?.collapsed, id).toBe(true);
    }
    expect(svg).toMatch(/data-legend="hidden-spouse"/);
    expect(svg).toContain("زوج غير معروض في هذا الملصق");
    // the records are untouched
    expect(JSON.stringify(c.tree)).toBe(before);
  });

  it("children with no father recorded part from a filled bead, explained in the key", () => {
    const c = COMPLEX_FIXTURES["one-parent"]();
    const { layout, svg } = draw(c.tree, { showFemales: true, through: [c.focus] });
    expect(layout.spouses.some((s) => s.partnerId === c.focus && s.knot && !s.collapsed)).toBe(true);
    expect(svg).toMatch(/data-knot="unrecorded"/);
    expect(svg).toMatch(/data-legend="unrecorded"/);
    // the child with neither parent is not placed anywhere by guess
    const orphan = c.families[1].children[0];
    expect(drawnNames(layout)).not.toContain(orphan);
  });

  it("the step-children are not drawn as the man's children", () => {
    const c = COMPLEX_FIXTURES.blended();
    const { layout } = draw(c.tree, { showFemales: true, motherNames: true });
    for (const id of c.families[0].children) {
      const from = drawnFrom(layout, id);
      expect(from === null || from.parent !== c.focus, id).toBe(true);
    }
    for (const id of c.families[1].children.filter((x) => c.tree.members.find((m) => m.id === x)!.gender === "MALE")) {
      expect(drawnFrom(layout, id)!.parent).toBe(c.focus);
    }
  });

  it("twins and triplets keep their recorded order", () => {
    const c = COMPLEX_FIXTURES.twins();
    const { layout } = draw(c.tree, { showFemales: true });
    for (const id of c.families[0].children) expect(drawnFrom(layout, id)!.parent).toBe(c.focus);
  });

  it("five marriages: clean in every poster design", () => {
    const c = COMPLEX_FIXTURES["five-marriages"]();
    for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) {
      const { layout, settings } = draw(c.tree, { showFemales: true, motherNames: true, through: [c.focus] }, preset);
      expect(inspectPoster(layout, { ...c.tree, settings }, 420).defects, preset).toBe(0);
    }
  });
});

describe("which parent's branch a child is drawn in", () => {
  // the husband's and the wife's families are both branches of one family
  const c = COUSIN_FIXTURES["many-children"]();
  const [husband, wife] = c.couples[0];
  const byId = new Map(c.tree.members.map((m) => [m.id, m]));
  const wifeBranchHead = byId.get(byId.get(wife)!.fatherId!)!.id; // her father heads her branch
  const husbandBranchHead = byId.get(byId.get(husband)!.fatherId!)!.id;

  it("the father's branch: the children under him, their mother beside him; each child once (her family shown or not)", () => {
    // (her family shown through her is a setting of the whole tree: it stays on when the branch changes)
    for (const through of [[], [wife]]) {
      const { layout } = draw(c.tree, { focusId: husbandBranchHead, showFemales: true, motherNames: true, through });
      for (const id of c.children) {
        expect(drawnNames(layout).filter((x) => x === id).length, `${through.length} ${id}`).toBe(1);
        expect(drawnFrom(layout, id)?.parent, `${through.length} ${id}`).toBe(husband);
      }
    }
  });

  it("the mother's branch: the same children under her, their father beside her; each child once", () => {
    const { layout } = draw(c.tree, { focusId: wifeBranchHead, showFemales: true, motherNames: true, through: [wife] });
    for (const id of c.children) {
      expect(drawnNames(layout).filter((x) => x === id).length, id).toBe(1);
      expect(drawnFrom(layout, id)!.parent).toBe(wife);
    }
    // their father drawn beside her, as her husband
    expect(layout.spouses.some((s) => s.partnerId === wife && s.member.id === husband)).toBe(true);
  });

  it("both branches together: each child once, in the father's line; the mother drawn in her own branch and marked beside him", () => {
    const { layout } = draw(c.tree, { showFemales: true, motherNames: true, through: [wife] });
    for (const id of c.children) {
      expect(drawnNames(layout).filter((x) => x === id).length, id).toBe(1);
      expect(drawnFrom(layout, id)!.parent).toBe(husband);
    }
    expect(drawnNames(layout)).toContain(wife);
    expect(layout.spouses.find((s) => s.partnerId === husband && s.member.id === wife)?.elsewhere).toBe(true);
  });

  it("switching branches never changes a record or the number of people", () => {
    const before = JSON.stringify(c.tree);
    for (const focusId of [husbandBranchHead, wifeBranchHead, undefined]) draw(c.tree, { focusId, showFemales: true, motherNames: true, through: [wife] });
    expect(JSON.stringify(c.tree)).toBe(before);
    for (const id of c.children) {
      expect(byId.get(id)!.fatherId).toBe(husband);
      expect(byId.get(id)!.motherId).toBe(wife);
    }
  });
});
