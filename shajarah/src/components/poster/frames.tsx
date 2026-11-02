// The designs' own frames and title treatments, drawn as vectors in each
// palette (the gold-foil artwork is Imperial Gold's alone). They stay in the
// margin the layout already keeps for a frame, so no name moves.

import type { ReactNode } from "react";
import type { PosterPalette } from "@/lib/theme";

const f = (n: number) => n.toFixed(1);

type Pal = PosterPalette & { line: string };
type FrameKind = PosterPalette["frame"];

/** An eight-pointed star (two squares), centred on x, y. */
export const starPath = (x: number, y: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    pts.push(`${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))}`);
  }
  return `M${pts.join("L")}Z`;
};

/** A leaf along direction `deg` from x, y (its stalk end at x, y). */
const leafAt = (x: number, y: number, len: number, deg: number) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const w = len * 0.38;
  const tip = [x + c * len, y + s * len];
  const m = [x + c * len * 0.5, y + s * len * 0.5];
  return `M${f(x)} ${f(y)}Q${f(m[0] - s * w)} ${f(m[1] + c * w)} ${f(tip[0])} ${f(tip[1])}Q${f(m[0] + s * w)} ${f(m[1] - c * w)} ${f(x)} ${f(y)}Z`;
};

const diamond = (x: number, y: number, r: number) => `M${f(x)} ${f(y - r)}L${f(x + r * 0.75)} ${f(y)}L${f(x)} ${f(y + r)}L${f(x - r * 0.75)} ${f(y)}Z`;

/** Points along the band of a frame inset `o` (sides of W×H), every `step`, clear of the corners by `skip`. */
function along(W: number, H: number, o: number, step: number, skip: number) {
  const out: { x: number; y: number; vertical: boolean }[] = [];
  const run = (a: number, b: number, at: (t: number) => { x: number; y: number }, vertical: boolean) => {
    const n = Math.max(1, Math.floor((b - a) / step));
    const s = (b - a) / n;
    for (let i = 0; i <= n; i++) out.push({ ...at(a + i * s), vertical });
  };
  run(o + skip, W - o - skip, (t) => ({ x: t, y: o }), false);
  run(o + skip, W - o - skip, (t) => ({ x: t, y: H - o }), false);
  run(o + skip, H - o - skip, (t) => ({ x: o, y: t }), true);
  run(o + skip, H - o - skip, (t) => ({ x: W - o, y: t }), true);
  return out;
}

const corners = (W: number, H: number, o: number) => [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]] as const;

/** Refined Heritage: a fine double antique-gold rule, quarter-arc flourishes in the corners. */
function RuleFrame({ W, H, pal }: { W: number; H: number; pal: Pal }) {
  const a = W * 0.025, b = W * 0.033, r1 = W * 0.018, r2 = W * 0.026;
  return (
    <g fill="none" stroke={pal.line}>
      <rect x={a} y={a} width={W - 2 * a} height={H - 2 * a} strokeWidth={W * 0.0022} />
      <rect x={b} y={b} width={W - 2 * b} height={H - 2 * b} strokeWidth={W * 0.0008} />
      {corners(W, H, b).map(([x, y, sx, sy]) => (
        <g key={`${x},${y}`} strokeWidth={W * 0.0008}>
          <path d={`M${f(x + sx * r1)} ${f(y)}A${f(r1)} ${f(r1)} 0 0 ${sx * sy > 0 ? 1 : 0} ${f(x)} ${f(y + sy * r1)}`} />
          <path d={`M${f(x + sx * r2)} ${f(y)}A${f(r2)} ${f(r2)} 0 0 ${sx * sy > 0 ? 1 : 0} ${f(x)} ${f(y + sy * r2)}`} />
          <circle cx={x + sx * r1 * 0.42} cy={y + sy * r1 * 0.42} r={W * 0.0022} fill={pal.line} stroke="none" />
        </g>
      ))}
    </g>
  );
}

/** Modern Archive: one precise hairline. */
function HairlineFrame({ W, H, pal }: { W: number; H: number; pal: Pal }) {
  const a = W * 0.03;
  return <rect x={a} y={a} width={W - 2 * a} height={H - 2 * a} fill="none" stroke={pal.line} strokeWidth={W * 0.0009} />;
}

