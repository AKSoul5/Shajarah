// Illuminated manuscript: a manuscript panel below the trunk. The trunk's
// roots land on an arched headpiece rising from the panel's top rule; a fine
// double rule frames it, with ornaments only at its corners and the middle
// of each side; a head- and tailpiece open and close the text; the nearest
// ancestor is set first, a little larger, in the bark's colour; the rest are
// stacked with small separators. A long lineage is set in columns (read
// right to left in Arabic, left to right in English), as manuscripts do,
// with fine rules between them; every name stays in the panel. The
// ornaments are drawn in the poster's own design.

import { clamp, nameBase, fx, gapBelowGround, namesOf, ornament, rectPath, rootsTo, runningFont, smallestName, wrapWords } from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

const BANNER_SHARE = 0.3;

function measure(ctx: SoilContext) {
  const { entries, prose } = namesOf(ctx);
  const fs = clamp(Math.min(ctx.f * 0.9, nameBase(ctx) * 1.3), ctx.floor, ctx.maxFont * 0.7);
  const pad = fs * 1.4; // between the inner rule and the names
  const rule = fs * 0.55; // between the two rules (the lozenge border)
  const head = fs * 1.5; // head- and tailpiece
  if (prose || !entries.length) {
    // a custom inscription that is not a nasab: set as text in the panel
    const tfs = runningFont(ctx);
    const width = ctx.maxWidth * 0.72;
    const lines = wrapWords(ctx, prose ?? ctx.text, width - 2 * (pad + rule), tfs);
    const inner = head * 2 + lines.length * tfs * 1.65;
    return { kind: "prose" as const, fs: tfs, pad, rule, head, lines, width, cols: 0, rows: 0, colW: 0, gutter: 0, entries,
      panelH: inner + 2 * (pad + rule), height: gapBelowGround(ctx) + inner + 2 * (pad + rule) };
  }
  const nameStep = fs * 1.25; // a name
  const sepStep = fs * 0.85; // and the ornament under it
  const colW = Math.max(fs * 7, ...entries.map((e) => ctx.textWidth(e.label, fs))) + fs * 1.4;
  const gutter = fs * 1.2;
  const frame = 2 * (pad + rule);
  const maxCols = Math.max(1, Math.floor((ctx.maxWidth - frame + gutter) / (colW + gutter)));
  const panelFor = (cols: number) => {
    const rows = Math.ceil(entries.length / cols);
    return { rows, h: frame + head * 2 + rows * nameStep + (rows - 1) * sepStep };
  };
  let cols = 1;
  while (cols < maxCols && gapBelowGround(ctx) + panelFor(cols).h > ctx.avail * BANNER_SHARE) cols++;
  const { rows, h } = panelFor(cols);
  return {
    kind: "names" as const, fs, pad, rule, head, lines: [] as string[], cols, rows, colW, gutter, entries, nameStep, sepStep,
    width: cols * colW + (cols - 1) * gutter + frame, panelH: h, height: gapBelowGround(ctx) + h,
  };
}

