// DESIGN SKETCH (not app code): refinements of direction A for the side
// families, drawn on the real layout. Canopy, trunk, badges, title and every
// name's size are unchanged; only the side families are re-placed and their
// branches redrawn. Run by copying into shajarah/tests/tools/ (see README
// note in design/side-boughs.md); writes SVGs and numbers, no names.
import * as React from "react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it } from "vitest";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { computePosterLayout, type Branch, type PosterLayout, type PosterNode } from "@/lib/layout/botanical";
import { circlePath, ribbonPath } from "@/lib/layout/geometry";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { readProjectFile } from "@/lib/project";
import { TreePoster } from "@/components/poster/TreePoster";
import type { TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;
type V = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
type Fam = { badgeY: number; port: V; sgn: number; head: PosterNode; kids: Map<string, PosterNode[]>; nodes: PosterNode[] };

/** A family as a little tree, in its own frame (x outward from the trunk's edge, y up from the head's level). */
type Style = { angle: (share: number) => number; sibling: number; reach: (share: number) => number };
const STYLES: Record<string, Style> = {
  // R1: reach by size: the largest family reaching towards the page edge, small ones short and close
  R1: { angle: () => 26, sibling: 1.9, reach: (s) => 0.45 + 0.5 * s },
  // R2: layered, flatter and wider, siblings spread a little more
  R2: { angle: (s) => 14 + 6 * (1 - s), sibling: 2.2, reach: (s) => 0.55 + 0.45 * s },
  // R3: airy, every family given generous room between generations and siblings
  R3: { angle: (s) => 22 + 6 * (1 - s), sibling: 2.6, reach: (s) => 0.7 + 0.3 * s },
};

function grow(f: Fam, fs: number, st: Style, share: number, room: number): Map<string, V> {
  const root = hierarchy({ id: f.head.id }, (d) => (f.kids.get(d.id) ?? []).map((k) => ({ id: k.id })));
  const maxW = Math.max(...f.nodes.map((n) => n.w));
  const depth = Math.max(1, root.height);
  // generations along the axis: at least room for a name and its line, more for a family given more reach
  const minStep = maxW * 0.75 + fs * 2.2;
  const lead = maxW * 0.55 + fs * 4; // the limb from the badge to the head
  const want = room * st.reach(share);
  const step = Math.max(minStep, Math.min(minStep * 3, (want - lead) / depth));
  d3tree<{ id: string }>().nodeSize([fs * st.sibling, step]).separation((a, b) => (a.parent === b.parent ? 1 : 1.35))(root);
  const a = (st.angle(share) * Math.PI) / 180;
  const out = new Map<string, V>();
  root.each((d) => {
    const along = (d.y ?? 0) + lead, across = d.x ?? 0;
    out.set(d.data.id, { x: along * Math.cos(a) + across * Math.sin(a), y: along * Math.sin(a) - across * Math.cos(a) });
  });
  return out;
}

const overlap = (a: Box, b: Box, pad = 0) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + pad;
const segCross = (p: V, q: V, r: V, s: V) => {
  const d = (a: V, b: V, c: V) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
};

function compose(L: PosterLayout, st: Style) {
  const trunkIds = new Set(L.trunkLabels.map((t) => t.member.id));
  const W = L.width, cx = L.origin.x;
  const fs = [...L.nodes.map((n) => n.fontSize)].sort((a, b) => a - b)[L.nodes.length >> 1];
  const heads = L.nodes.filter((n) => n.parentId && trunkIds.has(n.parentId));
  const inFam = new Map<string, PosterNode>();
  const fams: Fam[] = heads.map((h) => {
    const kids = new Map<string, PosterNode[]>();
    const nodes: PosterNode[] = [h];
    const stack = [h];
    while (stack.length) {
      const p = stack.pop()!;
      inFam.set(p.id, h);
      const ks = L.nodes.filter((n) => n.parentId === p.id);
      kids.set(p.id, ks);
      nodes.push(...ks);
      stack.push(...ks);
    }
    return { badgeY: L.trunkLabels.find((t) => t.member.id === h.parentId)!.y, port: L.edges.find((e) => e.childId === h.id)!.points[0], sgn: Math.sign(h.x - cx) || 1, head: h, kids, nodes };
  });
  // fixed: canopy names, the base, badges, stubs, spouses not of the side families
  const fixed: Box[] = [
    ...L.nodes.filter((n) => !inFam.has(n.id)), ...L.trunkLabels, ...L.stubs, ...(L.base ? [L.base] : []),
    ...L.spouses.filter((s) => !inFam.has(s.partnerId)),
    { x: cx, y: (L.origin.y + L.groundY) / 2, w: L.trunkWidth, h: L.groundY - L.origin.y },
  ];
  const leaves = (f: Fam) => f.nodes.filter((n) => !(f.kids.get(n.id) ?? []).length).length;
  const pos = new Map<string, V>();
  for (const sgn of [-1, 1]) {
    const side = fams.filter((f) => f.sgn === sgn).sort((a, b) => a.badgeY - b.badgeY || leaves(b) - leaves(a));
    if (!side.length) continue;
    const maxLeaves = Math.max(...side.map(leaves));
    const room = (sgn < 0 ? cx - L.trunkWidth / 2 - W * 0.045 : W * 0.955 - (cx + L.trunkWidth / 2));
    for (const f of side) {
      const share = Math.sqrt(leaves(f) / maxLeaves);
      const local = grow(f, fs, st, share, room);
      // the nearest level to its badge where none of its names meets anything placed (up first a little, then down)
      const place = (dy: number, kx: number) => f.nodes.map((n) => {
        const q = local.get(n.id)!;
        return { n, p: { x: cx + sgn * (L.trunkWidth / 2 + q.x * kx), y: f.badgeY + dy - q.y } };
      });
      const fits = (pl: { n: PosterNode; p: V }[]) => pl.every(({ n, p }) => {
        const b = { x: p.x, y: p.y, w: n.w, h: n.h };
        if (p.x - n.w / 2 < W * 0.04 || p.x + n.w / 2 > W * 0.96 || p.y + n.h / 2 > L.groundY - fs) return false;
        return !fixed.some((o) => overlap(b, o, fs * 0.25));
      });
      let best: { n: PosterNode; p: V }[] | null = null;
      search: for (const kx of [1, 0.9, 0.8, 0.7]) {
        for (let k = 0; k < 80; k++) {
          const dy = (k % 2 === 0 ? 1 : -0.6) * Math.ceil(k / 2) * fs * 1.2;
          const pl = place(dy, kx);
          if (fits(pl)) { best = pl; break search; }
        }
      }
      if (!best) best = place(0, 0.7);
      for (const { n, p } of best) { pos.set(n.id, p); fixed.push({ x: p.x, y: p.y, w: n.w, h: n.h }); }
    }
  }
  const nodes = L.nodes.map((n) => (pos.has(n.id) ? { ...n, ...pos.get(n.id)!, angle: 0 } : n));
  const nById = new Map(nodes.map((n) => [n.id, n]));
  const kidsOf = (id: string) => nodes.filter((n) => n.parentId === id);
  const leafCount = (id: string): number => { const k = kidsOf(id); return k.length ? k.reduce((s, c) => s + leafCount(c.id), 0) : 1; };
  const wMin = Math.max(fs * 0.12, Math.min(...L.branches.filter((b) => !b.dotted).map((b) => b.w)));
  // drop the side families' old branches (a ribbon's outline starts half its width off its line)
  const starts = L.edges.filter((e) => inFam.has(e.childId)).map((e) => e.points[0]);
  const keep = (b: Branch) => {
    const m = b.d.match(/^M\s*([-\d.]+)[ ,]([-\d.]+)/);
    return !m || !starts.some((p) => Math.hypot(p.x - Number(m[1]), p.y - Number(m[2])) < b.w * 0.6 + 2);
  };
  const newB: Branch[] = [];
  const segs: { a: V; b: V; fam: string; parent: string }[] = [];
  for (const f of fams) {
    const headW = L.edges.find((e) => e.childId === f.head.id)?.w0 ?? wMin * 3;
    for (const n of f.nodes) {
      const c = nById.get(n.id)!;
      const isHead = n.id === f.head.id;
      const P: V = isHead ? f.port : nById.get(n.parentId!)!;
      // leave along the parent's own growth (the head: level out of the badge), arrive along the way
      const pp = isHead ? null : nById.get(n.parentId!)!;
      const gp = pp && pp.id !== f.head.id ? nById.get(pp.parentId!) : null;
      const gdir = isHead ? { x: f.sgn, y: 0 } : gp ? { x: pp!.x - gp.x, y: pp!.y - gp.y } : { x: pp!.x - f.port.x, y: pp!.y - f.port.y };
      const gl = Math.hypot(gdir.x, gdir.y) || 1;
      const d = { x: c.x - P.x, y: c.y - P.y }, Ld = Math.hypot(d.x, d.y) || 1;
      const curve = { p0: P, c1: { x: P.x + (gdir.x / gl) * Ld * 0.4, y: P.y + (gdir.y / gl) * Ld * 0.4 }, c2: { x: c.x - d.x * 0.28, y: c.y - d.y * 0.28 }, p1: { x: c.x, y: c.y } };
      // primary, secondary, tertiary: as wide as today's limb, then by the share of its descendants
      const w0 = Math.max(wMin, headW * Math.sqrt(leafCount(n.id) / leafCount(f.head.id))) * (isHead ? 1 : 0.92);
      newB.push({ d: ribbonPath(curve, w0, Math.max(wMin * 0.8, w0 * 0.72), 16, 2) + (isHead ? "" : circlePath(P, w0 / 2)), w: w0, lineage: n.lineage ?? null });
      const pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8, u = 1 - t; return { x: u * u * u * curve.p0.x + 3 * u * u * t * curve.c1.x + 3 * u * t * t * curve.c2.x + t * t * t * c.x, y: u * u * u * curve.p0.y + 3 * u * u * t * curve.c1.y + 3 * u * t * t * curve.c2.y + t * t * t * c.y }; });
      for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], fam: f.head.id, parent: isHead ? "port" : n.parentId! });
    }
  }
  // checks: names overlapping (any pair with a side-family name), lines crossing (two side-family lines, not from the same parent)
  let overlaps = 0;
  const side = nodes.filter((n) => pos.has(n.id));
  const all: Box[] = [...nodes, ...L.trunkLabels, ...L.stubs, ...(L.base ? [L.base] : [])];
  for (const a of side) for (const b of all) if (a !== b && overlap(a, b) && (!pos.has((b as PosterNode).id) || a.id < (b as PosterNode).id)) overlaps++;
  let crossings = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) if (segs[i].parent !== segs[j].parent && segCross(segs[i].a, segs[i].b, segs[j].a, segs[j].b)) crossings++;
  const xs = nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]);
  const dist = side.map((n) => Math.abs(n.y - fams.find((f) => f.head.id === inFam.get(n.id)!.id)!.badgeY));
  return {
    layout: { ...L, nodes, branches: [...L.branches.filter(keep), ...newB].sort((a, b) => b.w - a.w), spouses: L.spouses.filter((s) => !inFam.has(s.partnerId)) } as PosterLayout,
    overlaps, crossings, span: (Math.max(...xs) - Math.min(...xs)) / W, meanFromBadge: dist.reduce((a, b) => a + b, 0) / dist.length,
  };
}

