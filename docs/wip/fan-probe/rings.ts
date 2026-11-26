import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin, ang = (p: any) => { let a = Math.atan2(O.y - p.y, p.x - O.x); if (a < -Math.PI / 2) a += 2 * Math.PI; return a * 57.3; };
const g = new Map<string, any[]>();
for (const n of l.nodes) { const k = `${n.region}:${n.depth}`; g.set(k, [...(g.get(k) ?? []), n]); }
for (const [k, ns] of [...g].sort()) { const a = ns.map(ang); console.log(k, ns.length, `angles ${Math.min(...a).toFixed(0)}..${Math.max(...a).toFixed(0)} mean ${(a.reduce((x: number, y: number) => x + y, 0) / a.length).toFixed(0)}`); }
