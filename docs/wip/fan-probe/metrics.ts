import { createHash } from "node:crypto";
export function metrics(l: any) {
  const kinds: Record<string, number> = {};
  for (const i of l.clarity.issues) kinds[i.kind] = (kinds[i.kind] ?? 0) + 1;
  const pos = createHash("sha1").update(JSON.stringify([l.nodes.map((n: any) => [n.id, n.x.toFixed(2), n.y.toFixed(2)]), (l.spouses ?? []).map((s: any) => [s.id, s.x.toFixed(2), s.y.toFixed(2)])])).digest("hex").slice(0, 10);
  // line quality: total length of lines relative to straight, and longest line in name heights
  let ratio = 0, cnt = 0, longest = 0;
  const fs = l.nodes.reduce((a: number, n: any) => a + n.fontSize, 0) / Math.max(1, l.nodes.length);
  for (const e of l.edges ?? []) {
    const p = e.points; if (!p || p.length < 2) continue;
    let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    const S = Math.hypot(p[p.length - 1].x - p[0].x, p[p.length - 1].y - p[0].y);
    if (S > 1) { ratio += L / S; cnt++; }
    longest = Math.max(longest, L / fs);
  }
  const names = createHash("sha1").update(JSON.stringify(l.nodes.map((n: any) => [n.id, n.x.toFixed(2), n.y.toFixed(2)]))).digest("hex").slice(0, 10);
  return { names, problems: l.clarity.issues.length, kinds, overlaps: l.overlaps, mm: +l.legibility.smallestTextMm.toFixed(2),
    crossingsClear: l.clarity.clearCrossings ?? null, detour: +(ratio / Math.max(1, cnt)).toFixed(3), longest: +longest.toFixed(1), pos };
}