it.skipIf(!process.env.SKETCH)("side boughs, refinements of A", () => {
  const out = process.env.OUT!;
  mkdirSync(out, { recursive: true });
  const f = readProjectFile(readFileSync(process.env.SHOTS_FAMILY!, "utf8"));
  const paper = "A0" as PaperSize;
  const tree = { ...f.tree, id: "private", settings: { ...f.tree.settings, focusId: null, posterSize: paper } } as unknown as TreeDTO;
  const t = resolveTheme(tree.settings);
  const L = computePosterLayout(tree, { showFemales: tree.settings?.showFemales ?? false, seed: tree.settings?.seed, ...layoutOptionsFor(t, paper) } as never);
  const meta = { title: tree.title ?? tree.name, subtitle: tree.subtitle ?? null, name: "" };
  const draw = (l: PosterLayout) => renderToStaticMarkup(React.createElement(TreePoster, { layout: l, meta, theme: t })).replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  const mm = PAPER_SIZES[paper].w / L.width;
  writeFileSync(`${out}/now_${paper}.svg`, draw(L));
  const xs = L.nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]);
  const info: Record<string, unknown> = { base: { x: L.base!.x, y: L.base!.y }, mm, now: { span: +((Math.max(...xs) - Math.min(...xs)) / L.width).toFixed(2) } };
  for (const k of Object.keys(STYLES)) {
    const r = compose(L, STYLES[k]);
    writeFileSync(`${out}/${k}_${paper}.svg`, draw(r.layout));
    info[k] = { overlaps: r.overlaps, crossings: r.crossings, span: +r.span.toFixed(2), meanMmFromBadge: +(r.meanFromBadge * mm).toFixed(0) };
    console.log("RES", k, JSON.stringify(info[k]));
  }
  console.log("RES now", JSON.stringify(info.now));
  writeFileSync(`${out}/info_${paper}.json`, JSON.stringify(info));
}, 900000);
