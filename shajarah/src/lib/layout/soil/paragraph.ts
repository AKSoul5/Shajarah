// Heritage chronicle: the lineage as a passage from a family chronicle,
// below the trunk's ground and roots. No box: a fine rule with a headpiece
// opens it and a rule with a tailpiece closes it, on a faint ground of the
// design's ivory; the lines are balanced (the same number of lines, each as
// even as the wrap allows), so a short last line never trails off. Its
// space is measured as the inscribed panel's was, so nothing else moves.

import { clamp, fx, gapBelowGround, groundArc, ornament, rectPath, rootsTo, runningFont, wrapWords } from "./common";
import type { SoilContext, SoilPlacement, SoilShape, SoilStyleDef } from "./types";

// The inner rule sits half a name's height inside the outer one, and the
// text keeps clear of it on every side, at any size. (The rule was once set
// in by a share of the page: a long lineage set small on a large poster ran
// its first line into it.)
const geometry = (fs: number) => {
  const inset = fs * 0.5;
  const padY = inset + fs * 0.55, padX = inset + fs;
  return { inset, padY, padX, lh: fs * 1.65, ascent: fs * 1.05, descent: fs * 0.45 };
};

// (a little larger than the plaque's running text: on a large poster the
// whole lineage in two long lines read as a grey rule from a step away)
const paragraphFont = (ctx: SoilContext) => Math.max(runningFont(ctx), Math.min(ctx.f * 1.05, ctx.maxFont * 0.9));

const linesOf = (ctx: SoilContext) => {
  const fs = paragraphFont(ctx);
  const g = geometry(fs);
  const full = ctx.maxWidth - 2 * g.padX;
  const lines = wrapWords(ctx, ctx.text, full, fs);
  // balance: the narrowest width that still takes no more lines
  let lo = full * 0.5, hi = full, best = lines;
  if (lines.length > 1) {
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      const at = wrapWords(ctx, ctx.text, mid, fs);
      if (at.length <= lines.length) { hi = mid; best = at; } else lo = mid;
    }
  }
  return { fs, g, lines: best };
};

const boxHeight = (n: number, g: ReturnType<typeof geometry>) => 2 * g.padY + g.ascent + Math.max(0, n - 1) * g.lh + g.descent;

export const paragraph: SoilStyleDef = {
  id: "paragraph",
  label: "Heritage Chronicle",
  description: "The lineage as a refined written record, between a headpiece and a tailpiece.",
  height(ctx) {
    const { g, lines } = linesOf(ctx);
    return gapBelowGround(ctx) + boxHeight(lines.length, g);
  },
  layout(p) {
    const { fs, g, lines } = linesOf(p);
    const x0 = p.cx - p.maxWidth / 2;
    const top = p.groundY + gapBelowGround(p);
    const box = { x: x0, y: top, w: p.maxWidth, h: boxHeight(lines.length, g) };
    const inset = g.inset;
    const gw = clamp(p.trunkWidth * 1.4, p.maxWidth * 0.22, p.maxWidth * 0.32);
    return {
      style: "paragraph",
      ground: groundArc(p, gw),
      roots: rootsTo(p, top, gw),
      shapes: chronicle(p, box, inset, fs, Math.max(...lines.map((l) => p.textWidth(l, fs)))),
      texts: lines.map((text, k) => ({
        x: p.cx, y: top + g.padY + g.ascent + k * g.lh, text, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh", maxWidth: p.maxWidth - 2 * g.padX,
      })),
      fontSize: fs,
      box,
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.55,
      trunkTaper: 0,
    };
  },
};

/**
 * The chronicle's furniture: a faint ivory ground, a rule across the top
 * broken by a headpiece where the roots come down, and a rule across the
 * bottom broken by a tailpiece; both rules a little wider than the text.
 * (The first rule is drawn at the old inner rule's place, `inset` inside
 * the space, the text clear of it as before.)
 */
function chronicle(p: SoilPlacement, box: { x: number; y: number; w: number; h: number }, inset: number, fs: number, textW: number): SoilShape[] {
  const half = Math.min(box.w / 2, textW / 2 + fs * 1.6);
  const gapHalf = fs * 1.6;
  const top = box.y + inset, bottom = box.y + box.h - inset;
  const rule = (y: number) => `M${fx(p.cx - half)} ${fx(y)}H${fx(p.cx - gapHalf)}M${fx(p.cx + gapHalf)} ${fx(y)}H${fx(p.cx + half)}`;
  return [
    { d: rectPath(p.cx - half, box.y, 2 * half, box.h, fs * 0.6), fill: "ivory", opacity: 0.45 },
    { d: rule(top), stroke: "line", strokeWidth: p.W * 0.0007 },
    { d: rule(bottom), stroke: "line", strokeWidth: p.W * 0.0007 },
    // fine end-caps on the rules
    { d: [top, bottom].map((y) => `M${fx(p.cx - half)} ${fx(y - fs * 0.2)}V${fx(y + fs * 0.2)}M${fx(p.cx + half)} ${fx(y - fs * 0.2)}V${fx(y + fs * 0.2)}`).join(""), stroke: "line", strokeWidth: p.W * 0.0007 },
    ornament("mark", p.cx, top, fs * 0.36),
    ornament("finial", p.cx, bottom, fs * 0.28),
  ];
}