export const banner: SoilStyleDef = {
  id: "banner",
  label: "Illuminated Manuscript",
  description: "An ornamental manuscript panel; the ancestors in columns under an arched headpiece.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const top = G + gapBelowGround(p);
    const x = p.cx - m.width / 2;
    const { fs, pad, rule, head } = m;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];

    // the panel: outer and inner rules, ornaments at the corners and mid-sides only
    shapes.push({ d: rectPath(x, top, m.width, m.panelH, fs * 0.25), fill: "ivory", stroke: "gold", strokeWidth: p.W * 0.0011, opacity: 0.7 });
    shapes.push({ d: rectPath(x + rule, top + rule, m.width - 2 * rule, m.panelH - 2 * rule, fs * 0.15), stroke: "gold", strokeWidth: p.W * 0.0006 });
    const mid = rule / 2;
    for (const [cx, cy] of [[x + mid, top + mid], [x + m.width - mid, top + mid], [x + mid, top + m.panelH - mid], [x + m.width - mid, top + m.panelH - mid]]) {
      shapes.push(ornament("corner", cx, cy, fs * 0.3, 0.85));
    }
    for (const [cx, cy] of [[x + mid, top + m.panelH / 2], [x + m.width - mid, top + m.panelH / 2], [p.cx, top + m.panelH - mid]]) {
      shapes.push(ornament("sep", cx, cy, fs * 0.2, 0.85));
    }
    // the headpiece: a low pointed arch on the top rule, where the trunk's roots land
    const archW = Math.min(m.width * 0.4, Math.max(p.trunkWidth * 1.6, fs * 4));
    const archH = Math.min(gapBelowGround(p) * 0.85, fs * 0.8);
    const arch = `M${fx(p.cx - archW / 2)} ${fx(top)}C${fx(p.cx - archW * 0.22)} ${fx(top)} ${fx(p.cx - archW * 0.08)} ${fx(top - archH * 0.55)} ${fx(p.cx)} ${fx(top - archH)}`
      + `C${fx(p.cx + archW * 0.08)} ${fx(top - archH * 0.55)} ${fx(p.cx + archW * 0.22)} ${fx(top)} ${fx(p.cx + archW / 2)} ${fx(top)}Z`;
    shapes.push({ d: arch, fill: "ivory", stroke: "gold", strokeWidth: p.W * 0.0009 });
    // head- and tailpiece
    const innerTop = top + rule + pad;
    const innerBottom = top + m.panelH - rule - pad;
    shapes.push(ornament("mark", p.cx, innerTop + head * 0.35, fs * 1.5 * 0.42));
    shapes.push(ornament("mark", p.cx, innerBottom - head * 0.35, fs * 1.5 * 0.42));

    if (m.kind === "prose") {
      m.lines.forEach((line, k) => {
        texts.push({ x: p.cx, y: innerTop + head + fs * 1.15 + k * fs * 1.65, text: line, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh", maxWidth: m.width - 2 * (pad + rule) });
      });
    } else {
      // columns in reading order (right to left in Arabic), each read top to bottom
      const colX = (c: number) => {
        const left = x + rule + pad + m.colW / 2 + c * (m.colW + m.gutter);
        return p.rtl ? x + m.width - (left - x) : left;
      };
      m.entries.forEach((e, i) => {
        const c = Math.floor(i / m.rows), r = i % m.rows;
        const yName = innerTop + head + r * (m.nameStep! + m.sepStep!) + fs * 0.95;
        // the nearest ancestor a little larger, in the bark's colour; names left out quieter
        const nearest = i === 0 && !e.omitted;
        texts.push({
          x: colX(c), y: yName, text: e.label, fontSize: nearest ? Math.min(fs * 1.12, fs + m.sepStep! * 0.3) : fs, anchor: "middle",
          ink: e.omitted ? "muted" : nearest ? "bark" : "ink", font: "naskh", weight: e.omitted ? 400 : 700, memberId: e.id, maxWidth: m.colW + m.gutter * 0.5,
        });
        const isLast = r === m.rows - 1 || i === m.entries.length - 1;
        if (!isLast) shapes.push(ornament("sep", colX(c), yName + fs * 0.3 + m.sepStep! * 0.5, fs * 0.17, 0.9));
      });
      // fine rules between the columns
      for (let c = 1; c < m.cols; c++) {
        const between = (colX(c - 1) + colX(c)) / 2;
        shapes.push({ d: `M${fx(between)} ${fx(innerTop + head * 0.8)}V${fx(innerBottom - head * 0.8)}`, stroke: "gold", strokeWidth: p.W * 0.0005 });
      }
    }
    // the trunk stands on the panel's head, with a few fine roots onto its top rule
    return {
      style: "banner",
      ground: null,
      roots: rootsTo(p, top - archH * 0.5, Math.min(p.trunkWidth * 0.4, archW * 0.3), 2, 0.6),
      shapes,
      texts,
      fontSize: smallestName(texts, fs),
      box: { x, y: top, w: m.width, h: m.panelH },
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.3,
      trunkTaper: 0,
    };
  },
};
