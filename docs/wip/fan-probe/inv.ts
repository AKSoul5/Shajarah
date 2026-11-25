// Parent order vs children's order between consecutive rings (any inversion forces crossings for outward lines)
import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin, ang = (p: any) => { let a = Math.atan2(O.y - p.y, p.x - O.x); if (a < -Math.PI / 2) a += 2 * Math.PI; return a * 57.3; };
const byId = new Map<string, any>(); for (const n of l.nodes) byId.set(n.id, n);
const fam = new Map<string, any[]>(); for (const n of l.nodes) if (n.parentId && byId.get(n.parentId)?.depth !== undefined && n.depth !== undefined) fam.set(n.parentId, [...(fam.get(n.parentId) ?? []), n]);
const rows = [...fam].map(([pid, kids]) => { const p = byId.get(pid); return { name: p.member.name, d: p.depth, P: ang(p), lo: Math.min(...kids.map(ang)), hi: Math.max(...kids.map(ang)) }; });
for (const d of [...new Set(rows.map((r) => r.d))].sort()) {
  const rs = rows.filter((r) => r.d === d).sort((a, b) => b.P - a.P);
  const bad: string[] = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (!(rs[i].lo >= rs[j].hi - 0.01)) bad.push(`${rs[i].name}@${rs[i].P.toFixed(0)}[${rs[i].lo.toFixed(0)}-${rs[i].hi.toFixed(0)}] vs ${rs[j].name}@${rs[j].P.toFixed(0)}[${rs[j].lo.toFixed(0)}-${rs[j].hi.toFixed(0)}]`);
  console.log(`ring ${d}: ${rs.length} parents, ${bad.length} out-of-order pairs`, bad.slice(0, 4).join(" | "));
}