/** Ancestral Manuscript: a border band of lozenges between brass rules, eight-pointed stars in corner squares. */
function ManuscriptFrame({ W, H, pal }: { W: number; H: number; pal: Pal }) {
  const o = W * 0.03, band = W * 0.03, i = o + band, c = o + band / 2;
  const step = band * 1.15;
  const pts = along(W, H, c, step, band * 1.1);
  return (
    <g>
      <path d={`M${f(o)} ${f(o)}H${f(W - o)}V${f(H - o)}H${f(o)}ZM${f(i)} ${f(i)}V${f(H - i)}H${f(W - i)}V${f(i)}Z`} fill={pal.ivory} fillOpacity={0.5} />
      <g fill="none" stroke={pal.rule}>
        <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} strokeWidth={W * 0.0026} />
        <rect x={i} y={i} width={W - 2 * i} height={H - 2 * i} strokeWidth={W * 0.0013} />
        <rect x={i + W * 0.006} y={i + W * 0.006} width={W - 2 * (i + W * 0.006)} height={H - 2 * (i + W * 0.006)} strokeWidth={W * 0.0005} stroke={pal.inkSoft} strokeOpacity={0.6} />
      </g>
      <g fill={pal.rule}>
        {pts.map((p, k) => (k % 2 === 0
          ? <path key={k} d={diamond(p.x, p.y, band * 0.3)} />
          : <circle key={k} cx={p.x} cy={p.y} r={band * 0.07} />))}
      </g>
      {corners(W, H, c).map(([x, y]) => (
        <g key={`${x},${y}`}>
          <rect x={x - band / 2} y={y - band / 2} width={band} height={band} fill={pal.ivory} stroke={pal.rule} strokeWidth={W * 0.0013} />
          <path d={starPath(x, y, band * 0.36)} fill="none" stroke={pal.rule} strokeWidth={W * 0.0011} />
          <circle cx={x} cy={y} r={band * 0.08} fill={pal.rule} />
        </g>
      ))}
    </g>
  );
}

/** Platinum: one crisp brushed-steel rule, a fine inner line, small stepped squares at the corners. */
function MetalFrame({ W, H, pal }: { W: number; H: number; pal: Pal }) {
  const o = W * 0.04, s = W * 0.014;
  return (
    <g>
      <defs>
        <linearGradient id="sh-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={pal.rule} />
          <stop offset="0.5" stopColor="#9aa2ac" />
          <stop offset="1" stopColor={pal.rule} />
        </linearGradient>
      </defs>
      <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} fill="none" stroke="url(#sh-steel)" strokeWidth={W * 0.0032} />
      <rect x={o + W * 0.011} y={o + W * 0.011} width={W - 2 * (o + W * 0.011)} height={H - 2 * (o + W * 0.011)} fill="none" stroke={pal.rule} strokeWidth={W * 0.0006} />
      {corners(W, H, o).map(([x, y]) => (
        <g key={`${x},${y}`}>
          <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={pal.paper} stroke={pal.rule} strokeWidth={W * 0.0016} />
          <rect x={x - s * 0.2} y={y - s * 0.2} width={s * 0.4} height={s * 0.4} fill={pal.ornament} />
        </g>
      ))}
    </g>
  );
}

/** Botanical Classic: fine gold rules with leafy sprigs growing from the corners, a rosebud at each. */
function BotanicalFrame({ W, H, pal, leaf }: { W: number; H: number; pal: Pal; leaf: string }) {
  const o = W * 0.035, d = W * 0.021, L = W * 0.13, lf = W * 0.019;
  const sprig = (x: number, y: number, sx: number, sy: number) => {
    // a stem along each edge from the corner, leaves alternating either side
    const leaves: string[] = [];
    for (const horizontal of [true, false]) {
      for (let k = 1; k <= 4; k++) {
        const t = (k / 4.6) * L;
        const px = horizontal ? x + sx * (d + t) : x + sx * d;
        const py = horizontal ? y + sy * d : y + sy * (d + t);
        const out = horizontal ? (sx > 0 ? 0 : 180) : (sy > 0 ? 90 : 270);
        const side = (k % 2 === 0 ? 1 : -1) * 38 * (horizontal ? sy : -sx) * sx * sy;
        leaves.push(leafAt(px, py, lf * (1 - k * 0.1), out + side));
      }
    }
    const stem = `M${f(x + sx * (d + L))} ${f(y + sy * d)}H${f(x + sx * d)}V${f(y + sy * (d + L))}`;
    return { leaves, stem };
  };
  return (
    <g>
      <g fill="none" stroke={pal.rule}>
        <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} strokeWidth={W * 0.0016} />
        <rect x={o + W * 0.008} y={o + W * 0.008} width={W - 2 * (o + W * 0.008)} height={H - 2 * (o + W * 0.008)} strokeWidth={W * 0.0006} />
      </g>
      {corners(W, H, o).map(([x, y, sx, sy]) => {
        const { leaves, stem } = sprig(x, y, sx, sy);
        return (
          <g key={`${x},${y}`}>
            <path d={stem} fill="none" stroke={pal.rule} strokeWidth={W * 0.0009} strokeLinecap="round" />
            <g fill={leaf} fillOpacity={0.88}>{leaves.map((p, k) => <path key={k} d={p} />)}</g>
            <circle cx={x + sx * d} cy={y + sy * d} r={W * 0.0055} fill={pal.spouseFill} stroke={pal.spouseRim} strokeWidth={W * 0.0012} />
          </g>
        );
      })}
    </g>
  );
}

