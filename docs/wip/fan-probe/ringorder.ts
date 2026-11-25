import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin, ang = (p: any) => { const a = Math.atan2(O.y - p.y, p.x - O.x); return a < -Math.PI / 2 ? a + 2 * Math.PI : a; };
const pid = new Map<string, string>(); for (const e of l.edges) pid.set(e.childId, e.parentId);
const fatherOf = (id: string) => { let p = pid.get(id)!; if (p?.startsWith("spouse:")) { const s = l.spouses.find((x: any) => x.id === p); p = s?.partnerId; } return p; };
const depths = new Map<number, any[]>(); for (const n of l.nodes) if (n.depth !== undefined) depths.set(n.depth, [...(depths.get(n.depth) ?? []), n]);
for (const [d, ring] of [...depths].sort((a, b) => a[0] - b[0])) {
  ring.sort((a: any, b: any) => ang(b) - ang(a));
  const seq = ring.map((n: any) => fatherOf(n.id));
  let breaks = 0; const seen = new Set<string>();
  for (let i = 0; i < seq.length; i++) { if (i && seq[i] !== seq[i - 1]) { if (seen.has(seq[i])) breaks++; } seen.add(seq[i - 1] ?? ""); }
  const radii = ring.map((n: any) => Math.hypot(n.x - O.x, n.y - O.y));
  console.log(`depth ${d}: ${ring.length} names, families split ${breaks}, radius ${Math.min(...radii).toFixed(0)}-${Math.max(...radii).toFixed(0)}`);
}
