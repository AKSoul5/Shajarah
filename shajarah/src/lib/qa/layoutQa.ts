// Layout QA: what a finished poster gets wrong, as findings with a place on
// the page, for the QA suite's report (tests/qa/layout-qa.test.ts). It only
// looks; it never changes a layout.
//
// Defects (the poster misleads or hides something):
//  - every relationship-clarity issue (see clarity.ts): a connection missing
//    or drawn from the wrong parent, a line ending away from its name, a
//    line under an unrelated name, any line crossing another (siblings'
//    lines once they leave their parent's name, steep crossings too), two
//    lines running together, a false junction, the trunk out of order;
//  - names overlapping one another;
//  - the foundation's text overlapping itself, a name or line of the
//    canopy, or the footer's key.
// For review (worth a look at print size):
//  - clear crossings: steep, away from names, listed again on their own
//    (each is also a defect above);
//  - near misses: two unrelated lines passing closer than NEAR_MM at print
//    size without touching, which can read as connected once printed.

import { textWidth, type PosterLayout } from "../layout/botanical";
import { validateRelationships } from "../layout/clarity";
import { decorOutset, drawnOutline, outlinesOverlap } from "../layout/nodeGeometry";
import type { Vec } from "../layout/geometry";
import type { TreeDTO } from "../types";

/** Two unrelated lines closer than this at print size (mm), edge to edge, are a near miss. */
export const NEAR_MM = 0.6;

export type FindingKind =
  | "missing" | "misattached" | "occlusion" | "crossing" | "merge" | "junction" | "trunk-order"
  | "label-overlap" | "soil-text-overlap" | "soil-over-canopy" | "soil-over-key"
  | "clear-crossing" | "near-miss" | "decor-overlap";

export const DEFECTS: FindingKind[] = [
  "missing", "misattached", "occlusion", "crossing", "merge", "junction", "trunk-order",
  "label-overlap", "soil-text-overlap", "soil-over-canopy", "soil-over-key",
];

export interface Finding {
  kind: FindingKind;
  /** On the poster (page units), for the close-up. */
  at?: Vec;
  /** The people concerned (member ids), and what the check says. */
  ids?: string[];
  detail?: string;
}

