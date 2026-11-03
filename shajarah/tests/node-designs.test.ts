// The node designs (src/lib/layout/nodeGeometry.ts): each design's outline
// stays inside the box the layout reserves for it, the name always fits
// inside the outline, what is drawn past the box (a parent's ring) stays
// within the outset the layout keeps clear, and a design is decoration only:
// every person gets the same one, whatever their place, gender or family.
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout, textWidth } from "@/lib/layout/botanical";
import {
  DESIGNS, RING_GAP, RING_STROKE, NODE_STROKE, decorOutset, designSize, drawnOutline, outlinePoints, outlinesOverlap, type DesignShape, type Vec,
} from "@/lib/layout/nodeGeometry";
import { inspectPoster } from "@/lib/qa/layoutQa";
import { layoutOptionsFor, NODE_DESIGNS, NODE_DESIGN_LABELS, resolveTheme, SUGGESTED_NODE_DESIGNS, THEME_PRESETS } from "@/lib/theme";
import { TreePoster } from "@/components/poster/TreePoster";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const SHAPES = Object.keys(DESIGNS) as DesignShape[];
const FS = 20;
const NAMES = ["علي", "عبد الرحمن بن عبد العزيز", "Ali", "Abd al-Rahman ibn Abd al-Aziz", "سليمان بن عبد الكريم الشيخ"];

function inside(pt: Vec, poly: Vec[]) {
  let on = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) on = !on;
  }
  return on;
}

describe("node design geometry", () => {
  it("every design's outline stays inside its laid-out box", () => {
    for (const shape of SHAPES) for (const name of NAMES) for (const subH of [0, FS * 0.8]) {
      const { w, h } = designSize(shape, textWidth(name, FS), FS, subH);
      for (const p of outlinePoints({ shape, w, h, fontSize: FS })) {
        expect(Math.abs(p.x), `${shape} ${name}`).toBeLessThanOrEqual(w / 2 + 0.01);
        expect(Math.abs(p.y), `${shape} ${name}`).toBeLessThanOrEqual(h / 2 + 0.01);
      }
    }
  });

  it("the name (and a second line) always fits inside the outline, short or long, Arabic or English", () => {
    for (const shape of SHAPES) for (const name of NAMES) for (const subH of [0, FS * 0.8]) {
      const tw = textWidth(name, FS);
      const { w, h } = designSize(shape, tw, FS, subH);
      const poly = outlinePoints({ shape, w, h, fontSize: FS });
      // the text block (name, and the second line under it), where the renderer sets it
      const dy = DESIGNS[shape].textDy * FS;
      const top = dy - FS * 0.5 - (subH ? FS * 0.32 : 0), bottom = dy + FS * 0.5 + (subH ? subH * 0.7 : 0);
      const margin = FS * 0.1;
      for (const [x, y] of [[-tw / 2 - margin, top], [tw / 2 + margin, top], [-tw / 2 - margin, bottom], [tw / 2 + margin, bottom], [0, top], [0, bottom]]) {
        expect(inside({ x, y }, poly), `${shape} "${name}" sub=${subH > 0}: (${x.toFixed(1)}, ${y.toFixed(1)}) in ${w.toFixed(1)}×${h.toFixed(1)}`).toBe(true);
      }
    }
  });

  it("a parent's ring stays within the outset the layout keeps clear", () => {
    for (const shape of SHAPES) {
      const { w, h } = designSize(shape, textWidth("عبد الله", FS), FS, 0);
      const parent = { shape, w, h, fontSize: FS, terminal: false };
      const out = decorOutset(parent);
      expect(out).toBeCloseTo(FS * RING_GAP + (FS * RING_STROKE) / 2, 5);
      for (const p of outlinePoints(parent, FS * RING_GAP)) {
        expect(Math.abs(p.x) + (FS * RING_STROKE) / 2).toBeLessThanOrEqual(w / 2 + out + 0.01);
        expect(Math.abs(p.y) + (FS * RING_STROKE) / 2).toBeLessThanOrEqual(h / 2 + out + 0.01);
      }
      // without children: only the outline's stroke
      expect(decorOutset({ ...parent, terminal: true })).toBeCloseTo((FS * NODE_STROKE) / 2, 5);
    }
  });

  it("shape-accurate overlap: an oval's empty corners do not count", () => {
    const a = { shape: "oval" as const, w: 100, h: 40, fontSize: FS, terminal: true, x: 0, y: 0 };
    // corner to corner: the boxes overlap, the ovals do not
    expect(outlinesOverlap(drawnOutline(a), drawnOutline({ ...a, x: 90, y: 34 }))).toBe(false);
    expect(outlinesOverlap(drawnOutline(a), drawnOutline({ ...a, x: 60, y: 0 }))).toBe(true);
  });

  it("every design has a name in both languages, and each poster design's suggestions are real designs", () => {
    for (const d of NODE_DESIGNS) {
      expect(NODE_DESIGN_LABELS[d].en.length).toBeGreaterThan(0);
      expect(NODE_DESIGN_LABELS[d].ar).toMatch(/[؀-ۿ]/);
    }
    for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) {
      expect(SUGGESTED_NODE_DESIGNS[preset].length).toBeGreaterThan(0);
      for (const d of SUGGESTED_NODE_DESIGNS[preset]) expect(NODE_DESIGNS).toContain(d);
    }
  });
});

