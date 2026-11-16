// Before/after posters for design work (not part of the test suite: it runs
// only with POSTER_SHOTS=1). For each family and paper it lays the poster
// out as the editor does, writes the SVG and its measurements, for
// scripts/poster-shots.mjs to render and compare:
//
//   POSTER_SHOTS=1 SHOTS_OUT=<dir> [SHOTS_FAMILY=<a .shajarah file>] [SHOTS_PAPERS=A0,2A0] \
//     npx vitest run tests/tools/poster-shots.test.ts
//
// A family file is read from where it is and never copied into the
// repository; its measurements carry no names.

import * as React from "react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { readProjectFile } from "@/lib/project";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { nouriFamily } from "@/lib/samples/nouri";
import { naturalFamily } from "@/lib/samples/natural";
import { TreePoster } from "@/components/poster/TreePoster";
import type { TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const OUT = process.env.SHOTS_OUT ?? "poster-shots";
const PAPERS = (process.env.SHOTS_PAPERS ?? "A0,2A0").split(",") as PaperSize[];

function families(): [string, TreeDTO][] {
  const list: [string, TreeDTO][] = [
    ["kalali-filled", kalaliFilledTree()],
    ["nouri", nouriFamily()],
    ["natural350", naturalFamily(350)],
  ];
  if (process.env.SHOTS_FAMILY) {
    const f = readProjectFile(readFileSync(process.env.SHOTS_FAMILY, "utf8"));
    const saved = { ...f.tree, id: "private" } as unknown as TreeDTO;
    list.unshift(["private-saved", saved], ["private-whole", { ...saved, settings: { ...saved.settings, focusId: null } }]);
  }
  return list;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The numbers the owner asked for, in mm on the paper; no names. */
function measure(L: PosterLayout, paper: PaperSize) {
  const mm = PAPER_SIZES[paper].w / L.width;
  const canopy = L.nodes.filter((n) => n.depth > 0).map((n) => n.fontSize * mm);
  const typical = median(canopy);
  const trunk = L.trunkLabels.map((t) => t.fontSize * mm);
  const heads = L.stubs.map((s) => s.fontSize * mm);
  const base = L.base ? L.base.fontSize * mm : null;
  // the stem: canopy base → the wife whose children include the centred branch
  const centredSon = L.centerLine?.[0];
  const wife = L.base && centredSon ? L.spouses.find((s) => s.partnerId === L.base!.id && s.childIds.includes(centredSon)) : undefined;
  const son = centredSon ? L.nodes.find((n) => n.id === centredSon) : undefined;
  const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => r2((Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI);
  // side families: everyone whose line leads to a trunk ancestor, not to the canopy base
  const trunkIds = new Set(L.trunkLabels.map((t) => t.member.id));
  const byId = new Map(L.nodes.map((n) => [n.id, n]));
  const onSide = (n: (typeof L.nodes)[number]) => {
    for (let p: string | null = n.parentId, guard = 0; p && guard < 200; guard++) {
      if (trunkIds.has(p)) return true;
      if (L.base && p === L.base.id) return false;
      p = byId.get(p)?.parentId ?? null;
    }
    return false;
  };
  const side = [...L.nodes.filter(onSide), ...L.stubs].map((n) => n.fontSize * mm);
  const canopyOnly = L.nodes.filter((n) => !onSide(n)).map((n) => n.fontSize * mm);
  return {
    paper,
    mmPerUnit: mm,
    sideFamilies: side.length ? { count: side.length, smallestMm: r2(Math.min(...side)), typicalMm: r2(median(side)), canopyOnlyTypicalMm: r2(median(canopyOnly)) } : null,
    legible: L.legibility.ok,
    smallestTextMm: r2(L.legibility.smallestTextMm),
    clarityIssues: L.clarity.issues.length,
    overlaps: L.overlaps,
    names: {
      canopyTypicalMm: r2(typical),
      canopySmallestMm: r2(Math.min(...canopy)),
      trunkMm: trunk.length ? r2(Math.max(...trunk)) : null,
      sideHeadsMm: heads.length ? r2(Math.max(...heads)) : null,
      baseMm: base && r2(base),
      spousesMm: L.spouses.length ? [r2(Math.min(...L.spouses.map((s) => s.fontSize * mm))), r2(Math.max(...L.spouses.map((s) => s.fontSize * mm)))] : null,
    },
    ratios: {
      trunk: trunk.length ? r2(Math.max(...trunk) / typical) : null,
      sideHeads: heads.length ? r2(Math.max(...heads) / typical) : null,
      base: base ? r2(base / typical) : null,
    },
    stem: {
      centredWife: !!wife,
      // degrees from vertical; 0 is straight up
      baseToWifeDeg: L.base && wife ? angle(L.base, wife) : null,
      wifeToSonDeg: wife && son ? angle(wife, son) : null,
      baseToSonDeg: L.base && son ? angle(L.base, son) : null,
      wivesOfBase: L.base ? L.spouses.filter((s) => s.partnerId === L.base!.id).map((s) => angle(L.base!, s)) : [],
      // x on the paper, in mm from its left edge: the canopy base, the centred wife's box, the centred son
      xMm: { base: L.base ? r2(L.base.x * mm) : null, wife: wife ? r2(wife.x * mm) : null, son: son ? r2(son.x * mm) : null },
      yMm: { base: L.base ? r2(L.base.y * mm) : null, wife: wife ? r2(wife.y * mm) : null, son: son ? r2(son.y * mm) : null },
    },
    trunkWidthMm: r2(L.trunkWidth * mm),
    // for the renderer: the canopy base's close-up, about 300 × 200 mm of paper
    // (taller where the centred wife's box stands higher: it and 40 mm above it)
    baseBox: L.base ? (() => {
      const top = Math.min(L.base.y - 130 / mm, wife ? wife.y - wife.h / 2 - 40 / mm : Infinity);
      return { x: L.base.x - 150 / mm, y: top, w: 300 / mm, h: L.base.y + 70 / mm - top };
    })() : null,
    // the trunk's outline, and the heights to measure its width at: just above the ground, just under the canopy base
    trunk: { path: L.trunkPath, groundY: L.groundY, topY: L.base ? L.base.y + L.base.h / 2 : null },
  };
}

it.skipIf(process.env.POSTER_SHOTS !== "1")("poster shots", () => {
  mkdirSync(OUT, { recursive: true });
  const all: Record<string, unknown> = {};
  const only = process.env.SHOTS_ONLY?.split(",");
  for (const [label, tree] of families().filter(([l]) => !only || only.includes(l))) {
    for (const paper of PAPERS) {
      const settings = { ...tree.settings, posterSize: paper } as TreeDTO["settings"];
      const t = resolveTheme(settings);
      const t0 = Date.now();
      const L = computePosterLayout({ ...tree, settings }, { showFemales: settings?.showFemales ?? false, seed: settings?.seed, ...layoutOptionsFor(t, paper) } as never);
      const ms = Date.now() - t0;
      const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout: L, meta: { title: tree.title ?? tree.name, subtitle: tree.subtitle ?? null, name: "" }, theme: t }));
      const id = `${label}_${paper}`;
      writeFileSync(`${OUT}/${id}.svg`, svg.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'));
      all[id] = { ...measure(L, paper), layoutSeconds: Math.round(ms / 100) / 10 };
    }
  }
  writeFileSync(`${OUT}/measurements.json`, JSON.stringify(all, null, 2));
}, 1_800_000);
