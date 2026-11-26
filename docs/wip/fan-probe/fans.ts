// For each family in the canopy: how its children are spread (fan angle seen from the parent),
// where they stand (ring = same distance per generation?), and the free space beyond them.
import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin;
const pol = (p: any) => { let a = Math.atan2(O.y - p.y, p.x - O.x); if (a < -Math.PI / 2) a += 2 * Math.PI; return { a: a * 57.3, r: Math.hypot(p.x - O.x, p.y - O.y) }; };
const crown = l.nodes.filter((n: any) => n.region === "crown" || n.depth !== undefined);
const byId = new Map<string, any>(); for (const n of l.nodes) byId.set(n.id, n);
// radius per generation
const gen = new Map<number, number[]>(); for (const n of l.nodes) if (n.depth !== undefined) gen.set(n.depth, [...(gen.get(n.depth) ?? []), pol(n).r]);
console.log("generation radii (min-max):", [...gen].sort((a, b) => a[0] - b[0]).map(([d, rs]) => `${d}:${Math.min(...rs).toFixed(0)}-${Math.max(...rs).toFixed(0)}`).join(" "));
console.log("layout mode:", JSON.stringify({ rings: l.rings ?? null, circleRings: l.circleRings ?? null, shape: l.shape ?? l.canopyShape ?? null }));
// free space: for a point, distance to nearest name box edge
const fs = l.nodes.reduce((a: number, n: any) => a + n.fontSize, 0) / l.nodes.length;
const free = (x: number, y: number) => Math.min(...l.nodes.map((n: any) => Math.max(Math.abs(n.x - x) - n.w / 2, Math.abs(n.y - y) - n.h / 2, 0)), ...l.spouses.map((n: any) => Math.max(Math.abs(n.x - x) - n.w / 2, Math.abs(n.y - y) - n.h / 2, 0)));
const fams = new Map<string, any[]>();
for (const e of l.edges) { const k = byId.get(e.childId); if (!k || k.depth === undefined) continue; let p = e.parentId; const s = l.spouses.find((x: any) => x.id === p); if (s) p = s.partnerId; fams.set(p, [...(fams.get(p) ?? []), k]); }
const rows: any[] = [];
for (const [pid, kids] of fams) {
  const p = byId.get(pid); if (!p || kids.length < 3) continue;
  const fromP = kids.map((k: any) => Math.atan2(p.y - k.y, k.x - p.x) * 57.3);
  const span = Math.max(...fromP) - Math.min(...fromP);
  const pp = pol(p);
  // empty room just beyond the family (outward along each child's ray, 3 name heights out)
  const room = kids.map((k: any) => { const q = pol(k); const rr = q.r + 3 * k.h; const a = q.a / 57.3; return free(O.x + Math.cos(a) * rr, O.y - Math.sin(a) * rr) / fs; });
  const lens = kids.map((k: any) => Math.hypot(k.x - p.x, k.y - p.y) / fs);
  rows.push({ name: p.member.name, at: pp.a.toFixed(0), kids: kids.length, fanDeg: span.toFixed(0), kidAngles: `${Math.min(...kids.map((k: any) => pol(k).a)).toFixed(0)}-${Math.max(...kids.map((k: any) => pol(k).a)).toFixed(0)}`, meanLine: (lens.reduce((a: number, b: number) => a + b, 0) / lens.length).toFixed(1), freeBeyond: (room.reduce((a: number, b: number) => a + b, 0) / room.length).toFixed(1) });
}
rows.sort((a, b) => Number(b.at) - Number(a.at));
for (const r of rows) console.log(JSON.stringify(r));
console.log("font units: name height ~", fs.toFixed(1));