describe("node designs on the poster", () => {
  const tree = QA_FIXTURES.B();
  const through = tree.members.filter((m) => m.gender === "FEMALE" && m.fatherId && tree.members.some((c) => c.motherId === m.id)).map((m) => m.id);
  const draw = (nodeShape: string, preset: ThemePreset = "classic") => {
    const settings = { posterSize: "A2", showFemales: true, familiesThrough: through, theme: { preset, v: 2, motherNames: true, nodeShape } } as unknown as TreeDTO["settings"];
    const t = resolveTheme(settings);
    const layout = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(t, "A2") });
    return { layout, t, settings };
  };

  it("each design: every person drawn in it, whatever their gender, family or descendants (decoration only)", () => {
    for (const shape of SHAPES) {
      const { layout } = draw(shape);
      // (branch heads keep their medallions, as in every design)
      const people = layout.nodes.filter((n) => n.shape !== "medallion");
      expect(people.length).toBeGreaterThan(10);
      expect(new Set(people.map((n) => n.shape)), shape).toEqual(new Set([shape]));
      expect(people.some((n) => n.member.gender === "FEMALE")).toBe(true);
      expect(people.some((n) => n.terminal) && people.some((n) => !n.terminal)).toBe(true);
    }
  });

  it("each design: no defect, no names or rings touching, the spouse frame unchanged", () => {
    for (const shape of SHAPES) {
      const { layout, t, settings } = draw(shape);
      const ins = inspectPoster(layout, { ...tree, settings }, 420);
      expect(ins.defects, `${shape}: ${JSON.stringify(ins.counts)}`).toBe(0);
      expect(ins.counts["decor-overlap"] ?? 0, shape).toBe(0);
      expect(ins.counts["decor-tight"] ?? 0, shape).toBe(0);
      const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme: t }));
      expect(svg).toMatch(/data-spouse-frame="manuscript"/);
      expect((svg.match(new RegExp(`data-shape="${shape}"`, "g")) ?? []).length).toBe(layout.nodes.filter((n) => n.shape === shape).length);
    }
  });

  it("each design in every poster design draws without error", () => {
    for (const preset of Object.keys(THEME_PRESETS) as ThemePreset[]) {
      for (const shape of SUGGESTED_NODE_DESIGNS[preset].filter((d): d is DesignShape => d in DESIGNS)) {
        const { layout, t } = draw(shape, preset);
        const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme: t }));
        expect(svg, `${preset} ${shape}`).toContain(`data-shape="${shape}"`);
      }
    }
  });
});
