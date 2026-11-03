"use client";

// The fan, hourglass and bowtie charts (the Charts view): the same family
// engine and the same pedigree as the ancestors chart, drawn three other
// ways. A parent not recorded is an empty, dashed place, never a guess.
// Every name opens that person.

import { hierarchy, tree as d3tree } from "d3-hierarchy";
import type { PedigreeNode, DescendantNode } from "@/lib/family/reports";

const INK = "#2a1c0c", RULE = "#b08a2e", FAINT = "#e9dcbb", LINE = "#6b4423", PAPER = "#fbf7ee";
const FONT = "Amiri, 'Traditional Arabic', serif";

/** Ancestors in rings around the person: each ring a generation, each parent half of their child's arc. */
export function FanChart({ rows, rtl, onPick, notRecorded }: { rows: PedigreeNode[][]; rtl: boolean; onPick: (id: string) => void; notRecorded: string }) {
  const G = rows.length;
  const R0 = 70, RING = 92;
  const R = R0 + (G - 1) * RING;
  const W = 2 * R + 20, H = R + 40;
  const cx = W / 2, cy = R + 10;
  // the fan spans 180°, father's side on the reading side's start
  const at = (r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
  const arc = (r0: number, r1: number, a0: number, a1: number) => {
    const p0 = at(r1, a0), p1 = at(r1, a1), p2 = at(r0, a1), p3 = at(r0, a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p0.x} ${p0.y}A${r1} ${r1} 0 ${large} 0 ${p1.x} ${p1.y}L${p2.x} ${p2.y}A${r0} ${r0} 0 ${large} 1 ${p3.x} ${p3.y}Z`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" xmlns="http://www.w3.org/2000/svg" fontFamily={FONT} role="img">
      {rows.slice(1).map((row, gi) => {
        const g = gi + 1;
        const r0 = R0 + (g - 1) * RING, r1 = r0 + RING;
        const step = Math.PI / row.length;
        return row.map((n, i) => {
          // (left to right: father's line first in English, mother's first mirrored in Arabic)
          const k = rtl ? i : row.length - 1 - i;
          const a0 = k * step, a1 = (k + 1) * step, mid = (a0 + a1) / 2;
          const tp = at((r0 + r1) / 2, mid);
          const deg = 90 - (mid * 180) / Math.PI;
          const label = n.person ? n.person.name : notRecorded;
          const size = Math.max(9, Math.min(16, (r1 - r0) / Math.max(4, label.length) * 1.6, step * ((r0 + r1) / 2) * 0.55));
          return (
            <g key={`${g}-${i}`} onClick={n.person ? () => onPick(n.person!.id) : undefined} style={n.person ? { cursor: "pointer" } : undefined}>
              <path d={arc(r0, r1, a0, a1)} fill={n.person ? PAPER : "none"} stroke={n.person ? RULE : FAINT} strokeDasharray={n.person ? undefined : "4 3"} />
              <text x={tp.x} y={tp.y} transform={`rotate(${g >= 3 ? deg : 0} ${tp.x} ${tp.y})`} textAnchor="middle" dominantBaseline="middle"
                fontSize={n.person ? size : 9} fill={n.person ? INK : "#b9a27a"}>{label}</text>
            </g>
          );
        });
      })}
      <g onClick={rows[0][0].person ? () => onPick(rows[0][0].person!.id) : undefined} style={{ cursor: "pointer" }}>
        <path d={`M${cx - R0} ${cy}A${R0} ${R0} 0 0 1 ${cx + R0} ${cy}Z`} fill={PAPER} stroke={RULE} />
        <text x={cx} y={cy - R0 / 2.5} textAnchor="middle" fontSize={18} fill={INK}>{rows[0][0].person?.name}</text>
      </g>
    </svg>
  );
}

/** Ancestors above, descendants below, the person in the waist. */
export function HourglassChart({ rows, below, onPick, notRecorded }: { rows: PedigreeNode[][]; below: DescendantNode | null; onPick: (id: string) => void; notRecorded: string }) {
  const BW = 150, BH = 40, HG = 14, VG = 56;
  const G = rows.length;
  const topW = 2 ** (G - 1) * (BW + HG);
  const root = below ? hierarchy(below, (d) => d.children) : null;
  const leaves = root ? Math.max(1, root.leaves().length) : 1;
  const botW = leaves * (BW + HG);
  const W = Math.max(topW, botW, BW + HG);
  const depthDown = root ? root.height : 0;
  const H = (G - 1 + 1 + depthDown) * (BH + VG) + BH;
  const waistY = (G - 1) * (BH + VG);
  // ancestors: generation g sits (G-1-g) rows above the waist, spread evenly
  const anc = rows.flatMap((row, g) => row.map((n, i) => ({ n, g, x: (W / row.length) * (i + 0.5), y: waistY - g * (BH + VG) })));
  const laid = root ? d3tree<DescendantNode>().size([botW, depthDown * (BH + VG) || 1])(root) : null;
  const off = (W - botW) / 2;
  const box = (key: string, x: number, y: number, name: string | null, id?: string) => (
    <g key={key} onClick={id ? () => onPick(id) : undefined} style={id ? { cursor: "pointer" } : undefined}>
      <rect x={x - BW / 2} y={y} width={BW} height={BH} rx={6} fill={name ? PAPER : "none"} stroke={name ? RULE : FAINT} strokeDasharray={name ? undefined : "4 3"} />
      <text x={x} y={y + BH / 2 + 5} textAnchor="middle" fontSize={name ? 15 : 10} fill={name ? INK : "#b9a27a"}>{name ?? notRecorded}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" xmlns="http://www.w3.org/2000/svg" fontFamily={FONT} role="img">
      {anc.filter((a) => a.g > 0).map((a) => {
        const child = anc.find((c) => c.g === a.g - 1 && c.n.number === Math.floor(a.n.number / 2))!;
        return <path key={`la${a.n.number}`} d={`M${a.x} ${a.y + BH}V${a.y + BH + VG / 2}H${child.x}V${child.y}`} fill="none" stroke={a.n.person ? LINE : FAINT} strokeDasharray={a.n.person ? undefined : "3 3"} />;
      })}
      {laid?.links().map((l, i) => (
        <path key={`ld${i}`} d={`M${l.source.x + off} ${waistY + l.source.y + BH}V${waistY + l.source.y + BH + VG / 2}H${l.target.x + off}V${waistY + l.target.y}`} fill="none" stroke={LINE} />
      ))}
      {anc.filter((a) => a.g > 0).map((a) => box(`a${a.n.number}`, a.x, a.y, a.n.person?.name ?? null, a.n.person?.id))}
      {laid?.descendants().map((d) => box(`d${d.data.person.id}`, d.x + off, waistY + d.y, d.data.person.name, d.data.person.id))}
    </svg>
  );
}

/** The father's ancestors on one side, the mother's on the other, the person between. */
export function BowtieChart({ rows, rtl, onPick, notRecorded }: { rows: PedigreeNode[][]; rtl: boolean; onPick: (id: string) => void; notRecorded: string }) {
  const BW = 160, BH = 40, HG = 34, VG = 10;
  const G = rows.length;
  const half = (side: 0 | 1) => rows.slice(1).map((row) => row.slice(side * (row.length / 2), (side + 1) * (row.length / 2)));
  const sideRows = [half(0), half(1)]; // father's, mother's
  const tall = 2 ** Math.max(0, G - 2);
  const H = tall * (BH + VG) + VG;
  const W = 2 * (G - 1) * (BW + HG) + BW;
  const cx = W / 2;
  const items: { key: string; x: number; y: number; n: PedigreeNode; px: number; py: number }[] = [];
  sideRows.forEach((srows, s) => {
    // (the father's side on the reading side's start)
    const dirn = (s === 0) !== rtl ? -1 : 1;
    srows.forEach((row, gi) => {
      const span = H / row.length;
      row.forEach((n, i) => {
        const x = cx + dirn * (gi + 1) * (BW + HG);
        const y = i * span + span / 2;
        const px = gi === 0 ? cx : cx + dirn * gi * (BW + HG);
        const py = gi === 0 ? H / 2 : (Math.floor(i / 2) * (H / srows[gi - 1].length)) + H / srows[gi - 1].length / 2;
        items.push({ key: `${s}-${gi}-${i}`, x, y, n, px, py });
      });
    });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" xmlns="http://www.w3.org/2000/svg" fontFamily={FONT} role="img">
      {items.map((it) => <path key={`l${it.key}`} d={`M${it.px} ${it.py}C${(it.px + it.x) / 2} ${it.py} ${(it.px + it.x) / 2} ${it.y} ${it.x} ${it.y}`} fill="none" stroke={it.n.person ? LINE : FAINT} strokeDasharray={it.n.person ? undefined : "3 3"} />)}
      {items.map((it) => (
        <g key={it.key} onClick={it.n.person ? () => onPick(it.n.person!.id) : undefined} style={it.n.person ? { cursor: "pointer" } : undefined}>
          <rect x={it.x - BW / 2} y={it.y - BH / 2} width={BW} height={BH} rx={6} fill={it.n.person ? PAPER : "#ffffff"} stroke={it.n.person ? RULE : FAINT} strokeDasharray={it.n.person ? undefined : "4 3"} />
          <text x={it.x} y={it.y + 5} textAnchor="middle" fontSize={it.n.person ? 15 : 10} fill={it.n.person ? INK : "#b9a27a"}>{it.n.person?.name ?? notRecorded}</text>
        </g>
      ))}
      <g onClick={rows[0][0].person ? () => onPick(rows[0][0].person!.id) : undefined} style={{ cursor: "pointer" }}>
        <rect x={cx - BW / 2} y={H / 2 - BH / 2 - 4} width={BW} height={BH + 8} rx={8} fill={PAPER} stroke={RULE} strokeWidth={2} />
        <text x={cx} y={H / 2 + 6} textAnchor="middle" fontSize={17} fill={INK}>{rows[0][0].person?.name}</text>
      </g>
    </svg>
  );
}
