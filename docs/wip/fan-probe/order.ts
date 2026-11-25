// Per spouse ring: pairwise order inversions between partners, boxes and children's middles (angles round the canopy base).
import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin, ang = (p: any) => { const a = Math.atan2(O.y - p.y, p.x - O.x); return a < -Math.PI / 2 ? a + 2 * Math.PI : a; };
const byId = new Map<string, any>(); for (const n of l.nodes) byId.set(n.id, n);
const rows: any[] = [];
for (const s of l.spouses) {
  const p = byId.get(s.partnerId); if (!p || !s.childIds?.length) continue;
  const kids = s.childIds.map((id: string) => byId.get(id)).filter(Boolean); if (!kids.length) continue;
  rows.push({ d: p.depth ?? Math.round(Math.hypot(p.x - O.x, p.y - O.y)), P: ang(p), S: ang(s), C: kids.reduce((a: number, k: any) => a + ang(k), 0) / kids.length, Cmin: Math.min(...kids.map(ang)), Cmax: Math.max(...kids.map(ang)) });
}
const rings = new Map<any, any[]>(); for (const r of rows) rings.set(r.d, [...(rings.get(r.d) ?? []), r]);
let PS = 0, SC = 0, PC = 0, overlapKids = 0, pairs = 0;
for (const list of rings.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const a = list[i], b = list[j]; pairs++;
  const sg = (x: number) => Math.sign(x);
  if (sg(a.P - b.P) !== sg(a.S - b.S)) PS++;
  if (sg(a.S - b.S) !== sg(a.C - b.C)) SC++;
  if (sg(a.P - b.P) !== sg(a.C - b.C)) PC++;
  if (a.Cmin < b.Cmax && b.Cmin < a.Cmax) overlapKids++;
}

console.log(key, JSON.stringify({ families: rows.length, partnerVsBox: PS, boxVsChildren: SC, partnerVsChildren_namesCause: PC, childrenFansInterleaved: overlapKids }));
// detail: which pairs, by ring
const det: string[] = [];
for (const [d, list] of rings) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const a = list[i], b = list[j];
  const inv = Math.sign(a.P - b.P) !== Math.sign(a.C - b.C), il = a.Cmin < b.Cmax && b.Cmin < a.Cmax;
  if (inv || il) det.push(`ring${d}:${inv ? "inv" : ""}${il ? "+interleave" : ""} P ${(a.P*57.3).toFixed(1)}/${(b.P*57.3).toFixed(1)} C ${(a.Cmin*57.3).toFixed(1)}-${(a.Cmax*57.3).toFixed(1)} vs ${(b.Cmin*57.3).toFixed(1)}-${(b.Cmax*57.3).toFixed(1)}`);
}
console.log(det.slice(0, 14).join("\n"));