/** Emerald Dynasty: a deep emerald band between brass rules, brass stars on emerald roundels at the corners. */
function RegalFrame({ W, H, pal, band: bandColour }: { W: number; H: number; pal: Pal; band: string }) {
  const o = W * 0.03, b = o + W * 0.012, r = W * 0.022;
  const mids: [number, number][] = [[W / 2, b], [W / 2, H - b], [b, H / 2], [W - b, H / 2]];
  return (
    <g>
      <g fill="none">
        <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} stroke={pal.rule} strokeWidth={W * 0.0012} />
        <rect x={b} y={b} width={W - 2 * b} height={H - 2 * b} stroke={bandColour} strokeWidth={W * 0.0095} />
        <rect x={b + W * 0.011} y={b + W * 0.011} width={W - 2 * (b + W * 0.011)} height={H - 2 * (b + W * 0.011)} stroke={pal.rule} strokeWidth={W * 0.0016} />
      </g>
      {mids.map(([x, y]) => <path key={`${x},${y}`} d={diamond(x, y, W * 0.011)} fill={pal.thread} stroke={pal.rule} strokeWidth={W * 0.0008} />)}
      {corners(W, H, b).map(([x, y]) => (
        <g key={`${x},${y}`}>
          <circle cx={x} cy={y} r={r} fill={bandColour} stroke={pal.rule} strokeWidth={W * 0.0016} />
          <path d={starPath(x, y, r * 0.72)} fill={pal.thread} />
          <circle cx={x} cy={y} r={r * 0.16} fill={bandColour} />
        </g>
      ))}
    </g>
  );
}

/**
 * The frame of a design: its own when the poster's frame is on (the
 * gold-foil artwork is drawn by the poster itself), a fine rule otherwise.
 */
export function DesignFrame({ W, H, pal, kind, accent }: { W: number; H: number; pal: Pal; kind: FrameKind; accent: string }) {
  switch (kind) {
    case "hairline": return <HairlineFrame W={W} H={H} pal={pal} />;
    case "manuscript": return <ManuscriptFrame W={W} H={H} pal={pal} />;
    case "metal": return <MetalFrame W={W} H={H} pal={pal} />;
    case "botanical": return <BotanicalFrame W={W} H={H} pal={pal} leaf={accent} />;
    case "regal": return <RegalFrame W={W} H={H} pal={pal} band={pal.titleLo} />;
    default: return <RuleFrame W={W} H={H} pal={pal} />;
  }
}