export interface Inspection {
  findings: Finding[];
  counts: Partial<Record<FindingKind, number>>;
  defects: number;
  /** The poster as laid out: size, people, legibility. */
  summary: { width: number; height: number; people: number; edges: number; legible: boolean; smallestTextMm: number };
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlap = (a: Box, b: Box, pad = 0) => a.x0 < b.x1 - pad && b.x0 < a.x1 - pad && a.y0 < b.y1 - pad && b.y0 < a.y1 - pad;

/** Shortest distance between two segments. */
function segDist(p: Vec, q: Vec, r: Vec, s: Vec): number {
  const d = (a: Vec, b: Vec, c: Vec) => {
    const vx = c.x - b.x, vy = c.y - b.y, L = vx * vx + vy * vy;
    const t = L ? Math.max(0, Math.min(1, ((a.x - b.x) * vx + (a.y - b.y) * vy) / L)) : 0;
    return Math.hypot(a.x - (b.x + t * vx), a.y - (b.y + t * vy));
  };
  return Math.min(d(p, r, s), d(q, r, s), d(r, p, q), d(s, p, q));
}

export function inspectPoster(layout: PosterLayout, tree: TreeDTO, paperWidthMm: number): Inspection {
  const findings: Finding[] = [];
  const unit = paperWidthMm / layout.width; // mm per page unit

  // relationship clarity (the layout's own check, run again on the finished poster)
  const clarity = validateRelationships(layout, tree);
  for (const i of clarity.issues) {
    findings.push({
      kind: i.kind, at: i.at, detail: i.detail,
      ids: [...(i.edge ?? []), ...(Array.isArray(i.other) ? i.other : i.other ? [i.other] : [])],
    });
  }
  for (const c of clarity.crossings ?? []) findings.push({ kind: "clear-crossing", at: c.at, ids: [...c.edge, ...c.other] });

  // names over names
  const labels = [
    ...layout.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h })),
    ...layout.trunkLabels.map((t) => ({ id: t.member.id, x: t.x, y: t.y, w: t.w, h: t.h })),
    ...(layout.spouses ?? []).filter((s) => !s.knot).map((s) => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h })),
  ].map((b) => ({ id: b.id, box: { x0: b.x - b.w / 2, y0: b.y - b.h / 2, x1: b.x + b.w / 2, y1: b.y + b.h / 2 } }));
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    if (overlap(labels[i].box, labels[j].box, 1)) {
      const a = labels[i].box;
      findings.push({ kind: "label-overlap", at: { x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 }, ids: [labels[i].id, labels[j].id] });
    }
  }

  // names whose drawn shapes touch: the outline's stroke and a parent's
  // gold ring reach past the laid-out box, so boxes clear of each other can
  // still be drawn touching (shape-accurate: an oval's empty corners count
  // for nothing)
  {
    const shapes = layout.nodes.map((n) => ({ id: n.id, out: drawnOutline(n), r: Math.max(n.w, n.h) / 2 + decorOutset(n), x: n.x, y: n.y }));
    for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i], b = shapes[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r) continue;
      if (outlinesOverlap(a.out, b.out)) findings.push({ kind: "decor-overlap", at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ids: [a.id, b.id] });
    }
  }

  // near misses between unrelated lines (as the clarity check pairs them)
  const near = NEAR_MM / unit;
  const bb = layout.edges.map((e) => {
    const xs = e.points.map((p) => p.x), ys = e.points.map((p) => p.y);
    const pad = Math.max(e.w0, e.w1) + near;
    return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
  });
  const flagged = new Set<string>([...findings].filter((f) => f.ids && f.ids.length >= 4).map((f) => f.ids!.join("|")));
  for (let i = 0; i < layout.edges.length; i++) {
    const a = layout.edges[i];
    for (let j = i + 1; j < layout.edges.length; j++) {
      const b = layout.edges[j];
      if (a.childId === b.parentId || b.childId === a.parentId || a.parentId === b.parentId) continue;
      if (!overlap(bb[i], bb[j])) continue;
      const key = [a.parentId, a.childId, b.parentId, b.childId].join("|");
      const rev = [b.parentId, b.childId, a.parentId, a.childId].join("|");
      if (flagged.has(key) || flagged.has(rev)) continue;
      let best = Infinity, at: Vec | undefined;
      for (let p = 1; p < a.points.length; p++) for (let q = 1; q < b.points.length; q++) {
        const dd = segDist(a.points[p - 1], a.points[p], b.points[q - 1], b.points[q]);
        if (dd < best) { best = dd; at = { x: (a.points[p].x + b.points[q].x) / 2, y: (a.points[p].y + b.points[q].y) / 2 }; }
      }
      const half = (Math.max(a.w0, a.w1) + Math.max(b.w0, b.w1)) / 2;
      // touching or crossing is the clarity check's business; just apart but close is a near miss
      if (best > 1e-6 && best - half > 0 && best - half < near) {
        findings.push({ kind: "near-miss", at, ids: [a.parentId, a.childId, b.parentId, b.childId], detail: `${((best - half) * unit).toFixed(2)} mm apart` });
      }
    }
  }

  // the foundation: its text against itself, the canopy and the footer's key
  if (layout.soil) {
    const s = layout.soil;
    const tb = (t: (typeof s.texts)[number]): Box => {
      const w = textWidth(t.text, t.fontSize) * (t.font === "ruqaa" ? 1.15 : 1);
      const x0 = t.anchor === "middle" ? t.x - w / 2 : (t.anchor === "start") !== layout.rtl ? t.x : t.x - w;
      return { x0, x1: x0 + w, y0: t.y - t.fontSize * 0.85, y1: t.y + t.fontSize * 0.3 };
    };
    const tbs = s.texts.map(tb);
    for (let i = 0; i < tbs.length; i++) for (let j = i + 1; j < tbs.length; j++) {
      if (overlap(tbs[i], tbs[j], 1)) findings.push({ kind: "soil-text-overlap", at: { x: tbs[i].x0, y: tbs[i].y0 }, detail: `"${s.texts[i].text.slice(0, 20)}" / "${s.texts[j].text.slice(0, 20)}"` });
    }
    for (const [i, b] of tbs.entries()) {
      const hit = labels.find((l) => overlap(l.box, b, 1));
      const line = layout.edges.find((e) => e.points.some((p) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1));
      if (hit || line) findings.push({ kind: "soil-over-canopy", at: { x: b.x0, y: b.y0 }, ids: hit ? [hit.id] : line ? [line.parentId, line.childId] : [], detail: `"${s.texts[i].text.slice(0, 20)}"` });
    }
    // the footer's key (see TreePoster's Footer): its top
    const keyTop = layout.frame.footerY - layout.width * 0.012 * (4.15 + 0.6);
    if (s.box.y + s.box.h > keyTop) findings.push({ kind: "soil-over-key", at: { x: s.box.x + s.box.w / 2, y: keyTop }, detail: `${((s.box.y + s.box.h - keyTop) * unit).toFixed(1)} mm into the key` });
  }

  const counts: Inspection["counts"] = {};
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  return {
    findings, counts, defects: findings.filter((f) => DEFECTS.includes(f.kind)).length,
    summary: {
      width: layout.width, height: layout.height, people: layout.nodes.length, edges: layout.edges.length,
      legible: layout.legibility.ok, smallestTextMm: layout.legibility.smallestTextMm,
    },
  };
}
