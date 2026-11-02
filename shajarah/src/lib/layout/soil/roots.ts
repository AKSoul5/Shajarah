// Ancestral roots: the trunk flares into its roots and the lineage continues
// down a central taproot. Each ancestor rests at the end of a fine root that
// leaves the taproot, alternating sides (the first on the side the reading
// starts from: the right in Arabic), so the names read downward in order,
// straight and level, never along a curve. A gold thread runs on from the
// trunk down the taproot. The nearest ancestors are largest and most widely
// spaced; the oldest smaller (never below the legibility floor). A lineage
// longer than the roots' share of the page continues in the deep soil under
// them: a fine stratum line, then the rest as an inscription on the axis.
// Stylised and symmetrical, not botanical: a few roots, smooth tapers.

import { add, ribbonPath, type Cubic } from "../geometry";
import {
  clamp, drawInscription, nameBase, fitCount, fx, gapBelowGround, inscriptionFor, namesOf, ornament, restAsText, rootsTo, smallestName, unionBox,
} from "./common";
import type { SoilContext, SoilPlacement, SoilShape, SoilStyleDef, SoilText } from "./types";

/** Most of the content height the roots themselves may take. */
const ROOTS_SHARE = 0.26;
/** The flare of fine roots under the trunk, before the first name. */
const crownOf = (ctx: SoilContext) => ctx.f * 1.6;
/**
 * Names the roots keep however long the lineage: the composition needs a few
 * roots to read as roots (the foundation takes the room, the canopy less).
 */
const MIN_ROWS = 6;
/** The oldest name on the roots, relative to the nearest. */
const SMALLEST = 0.8;

interface Row {
  label: string;
  fs: number;
  /** Centre of the name, from the ground line. */
  y: number;
  side: 1 | -1;
  memberId: string | null;
  omitted: boolean;
}

/** Half the taproot's width where it leaves the trunk. */
const tapHalf = (ctx: SoilContext) => ctx.f * 0.3;

function measure(ctx: SoilContext) {
  const names = namesOf(ctx);
  const { entries } = names;
  const fsTop = clamp(Math.min(ctx.f * 1.18, nameBase(ctx) * 1.45), ctx.floor, ctx.maxFont * 0.85);
  const fsBottom = Math.max(ctx.floor, fsTop * SMALLEST);
  // the reading starts on the right in Arabic, on the left otherwise
  const first: 1 | -1 = ctx.rtl ? 1 : -1;
  const start = crownOf(ctx);
  // the shortest root: the name clears the taproot by this much at least
  const reachMin = (fs: number) => tapHalf(ctx) + fs * 1.1;
  const rowsFor = (k: number): Row[] => {
    const rows: Row[] = [];
    let y = start;
    for (let i = 0; i < k; i++) {
      const t = k > 1 ? i / (k - 1) : 0;
      const room = ctx.maxWidth / 2 - reachMin(fsTop);
      const fit = room / Math.max(1e-6, ctx.textWidth(entries[i].label, 1));
      const fs = Math.max(ctx.floor, Math.min(fsTop + (fsBottom - fsTop) * t, fit));
      // names alternate sides, so neighbours may overlap in height a little;
      // more air near the trunk
      y += i === 0 ? fs * 1.1 : ((rows[i - 1].fs + fs) / 2) * (1.05 + 0.35 * (1 - t));
      rows.push({
        label: entries[i].label, fs, y, side: (i % 2 === 0 ? first : -first) as 1 | -1, memberId: entries[i].id, omitted: !!entries[i].omitted,
      });
    }
    return rows;
  };
  const bottomOf = (rows: Row[]) => {
    const last = rows[rows.length - 1];
    return last ? last.y + last.fs * 0.5 + last.fs * 1.4 : start;
  };
  const k = Math.max(Math.min(MIN_ROWS, entries.length), fitCount(entries.length, ctx.avail * ROOTS_SHARE, (n) => bottomOf(rowsFor(n))));
  const rows = rowsFor(k);
  const headBottom = bottomOf(rows);
  // the deep soil is wide and low, like the ground it is
  const rest = inscriptionFor(ctx, restAsText(ctx, names, k), ctx.maxWidth * 0.78);
  // Each root reaches out by a share of the room the widest name leaves, so
  // the names stand out in the page and the roots read as roots.
  const free = Math.min(...rows.map((r) => ctx.maxWidth / 2 - ctx.textWidth(r.label, r.fs) - r.fs * 0.3), ctx.maxWidth / 2);
  const reach = clamp(tapHalf(ctx) + free * 0.3, reachMin(fsTop), tapHalf(ctx) + fsTop * 3.2);
  // the deep soil: a stratum line above the rest of the lineage
  const stratum = rest ? gapBelowGround(ctx) * 0.6 : 0;
  return { rows, headBottom, rest, stratum, height: headBottom + stratum + (rest?.height ?? 0), fsTop, reach };
}