/** The rule under the title, in the design's manner. */
export function TitleRule({ x, y, w, pal, accent }: { x: number; y: number; w: number; pal: Pal; accent: string }): ReactNode {
  const d = w * 0.02;
  const ends = (gap: number) => `M${f(x - w / 2)} ${f(y)}H${f(x - gap)}M${f(x + gap)} ${f(y)}H${f(x + w / 2)}`;
  switch (pal.titleStyle) {
    case "hairline":
      return <path d={`M${f(x - w * 0.35)} ${f(y)}H${f(x + w * 0.35)}`} stroke={pal.line} strokeWidth={w * 0.0025} />;
    case "steel":
      return (
        <g>
          <path d={ends(d * 1.6)} stroke={pal.line} strokeWidth={w * 0.0035} />
          <rect x={x - d * 0.7} y={y - d * 0.7} width={d * 1.4} height={d * 1.4} fill={pal.ornament} />
        </g>
      );
    case "sprig":
      return (
        <g>
          <path d={ends(d * 3.2)} stroke={pal.line} strokeWidth={w * 0.004} />
          <g fill={accent}>
            <path d={leafAt(x - d * 0.2, y, d * 2.6, 200)} />
            <path d={leafAt(x + d * 0.2, y, d * 2.6, -20)} />
            <path d={leafAt(x, y + d * 0.1, d * 2.2, -90)} />
          </g>
          <circle cx={x} cy={y} r={d * 0.45} fill={pal.spouseFill} stroke={pal.spouseRim} strokeWidth={w * 0.0025} />
        </g>
      );
    case "star":
      return (
        <g>
          <path d={ends(d * 2.4)} stroke={pal.line} strokeWidth={w * 0.004} />
          <path d={starPath(x, y, d * 1.6)} fill={pal.thread} stroke={pal.rule} strokeWidth={w * 0.002} />
        </g>
      );
    default:
      return (
        <g stroke={pal.line} fill="none" strokeWidth={w * 0.004}>
          <path d={ends(d * 2.2)} />
          <path d={`M${f(x)} ${f(y - d)}L${f(x + d * 1.6)} ${f(y)}L${f(x)} ${f(y + d)}L${f(x - d * 1.6)} ${f(y)}Z`} fill={pal.line} />
        </g>
      );
  }
}

/**
 * The ground behind the title, for the designs that set it apart: Imperial
 * Gold's cartouche, Ancestral Manuscript's panel. Centred on the title's
 * glyphs (cy) and as wide as the title (tw) and its type (fs) need.
 */
export function TitleGround({ cx, cy, tw, fs, W, pal, maxW }: { cx: number; cy: number; tw: number; fs: number; W: number; pal: Pal; maxW: number }): ReactNode {
  if (pal.titleStyle === "cartouche") {
    const w = Math.min(tw + fs * 2.6, maxW), h = fs * 1.9, tip = fs * 0.9;
    const p = (ww: number, hh: number, t: number) => {
      const x = ww / 2, y = hh / 2, b = x - t;
      return `M${f(cx - x)} ${f(cy)}Q${f(cx - x + t * 0.3)} ${f(cy - y)} ${f(cx - b)} ${f(cy - y)}H${f(cx + b)}Q${f(cx + x - t * 0.3)} ${f(cy - y)} ${f(cx + x)} ${f(cy)}`
        + `Q${f(cx + x - t * 0.3)} ${f(cy + y)} ${f(cx + b)} ${f(cy + y)}H${f(cx - b)}Q${f(cx - x + t * 0.3)} ${f(cy + y)} ${f(cx - x)} ${f(cy)}Z`;
    };
    return (
      <g>
        <path d={p(w, h, tip)} fill={pal.ivory} fillOpacity={0.92} stroke={pal.ornament} strokeWidth={W * 0.0016} />
        <path d={p(w - fs * 0.35, h - fs * 0.25, tip * 0.85)} fill="none" stroke={pal.ornament} strokeWidth={W * 0.0006} />
        <path d={diamond(cx - w / 2 + tip * 0.45, cy, fs * 0.12) + diamond(cx + w / 2 - tip * 0.45, cy, fs * 0.12)} fill={pal.ornament} />
      </g>
    );
  }
  if (pal.titleStyle === "panel") {
    const w = Math.min(tw + fs * 1.8, maxW), h = fs * 1.9, c = fs * 0.3;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    const cut = (i: number) => `M${f(x0 + c + i)} ${f(y0 + i)}H${f(x1 - c - i)}L${f(x1 - i)} ${f(y0 + c + i)}V${f(y1 - c - i)}L${f(x1 - c - i)} ${f(y1 - i)}H${f(x0 + c + i)}L${f(x0 + i)} ${f(y1 - c - i)}V${f(y0 + c + i)}Z`;
    return (
      <g>
        <path d={cut(0)} fill={pal.ivory} fillOpacity={0.75} stroke={pal.rule} strokeWidth={W * 0.0016} />
        <path d={cut(fs * 0.12)} fill="none" stroke={pal.rule} strokeWidth={W * 0.0006} />
      </g>
    );
  }
  return null;
}
