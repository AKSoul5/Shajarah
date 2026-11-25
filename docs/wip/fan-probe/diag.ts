// Classifies each remaining problem: is it forced by where the names stand
// (for lines that grow outward from the centre, two lines whose ends are in
// opposite orders round the canopy must cross), or only by how it is drawn?
import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
const { key, recipe } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const c = makeCase(key);
const l: any = replayLayout(c.tree, recipe);
const O = l.origin;
const pos = new Map<string, { x: number; y: number; kind: string }>();
for (const n of l.nodes) pos.set(n.member.id, { x: n.x, y: n.y, kind: "name" });
for (const n of l.nodes) pos.set(n.id, { x: n.x, y: n.y, kind: "name" });
for (const s of l.spouses) pos.set(s.id, { x: s.x, y: s.y, kind: "spouse" });
const through = new Set<string>(l.familiesThrough ?? []);
const polar = (p: any) => { const a = Math.atan2(O.y - p.y, p.x - O.x); return { r: Math.hypot(p.x - O.x, p.y - O.y), a: a < -Math.PI / 2 ? a + 2 * Math.PI : a }; };
const end = (e: any, which: 0 | 1) => { const id = which ? e.childId : e.parentId; const p = pos.get(id); if (p) return polar(p); const q = e.points[which ? e.points.length - 1 : 0]; return polar(q); };
const byKey = new Map<string, any>(); for (const e of l.edges) byKey.set(`${e.parentId}>${e.childId}`, e);
const daughterOf = new Map<string, string>();
// which shown-through daughter's family a line belongs to (walk up parents)
const parentOf = new Map<string, string>(); for (const e of l.edges) parentOf.set(e.childId, e.parentId);
const famOf = (id: string) => { let cur: string | undefined = id; for (let k = 0; cur && k < 20; k++) { if (through.has(cur)) return "daughter"; if (cur.startsWith("spouse:")) { const s = l.spouses.find((x: any) => x.id === cur); if (s && through.has(s.partnerId)) return "daughter"; } cur = parentOf.get(cur); } return "line"; };
const rows: any[] = [];
for (const i of l.clarity.issues) {
  const row: any = { kind: i.kind, detail: i.detail ?? "" };
  const e = i.edge && byKey.get(i.edge.join(">"));
  const o = Array.isArray(i.other) ? byKey.get(i.other.join(">")) : null;
  row.fam = [i.edge?.[1], Array.isArray(i.other) ? i.other[1] : i.other].filter(Boolean).map((id: any) => famOf(id)).join("+");
  row.spouseLine = [i.edge, i.other].some((x: any) => Array.isArray(x) && x.some((id: string) => id.startsWith("spouse:"))) ? "spouse-box" : "";
  if (e && o && (i.kind === "crossing" || i.kind === "merge")) {
    const [a0, a1, b0, b1] = [end(e, 0), end(e, 1), end(o, 0), end(o, 1)];
    const lo = Math.max(Math.min(a0.r, a1.r), Math.min(b0.r, b1.r)), hi = Math.min(Math.max(a0.r, a1.r), Math.max(b0.r, b1.r));
    // angle of each line at radius r, if it grew straight out in polar terms
    const at = (p: any, q: any, r: number) => { const t = (r - p.r) / ((q.r - p.r) || 1); return p.a + (q.a - p.a) * Math.min(1, Math.max(0, t)); };
    const d0 = at(a0, a1, lo) - at(b0, b1, lo), d1 = at(a0, a1, hi) - at(b0, b1, hi);
    const tol = 0.05 * Math.max(a1.r, b1.r);
    const sameRings = Math.abs(Math.min(a0.r, a1.r) - Math.min(b0.r, b1.r)) < tol && Math.abs(Math.max(a0.r, a1.r) - Math.max(b0.r, b1.r)) < tol;
    const inverted = hi > lo && Math.sign(d0) !== Math.sign(d1);
    row.forced = hi <= lo ? "no-overlap" : !inverted ? "order-kept" : sameRings ? "FORCED" : "detour";
    // how far round (degrees) a line would have to swing to pass the other's end on the right side
    const typ = (x: any) => x.childId.startsWith("spouse:") ? "partner>box" : x.parentId.startsWith("spouse:") ? "box>child" : "parent>child";
    row.types = [typ(e), typ(o)].sort().join("+");
    row.swing = +(Math.min(Math.abs(d0), Math.abs(d1)) * 180 / Math.PI).toFixed(2);
    row.inwardSpan = +(Math.min(Math.abs(d0), Math.abs(d1)) * 180 / Math.PI).toFixed(1);
  }
  rows.push(row);
}
const tally: Record<string, number> = {};
const swings = rows.filter((r) => r.forced === "detour").map((r) => r.swing).sort((a, b) => a - b);
console.log("  detour swings (deg):", swings.join(" "));
for (const r of rows) { const k = `${r.kind}:${r.detail.split(" ")[0]}|${r.forced ?? "-"}|${r.fam}|${r.types ?? ""}`; tally[k] = (tally[k] ?? 0) + 1; }
console.log(key, "problems", rows.length);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log("  ", v, k);
