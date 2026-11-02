// Generational layers: the trunk's roots settle on a foundation of soft
// layers, each wider than the one above, each carrying the next group of
// ancestors ("بن X بن Y …"), so the lineage widens downward like the strata
// of a heritage monument. Each layer's top edge is a low arch, its sides
// slope out to the layer below, and only its top edge carries a fine line
// in the design's ornament colour; the layers alternate a little in tone so
// each generation group reads as its own band.

import { avoidWidow, clamp, nameBase, fx, namesOf, ornament, restAsText, rootsTo, wordsOf, wrapWords } from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

/** Lines of the inscription, the first (under the trunk) narrowest. */
function measure(ctx: SoilContext) {
  const fs = clamp(Math.min(ctx.f * 0.9, nameBase(ctx) * 1.3), ctx.floor, ctx.maxFont * 0.72);
  const stepH = fs * 2.0;
  const names = namesOf(ctx);
  const text = names.prose ?? restAsText(ctx, names, 0);
  const firstW = clamp(fs * 9, fs * 6, ctx.maxWidth);
  const widen = fs * 3.2;
  const widthOf = (k: number) => Math.min(ctx.maxWidth, firstW + k * widen);
  // wrap with a width that grows line by line
  const lines: string[] = [];
  let cur = "";
  for (const word of wordsOf(text)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.textWidth(next, fs) > widthOf(lines.length) - fs * 2) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  const balanced = avoidWidow(ctx, lines, widthOf(lines.length - 1) - fs * 2, fs);
  lines.splice(0, lines.length, ...balanced);
  // a single word wider than its step still gets a step of its own size
  const widths = lines.map((l, k) => Math.max(widthOf(k), ctx.textWidth(l, fs) + fs * 2));
  return { fs, stepH, lines: lines.length ? lines : wrapWords(ctx, text, ctx.maxWidth, fs), widths, height: lines.length * stepH + fs * 0.5 };
}

export const pedestal: SoilStyleDef = {
  id: "pedestal",
  label: "Generational Layers",
  description: "A foundation widening downward in soft layers, each carrying a group of generations.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];
    const lift = m.fs * 0.28; // how much each layer's top edge rises at the centre
    m.lines.forEach((line, k) => {
      const w = m.widths[k];
      // the layer's top is as wide as the one above (or a little under the
      // trunk's flare for the first), its bottom its own width
      const wTop = k === 0 ? Math.min(w, Math.max(p.trunkWidth * 1.3, w * 0.8)) : Math.min(w, m.widths[k - 1]);
      const y = G + k * m.stepH;
      const yb = y + m.stepH;
      const r = m.fs * 0.35;
      const layer =
        `M${fx(p.cx - wTop / 2)} ${fx(y + lift)}Q${fx(p.cx)} ${fx(y - lift)} ${fx(p.cx + wTop / 2)} ${fx(y + lift)}`
        + `L${fx(p.cx + w / 2)} ${fx(yb - r)}Q${fx(p.cx + w / 2)} ${fx(yb)} ${fx(p.cx + w / 2 - r)} ${fx(yb)}`
        + `H${fx(p.cx - w / 2 + r)}Q${fx(p.cx - w / 2)} ${fx(yb)} ${fx(p.cx - w / 2)} ${fx(yb - r)}Z`;
      shapes.push({ d: layer, fill: "ivory", opacity: k % 2 === 0 ? 0.62 : 0.4 });
      shapes.push({ d: `M${fx(p.cx - wTop / 2)} ${fx(y + lift)}Q${fx(p.cx)} ${fx(y - lift)} ${fx(p.cx + wTop / 2)} ${fx(y + lift)}`, stroke: "gold", strokeWidth: p.W * 0.0007 });
      // a small ornament where each layer's edge meets the next
      if (k > 0) for (const sx of [-1, 1]) shapes.push(ornament("knot", p.cx + sx * wTop / 2, y + lift, m.fs * 0.18));
      texts.push({ x: p.cx, y: y + m.stepH * 0.66, text: line, fontSize: m.fs, anchor: "middle", ink: "ink", font: "naskh", maxWidth: Math.min(w, wTop + m.fs * 2) - m.fs * 0.8 });
    });
    // a fine double rule under the widest layer, in place of a heavy plinth
    const last = m.widths[m.widths.length - 1] ?? p.maxWidth;
    const yb = G + m.lines.length * m.stepH;
    shapes.push({ d: `M${fx(p.cx - last / 2 - m.fs * 0.3)} ${fx(yb + m.fs * 0.15)}H${fx(p.cx + last / 2 + m.fs * 0.3)}M${fx(p.cx - last / 2)} ${fx(yb + m.fs * 0.38)}H${fx(p.cx + last / 2)}`, stroke: "gold", strokeWidth: p.W * 0.0006 });
    const widest = Math.max(...m.widths, last + m.fs * 0.6);
    return {
      style: "pedestal",
      ground: null,
      // the trunk's roots settle onto the first layer
      roots: rootsTo(p, G + m.fs * 0.35, Math.min(p.trunkWidth * 0.45, (m.widths[0] ?? p.trunkWidth) * 0.3), 2, 0.6),
      shapes,
      texts,
      fontSize: m.fs,
      box: { x: p.cx - widest / 2, y: G, w: widest, h: m.height },
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.35,
      trunkTaper: 0,
    };
  },
};