export const roots: SoilStyleDef = {
  id: "roots",
  label: "Ancestral Roots",
  description: "The trunk grows into its roots; each ancestor rests on a root, read downward from the trunk.",
  height: (ctx) => measure(ctx).height,
  layout(p: SoilPlacement) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];
    const boxes: { x: number; y: number; w: number; h: number }[] = [];

    // The taproot: from under the trunk to a fine point below the last name,
    // swaying a little (it is a root, not a rule), tapering as it goes.
    const yTop = G - p.f * 0.2;
    const yEnd = G + m.headBottom - (m.rest ? 0 : (m.rows.at(-1)?.fs ?? p.f) * 0.3);
    // as wide as a good share of the trunk where it leaves it, narrowing
    // quickly to the measured width, then on to a fine point
    const w0 = Math.max(tapHalf(p), p.trunkWidth * 0.2), w1 = p.f * 0.03;
    const sway = p.f * 0.16;
    const at = (y: number) => {
      const u = clamp((y - yTop) / Math.max(1, yEnd - yTop), 0, 1);
      const body = w1 + (tapHalf(p) - w1) * (1 - u) ** 1.2;
      return { x: p.cx + sway * Math.sin(u * Math.PI * 1.6) * u, half: body + (w0 - tapHalf(p)) * Math.exp(-u * 9) };
    };
    const N = 48;
    const left: string[] = [], right: string[] = [];
    for (let i = 0; i <= N; i++) {
      const y = yTop + ((yEnd - yTop) * i) / N;
      const { x, half } = at(y);
      right.push(`${fx(x + half)} ${fx(y)}`);
      left.unshift(`${fx(x - half)} ${fx(y)}`);
    }
    shapes.push({ d: `M${right.join("L")}L${left.join("L")}Z`, fill: "trunk" });
    // the gold thread runs on from the trunk's ancestors down the taproot
    const thread: string[] = [];
    for (let i = 0; i <= N; i++) {
      const y = p.threadFrom + ((yEnd - p.f * 0.4 - p.threadFrom) * i) / N;
      thread.push(`${fx(y < yTop ? p.cx : at(y).x)} ${fx(y)}`);
    }
    shapes.push({ d: `M${thread.join("L")}`, stroke: "goldLight", strokeWidth: p.f * 0.06 });
    boxes.push({ x: p.cx - w0 - sway, y: G, w: 2 * (w0 + sway), h: Math.max(0, yEnd - G) });

    // A root to each name: it leaves the taproot above the name and curves
    // out and down to it, ending in a small knot by the name.
    const rootlets: string[] = [];
    for (const r of m.rows) {
      const y = G + r.y;
      const from = at(y - r.fs * 1.0);
      const start = { x: from.x + r.side * from.half * 0.6, y: y - r.fs * 1.0 };
      const end = { x: p.cx + r.side * m.reach, y: y - r.fs * 0.05 };
      // leaving the taproot steeply, then easing out level towards the name
      const curve: Cubic = {
        p0: start, c1: add(start, { x: r.side * (m.reach * 0.12), y: r.fs * 0.7 }),
        c2: add(end, { x: -r.side * m.reach * 0.5, y: 0 }), p1: end,
      };
      if (r.omitted) {
        // names left out: a broken root, in a fine dashed line
        shapes.push({ d: `M${fx(start.x)} ${fx(start.y)}C${fx(curve.c1.x)} ${fx(curve.c1.y)} ${fx(curve.c2.x)} ${fx(curve.c2.y)} ${fx(end.x)} ${fx(end.y)}`, stroke: "muted", strokeWidth: p.f * 0.05, dash: [p.f * 0.12, p.f * 0.18] });
      } else {
        rootlets.push(ribbonPath(curve, Math.max(p.f * 0.16, from.half * 0.9), p.f * 0.03, 16, 1.8));
        shapes.push(ornament("knot", end.x + r.side * r.fs * 0.12, end.y, r.fs * 0.2));
      }
      const nearX = end.x + r.side * r.fs * 0.45;
      const extendsRight = r.side === 1;
      texts.push({
        x: nearX, y: y + r.fs * 0.32, text: r.label, fontSize: r.fs, ink: r.omitted ? "muted" : "ink", font: "naskh",
        weight: r.omitted ? 400 : 700, memberId: r.memberId, anchor: extendsRight === p.rtl ? "end" : "start",
      });
      const w = p.textWidth(r.label, r.fs);
      boxes.push({ x: extendsRight ? nearX : nearX - w, y: y - r.fs * 0.8, w, h: r.fs * 1.4 });
    }
    if (rootlets.length) shapes.push({ d: rootlets.join(""), fill: "bark", opacity: 0.85 });

    if (m.rest) {
      // the deep soil: a fine stratum line, the taproot's point on it, then the rest of the lineage
      const sy = G + m.headBottom + m.stratum * 0.35;
      const half = Math.min(p.maxWidth * 0.22, m.rest.width * 0.3);
      shapes.push({ d: `M${fx(p.cx - half)} ${fx(sy + p.f * 0.12)}Q${fx(p.cx)} ${fx(sy - p.f * 0.12)} ${fx(p.cx + half)} ${fx(sy + p.f * 0.12)}`, stroke: "line", strokeWidth: p.f * 0.04, opacity: 0.6 });
      const ins = drawInscription(p, m.rest, G + m.headBottom + m.stratum);
      shapes.push(...ins.shapes);
      texts.push(...ins.texts);
      boxes.push(ins.box, { x: p.cx - half, y: sy - p.f * 0.2, w: 2 * half, h: p.f * 0.4 });
    } else if (m.rows.length) {
      shapes.push(ornament("finial", at(yEnd).x, yEnd + p.f * 0.1, p.f * 0.26));
    }
    if (!boxes.length) boxes.push({ x: p.cx, y: G, w: 0, h: m.height });
    // keep the declared height exactly
    boxes.push({ x: p.cx, y: G, w: 0, h: m.height });
    return {
      style: "roots",
      ground: null,
      // the trunk flares into a few fine roots of its own
      roots: rootsTo(p, G + crownOf(p) * 0.9, p.trunkWidth * 0.55, 2, 0.7),
      shapes,
      texts,
      fontSize: smallestName(texts, m.fsTop),
      box: unionBox(boxes),
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.45,
      trunkTaper: 0,
    };
  },
};
