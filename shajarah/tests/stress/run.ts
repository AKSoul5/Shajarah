// The poster stress test's runner (tests/stress/README.md): one case is a
// synthetic family (src/lib/qa/stressFamilies.ts) in one design, on one
// paper, in one display mode. It lays the poster out with the app's own
// options, renders it with the app's own TreePoster, and checks the result:
// the genealogy drawn, the layout, the text, the page, the SVG, the time.
// It reports; it never changes a layout. Results are appended as JSON lines
// so a run can be interrupted and resumed.
import * as React from "react";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { measureShape } from "@/lib/layout/shape";
import { inspectPoster } from "@/lib/qa/layoutQa";
import { explainNotDrawn } from "@/lib/notDrawn";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { TreePoster } from "@/components/poster/TreePoster";
import { STRESS_FAMILIES, type Lang, type StressFamilyId } from "@/lib/qa/stressFamilies";
import type { PosterTheme, ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

export const OUT = process.env.STRESS_OUT ?? "stress-report";

/** What the poster shows (the editor's toggles). */
export const MODES = {
  sons: { showFemales: false, motherNames: false, through: false },
  daughters: { showFemales: true, motherNames: false, through: false },
  spouses: { showFemales: true, motherNames: true, through: false },
  all: { showFemales: true, motherNames: true, through: true },
} as const;
export type Mode = keyof typeof MODES;

export interface CaseSpec {
  family: StressFamilyId; lang: Lang; preset: ThemePreset; paper: PaperSize; mode: Mode;
  nodeShape?: PosterTheme["nodeShape"]; soilStyle?: PosterTheme["soilStyle"];
  labelMode?: PosterTheme["labelMode"]; showYears?: boolean; spouseStyle?: PosterTheme["spouseStyle"]; trunkStyle?: PosterTheme["trunkStyle"];
  /** A branch poster: the canopy base's son with the most people. */
  branch?: boolean;
  lineage?: TreeDTO["lineage"];
}

export const caseId = (s: CaseSpec) =>
  [s.family, s.lang, s.preset, s.paper, s.mode, s.nodeShape, s.soilStyle, s.labelMode, s.showYears ? "years" : "", s.spouseStyle, s.trunkStyle, s.branch ? "branch" : "", s.lineage]
    .filter(Boolean).join("_");

/** The family's own daughters with recorded children: "show all" draws their families through them. */
const daughtersWithFamilies = (t: TreeDTO) =>
  t.members.filter((m) => m.gender === "FEMALE" && m.fatherId && t.members.some((c) => c.motherId === m.id)).map((m) => m.id);

/** The son of the canopy base whose line holds the most people (a branch poster's subject). */
function largestBranch(t: TreeDTO): string | null {
  const kids = new Map<string, string[]>();
  for (const m of t.members) if (m.fatherId) kids.set(m.fatherId, [...(kids.get(m.fatherId) ?? []), m.id]);
  const size = (id: string): number => 1 + (kids.get(id) ?? []).reduce((a, k) => a + size(k), 0);
  const sons = t.members.filter((m) => m.fatherId === t.crownBaseId && m.gender === "MALE");
  return sons.sort((a, b) => size(b.id) - size(a.id))[0]?.id ?? null;
}

export function buildCase(s: CaseSpec): { tree: TreeDTO; theme: ReturnType<typeof resolveTheme> } {
  const base = STRESS_FAMILIES[s.family](s.lang);
  const m = MODES[s.mode];
  const theme = {
    preset: s.preset, v: 2, motherNames: m.motherNames,
    ...(s.nodeShape ? { nodeShape: s.nodeShape } : {}), ...(s.soilStyle ? { soilStyle: s.soilStyle } : {}),
    ...(s.labelMode ? { labelMode: s.labelMode } : {}), ...(s.showYears !== undefined ? { showYears: s.showYears } : {}),
    ...(s.spouseStyle ? { spouseStyle: s.spouseStyle } : {}), ...(s.trunkStyle ? { trunkStyle: s.trunkStyle } : {}),
  };
  const settings = {
    posterSize: s.paper, showFemales: m.showFemales, familiesThrough: m.through ? daughtersWithFamilies(base) : [],
    focusId: s.branch ? largestBranch(base) : null, theme,
  } as unknown as TreeDTO["settings"];
  const tree = { ...base, ...(s.lineage ? { lineage: s.lineage } : {}), settings };
  return { tree, theme: resolveTheme(settings) };
}

type Box = { x: number; y: number; w: number; h: number };
/** The foundation's box as a centred box: the foundations give theirs from its left edge and top (see drawPlaque). */
const soilBox = (l: PosterLayout): Box | null => {
  const b = boxOf((l.soil as unknown as { box?: unknown } | null)?.box);
  return b && { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h };
};
const boxOf = (b: unknown): Box | null => {
  const o = b as Record<string, number> | null;
  if (!o) return null;
  if ([o.x, o.y, o.w, o.h].every(Number.isFinite)) return { x: o.x, y: o.y, w: o.w, h: o.h };
  if ([o.x0, o.y0, o.x1, o.y1].every(Number.isFinite)) return { x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2, w: o.x1 - o.x0, h: o.y1 - o.y0 };
  return null;
};

/** The drawn geometry, for telling whether two papers gave the same poster. */
export function geometryHash(l: PosterLayout): string {
  const r = (v: number) => Math.round(v * 10) / 10;
  const parts = [...l.nodes, ...l.spouses].map((n) => `${n.id}:${r(n.x)},${r(n.y)},${r(n.w)},${r(n.h)},${r(n.fontSize)}`);
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

/** Siblings out of the documented order: birth order, half-siblings grouped by mother (mothers in order of first appearance), the centred branch excepted. */
function siblingOrderErrors(l: PosterLayout, tree: TreeDTO): string[] {
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const centred = new Set(l.centerLine ?? []);
  const drawn = l.nodes.filter((n) => (n as { ray?: number }).ray !== undefined && byId.has(n.member.id) && !centred.has(n.member.id));
  const groups = new Map<string, typeof drawn>();
  for (const n of drawn) {
    const p = n.member.fatherId ?? n.member.motherId;
    if (!p) continue;
    groups.set(p, [...(groups.get(p) ?? []), n]);
  }
  const errors: string[] = [];
  for (const [parent, kids] of groups) {
    if (kids.length < 2) continue;
    const firstMother = new Map<string, number>();
    for (const k of [...kids].sort((a, b) => a.member.birthOrder - b.member.birthOrder)) {
      const mo = k.member.motherId ?? "";
      if (!firstMother.has(mo)) firstMother.set(mo, firstMother.size);
    }
    const expected = [...kids].sort((a, b) => (firstMother.get(a.member.motherId ?? "")! - firstMother.get(b.member.motherId ?? "")!) || a.member.birthOrder - b.member.birthOrder).map((k) => k.member.id);
    // the eldest at the start of the sweep: on the right of an Arabic poster, on the left of an English one
    const along = [...kids].sort((a, b) => (l.rtl ? b.x - a.x : a.x - b.x)).map((k) => k.member.id);
    const byRay = [...kids].sort((a, b) => ((a as { ray?: number }).ray! - (b as { ray?: number }).ray!) * (l.rtl ? 1 : -1)).map((k) => k.member.id);
    if (expected.join() !== byRay.join() && expected.join() !== along.join()) errors.push(parent);
  }
  return errors;
}

export interface CaseRow {
  id: string; spec: CaseSpec; people: number; drawn: number; ms: number; heapMB: number; error?: string;
  legible?: boolean; textMm?: number; minMm?: number; overlaps?: number; counts?: Record<string, number>; defects?: number;
  clearCrossings?: number; nearMiss?: number; missingPeople?: string[]; duplicates?: string[]; siblingOrder?: string[];
  /** A mother's-line poster whose root is a man (see grade.py): his children with recorded mothers are not drawn. */
  maleRootMothersLine?: boolean;
  offPage?: string[]; truncated?: string[]; shape?: ReturnType<typeof measureShape>; svg?: { bytes: number; viewBox: boolean; bad: number };
  hash?: string; tooDense?: boolean; soilShortened?: boolean; svgFile?: string; equivalentTo?: string;
}

export function runStressCase(s: CaseSpec, keepSvg = true): CaseRow {
  const id = caseId(s);
  const { tree, theme } = buildCase(s);
  const row: CaseRow = { id, spec: s, people: tree.members.length, drawn: 0, ms: 0, heapMB: 0 };
  row.maleRootMothersLine = tree.lineage === "MATRILINEAL" && tree.members.find((m) => m.id === tree.rootMemberId)?.gender === "MALE";
  const g = (globalThis as { gc?: () => void }).gc;
  g?.();
  const heap0 = process.memoryUsage().heapUsed;
  const t0 = Date.now();
  let l: PosterLayout;
  try {
    l = computePosterLayout(tree, layoutOptionsFor(theme, s.paper));
  } catch (e) {
    row.error = String((e as Error).stack ?? e).slice(0, 600);
    row.ms = Date.now() - t0;
    return row;
  }
  row.ms = Date.now() - t0;
  row.heapMB = Math.round((process.memoryUsage().heapUsed - heap0) / 1e6);
  const ins = inspectPoster(l, tree, PAPER_SIZES[s.paper].w);
  row.drawn = l.nodes.length + l.spouses.length + l.trunkLabels.length;
  row.legible = l.legibility.ok;
  row.textMm = +l.legibility.smallestTextMm.toFixed(2);
  row.minMm = l.legibility.minTextMm;
  row.overlaps = l.overlaps;
  row.counts = ins.counts as Record<string, number>;
  row.defects = ins.defects;
  row.clearCrossings = l.clarity.clearCrossings;
  row.nearMiss = ins.counts["near-miss"] ?? 0;
  row.tooDense = l.tooDense;
  row.soilShortened = !!l.soilKeptNearest;
  // everyone who should be drawn is: a spouse when spouses are shown, a daughter's family when it is shown, anyone else always
  const m = MODES[s.mode];
  const through = new Set(tree.settings?.familiesThrough ?? []);
  row.missingPeople = explainNotDrawn(tree, l.unplacedIds ?? [])
    .filter((w) => w.kind === "other" || w.kind === "unlinked" || (w.kind === "spouse" && m.motherNames && !s.branch)
      || (w.kind === "daughter" && through.has((w as { throughId?: string }).throughId ?? "")))
    .map((w) => `${w.kind}:${w.id}`);
  // no one drawn twice (no cousin marriages in these families: a spouse is never also of the line)
  const seen = new Map<string, number>();
  for (const id2 of [...l.nodes.map((n) => n.member.id), ...l.spouses.filter((h) => !h.knot && !h.id.includes(":hidden:") && !h.id.endsWith(":?")).map((h) => h.member.id), ...l.trunkLabels.map((t) => t.member.id)]) {
    seen.set(id2, (seen.get(id2) ?? 0) + 1);
  }
  row.duplicates = [...seen].filter(([, n]) => n > 1).map(([id2]) => id2);
  row.siblingOrder = siblingOrderErrors(l, tree);
  // nothing past the page's edge
  const W = l.width, H = l.height;
  const boxes: [string, Box | null][] = [
    ...l.nodes.map((n): [string, Box] => [`node:${n.id}`, n]), ...l.spouses.map((n): [string, Box] => [`spouse:${n.id}`, n]),
    ...l.trunkLabels.map((t): [string, Box] => [`trunk:${t.member.id}`, t]), ["soil", soilBox(l)],
  ];
  row.offPage = boxes.filter(([, b]) => b && (![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.x - b.w / 2 < -0.5 || b.x + b.w / 2 > W + 0.5 || b.y - b.h / 2 < -0.5 || b.y + b.h / 2 > H + 0.5)).map(([k]) => k);
  // no name silently cut short
  const squash = (x: string) => x.replace(/\s+/g, "");
  row.truncated = [
    ...l.nodes.filter((n) => n.label.includes("…") || !squash(n.label).includes(squash(n.member.name))).map((n) => n.id),
    ...l.spouses.filter((h) => !h.knot && (h.label.includes("…") || (h.lines.length > 0 && squash(h.lines.join("")) !== squash(h.label)))).map((h) => h.id),
  ];
  row.shape = measureShape(l);
  row.hash = geometryHash(l);
  // the poster itself, as the app draws it
  try {
    const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout: l, meta: { title: tree.title, subtitle: null, name: "" }, theme }));
    const vb = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(/\s+/).map(Number) ?? [];
    row.svg = {
      bytes: svg.length,
      viewBox: vb.length === 4 && vb[0] === 0 && vb[1] === 0 && Math.abs(vb[2] - W) < 1 && Math.abs(vb[3] - H) < 1,
      bad: (svg.match(/="[^"]*(NaN|undefined|Infinity)[^"]*"/g) ?? []).length,
    };
    if (keepSvg) {
      mkdirSync(`${OUT}/svg`, { recursive: true });
      row.svgFile = `svg/${id}.svg.gz`;
      writeFileSync(`${OUT}/${row.svgFile}`, gzipSync(svg.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')));
    }
  } catch (e) {
    row.error = `render: ${String((e as Error).stack ?? e).slice(0, 400)}`;
  }
  return row;
}

/** Rows already recorded in a results file (a resumed run skips them). */
export function recorded(file: string): Map<string, CaseRow> {
  const map = new Map<string, CaseRow>();
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, "utf8").split("\n")) if (line.trim()) { const r = JSON.parse(line) as CaseRow; map.set(r.id, r); }
  return map;
}

export function record(file: string, row: CaseRow) {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(file, JSON.stringify(row) + "\n");
}
