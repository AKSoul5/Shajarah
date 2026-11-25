import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin, deg = (p: any) => { let a = Math.atan2(O.y - p.y, p.x - O.x); if (a < -Math.PI / 2) a += 2 * Math.PI; return +(a * 57.3).toFixed(1); };
const byId = new Map<string, any>(); for (const n of l.nodes) byId.set(n.id, n);
const through: string[] = l.familiesThrough ?? c.tree.settings.familiesThrough ?? [];
for (const d of through) {
  const n = byId.get(d); if (!n) { console.log("not drawn", d); continue; }
  const kids = l.nodes.filter((k: any) => k.parentId === d || k.member?.motherId === d);
  const box = l.spouses.find((s: any) => s.partnerId === d);
  console.log(n.member.name, "depth", n.depth, "at", deg(n), "| box", box ? deg(box) : "-", "| children", kids.length, kids.length ? `${Math.min(...kids.map(deg))}..${Math.max(...kids.map(deg))}` : "", "parentIds", [...new Set(kids.map((k: any) => k.parentId === d ? "daughter" : "other"))].join(","));
}
