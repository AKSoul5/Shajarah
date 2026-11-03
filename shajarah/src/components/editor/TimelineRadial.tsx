"use client";

// The family timeline (dated events, by decade) and the radial tree (the
// person's descendants in rings around them), from the family engine.

import { cluster, hierarchy } from "d3-hierarchy";
import type { DescendantNode, TimelineEvent } from "@/lib/family/reports";
import type { MemberDTO } from "@/lib/types";

const INK = "#2a1c0c", RULE = "#b08a2e", LINE = "#6b4423", PAPER = "#fbf7ee";

export function Timeline({ events, onPick, label }: {
  events: TimelineEvent[];
  onPick: (id: string) => void;
  label: (e: TimelineEvent) => string;
}) {
  const decades = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    const d = Math.floor(e.year / 10) * 10;
    (decades.get(d) ?? decades.set(d, []).get(d)!).push(e);
  }
  const Name = ({ m }: { m: MemberDTO }) => (
    <button type="button" className="font-naskh text-[15px] hover:underline" dir="auto" onClick={() => onPick(m.id)}>{m.name}</button>
  );
  return (
    <ol className="relative space-y-5 border-s-2 border-parchment-300 ps-5">
      {[...decades].map(([decade, list]) => (
        <li key={decade}>
          <span className="absolute -start-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-parchment-50 bg-bark-500" />
          <h3 className="mb-1 text-sm font-semibold tabular-nums text-bark-700">{decade}s</h3>
          <ul className="space-y-0.5 text-sm">
            {list.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-10 shrink-0 tabular-nums text-bark-400">{e.year}</span>
                <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-bark-500">{label(e)}</span>
                <span>{e.people.map((p, k) => <span key={p.id}>{k > 0 && " & "}<Name m={p} /></span>)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** The person's descendants in rings around them (each generation a ring). */
export function RadialTree({ root: data, onPick }: { root: DescendantNode | null; onPick: (id: string) => void }) {
  if (!data) return null;
  const root = hierarchy(data, (d) => d.children);
  const depth = Math.max(1, root.height);
  const R = 130 * depth + 60;
  const laid = cluster<DescendantNode>().size([2 * Math.PI, R - 60]).separation((a, b) => (a.parent === b.parent ? 1 : 1.6))(root);
  const pt = (a: number, r: number) => ({ x: r * Math.sin(a), y: -r * Math.cos(a) });
  const S = 2 * R + 120;
  return (
    <svg viewBox={`${-S / 2} ${-S / 2} ${S} ${S}`} className="mx-auto h-auto w-full max-w-4xl" xmlns="http://www.w3.org/2000/svg" fontFamily="Amiri, 'Traditional Arabic', serif" role="img">
      {laid.links().map((l, i) => {
        const s = pt(l.source.x, l.source.y), t = pt(l.target.x, l.target.y);
        const m = pt(l.target.x, (l.source.y + l.target.y) / 2);
        return <path key={i} d={`M${s.x} ${s.y}Q${m.x} ${m.y} ${t.x} ${t.y}`} fill="none" stroke={LINE} strokeWidth={1.1} />;
      })}
      {laid.descendants().map((d) => {
        const p = pt(d.x, d.y);
        const deg = (d.x * 180) / Math.PI - 90;
        const flip = d.x > Math.PI;
        if (d.depth === 0) {
          return (
            <g key={d.data.person.id} onClick={() => onPick(d.data.person.id)} style={{ cursor: "pointer" }}>
              <circle r={40} fill={PAPER} stroke={RULE} strokeWidth={2} />
              <text textAnchor="middle" dy={6} fontSize={17} fill={INK}>{d.data.person.name}</text>
            </g>
          );
        }
        return (
          <g key={d.data.person.id} transform={`translate(${p.x} ${p.y}) rotate(${flip ? deg + 180 : deg})`} onClick={() => onPick(d.data.person.id)} style={{ cursor: "pointer" }}>
            <circle r={3} fill={RULE} transform={`rotate(${flip ? -(deg + 180) : -deg})`} />
            <text x={flip ? -7 : 7} dy={5} textAnchor={flip ? "end" : "start"} fontSize={14} fill={INK} stroke="#ffffff" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{d.data.person.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
