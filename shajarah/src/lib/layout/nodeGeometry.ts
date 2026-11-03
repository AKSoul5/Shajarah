// The geometry of a name on the poster, shared by the layout, the renderer
// and the layout QA, so the three agree on where a name's shape is.
//
// A node is laid out as a box (PosterNode.w × h, centred on x, y). What is
// drawn may reach past that box: the outline's stroke, and, around a parent,
// the second gold ring ("has descendants"). This module says by how much
// (`decorOutset`), gives each shape's outline (`outlinePath` for the
// renderer, `outlinePoints` for geometry), and the drawn extent of a node on
// the page (`drawnOutline`) for collision checks.
//
// Connections run to a node's centre and are drawn under it, so a shape's
// own body covers a line's end: shapes are kept convex enough that no line
// shows through them.

export type Vec = { x: number; y: number };

/** The designs drawn from one outline (DESIGNS below): the node designs added to the original four. */
export type DesignShape = "rect" | "cartouche" | "octagon" | "shield" | "hexagon" | "cameo" | "scallop";

/** The shapes a person's name may take on the poster. */
export type PosterShape = "medallion" | "pill" | "leaf" | "circle" | "oval" | DesignShape;

/** A person's stroke width, in units of their font size (see TreePoster's PersonNode). */
export const NODE_STROKE = 0.06;
/** The gap between a parent's outline and their gold ring, and the ring's stroke, in font sizes. */
export const RING_GAP = 0.16;
export const RING_STROKE = NODE_STROKE * 1.1;
/**
 * The least room between two names' drawn shapes (rings and strokes
 * included), in font sizes: each name keeps half of it clear around itself,
 * so names converging on one branch never sit edge to edge.
 */
export const CLEARANCE = 0.1;
/** A medallion's outline stroke (the coloured rim), in font sizes. */
export const MEDALLION_STROKE = 0.12;

/** The leaf's outline: a blade along x, `L` long and `w` wide, centred on 0, 0. */
export function leafPath(L: number, w: number): string {
  const f = (n: number) => n.toFixed(2);
  return `M${f(-L / 2)} 0C${f(-L * 0.22)} ${f(-w * 0.78)} ${f(L * 0.28)} ${f(-w * 0.62)} ${f(L / 2)} 0`
    + `C${f(L * 0.28)} ${f(w * 0.62)} ${f(-L * 0.22)} ${f(w * 0.78)} ${f(-L / 2)} 0Z`;
}

const cubic = (p0: Vec, c1: Vec, c2: Vec, p1: Vec, t: number): Vec => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
};

/** The leaf's outline as points (the same curves as leafPath). */
function leafPoints(L: number, w: number, n = 16): Vec[] {
  const a = { x: -L / 2, y: 0 }, b = { x: L / 2, y: 0 };
  const top = [{ x: -L * 0.22, y: -w * 0.78 }, { x: L * 0.28, y: -w * 0.62 }];
  const bottom = [{ x: L * 0.28, y: w * 0.62 }, { x: -L * 0.22, y: w * 0.78 }];
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) pts.push(cubic(a, top[0], top[1], b, i / n));
  for (let i = 0; i < n; i++) pts.push(cubic(b, bottom[0], bottom[1], a, i / n));
  return pts;
}

/** An ellipse's outline as points. */
function ellipsePoints(rx: number, ry: number, n = 32): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return { x: rx * Math.cos(t), y: ry * Math.sin(t) };
  });
}

/** A rounded rectangle's outline (corner radius r) as points. */
function roundRectPoints(w: number, h: number, r: number, n = 6): Vec[] {
  const x = w / 2, y = h / 2;
  r = Math.max(0, Math.min(r, x, y));
  const corners: [number, number, number][] = [[x - r, y - r, 0], [-x + r, y - r, 90], [-x + r, -y + r, 180], [x - r, -y + r, 270]];
  const pts: Vec[] = [];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return pts;
}

// ── The designs drawn from an outline ────────────────────────────────────
//
// Each is defined once, as the points of its outline for a box w × h at font
// size fs; the renderer draws those points (designPath), the layout sizes
// the box (designSize) and the QA measures the same points, so all three
// agree. A parent's ring and the design's inner rim are the same outline,
// grown or shrunk. Sizes are in font sizes: `padX` is the room beside the
// text on each side together (the text never reaches the outline), `height`
// the box's height for one line of text, `textDy` how far the name sits
// below (+) or above (−) the centre.

export interface DesignSpec {
  padX: number;
  /** More room beside the text for each unit of the box's height (pointed or cut ends deepen as the box grows). */
  padH?: number;
  /**
   * An elliptical design: the box is made wide enough for the text block's
   * corners to fall inside the ellipse shrunk by this inset (font sizes),
   * which a fixed margin cannot promise for long names with a second line.
   */
  ellipseInset?: number;
  height: number;
  textDy: number;
  /** The outline, clockwise from the top left, centred on 0, 0. */
  points: (w: number, h: number, fs: number) => Vec[];
  /** Ornament drawn inside the outline (never past it), as a path, or null. */
  ornament?: (w: number, h: number, fs: number) => string | null;
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 5): Vec[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

export const DESIGNS: Record<DesignShape, DesignSpec> = {
  // A soft rectangle: an editorial plaque, gently rounded corners.
  rect: {
    padX: 1.1, height: 1.55, textDy: 0,
    points: (w, h, fs) => roundRectPoints(w, h, Math.min(fs * 0.3, h * 0.3)).reverse(),
  },
  // A classic cartouche: a plaque with its corners cut in as quarter circles.
  cartouche: {
    padX: 1.5, height: 1.8, textDy: 0,
    points: (w, h, fs) => {
      const x = w / 2, y = h / 2, r = Math.min(fs * 0.38, h * 0.24);
      return [
        ...arc(-x, -y, r, 90, 0), ...arc(x, -y, r, 180, 90),
        ...arc(x, y, r, 270, 180), ...arc(-x, y, r, 0, -90),
      ];
    },
  },
  // An octagonal seal: a plaque with its corners cut square.
  octagon: {
    padX: 1.5, height: 2.0, textDy: 0,
    points: (w, h, fs) => {
      // (the corners cut the same at any height: a second line does not deepen them)
      const x = w / 2, y = h / 2, c = Math.min(fs * 0.6, h * 0.3, w * 0.25);
      return [{ x: -x + c, y: -y }, { x: x - c, y: -y }, { x, y: -y + c }, { x, y: y - c }, { x: x - c, y }, { x: -x + c, y }, { x: -x, y: y - c }, { x: -x, y: -y + c }];
    },
  },
  // A heraldic shield: a flat chief, straight sides, drawn to a point below.
  shield: {
    padX: 1.3, height: 2.4, textDy: -0.22,
    points: (w, h, fs) => {
      // (the point is the same height whatever the name: a second line
      // lengthens the straight sides, never runs into the point)
      const x = w / 2, y = h / 2, tipH = Math.min(h * 0.45, fs * 1.05), shoulder = y - tipH;
      const pts: Vec[] = [{ x: -x, y: -y }, { x, y: -y }, { x, y: shoulder }];
      const p0 = { x, y: shoulder }, c1 = { x, y: shoulder + tipH * 0.62 }, c2 = { x: x * 0.42, y: y - tipH * 0.12 }, tip = { x: 0, y };
      for (let i = 1; i <= 10; i++) pts.push(cubic(p0, c1, c2, tip, i / 10));
      const q0 = tip, d1 = { x: -x * 0.42, y: y - tipH * 0.12 }, d2 = { x: -x, y: shoulder + tipH * 0.62 }, q1 = { x: -x, y: shoulder };
      for (let i = 1; i <= 10; i++) pts.push(cubic(q0, d1, d2, q1, i / 10));
      return pts;
    },
  },
  // A hexagon, pointed at both ends.
  hexagon: {
    padX: 0.7, padH: 0.6, height: 1.7, textDy: 0,
    points: (w, h) => {
      const x = w / 2, y = h / 2, p = Math.min(h * 0.42, w * 0.25);
      return [{ x: -x + p, y: -y }, { x: x - p, y: -y }, { x, y: 0 }, { x: x - p, y }, { x: -x + p, y }, { x: -x, y: 0 }];
    },
  },
  // A cameo: a tall oval with an engraved inner frame of fine beads.
  cameo: {
    padX: 1.9, height: 2.2, textDy: 0, ellipseInset: 0.3,
    points: (w, h) => ellipsePoints(w / 2, h / 2, 48),
    ornament: (w, h, fs) => {
      const rx = w / 2 - fs * 0.24, ry = h / 2 - fs * 0.24;
      const n = Math.max(16, Math.round((Math.PI * (rx + ry)) / (fs * 0.42)));
      const r = fs * 0.045;
      return Array.from({ length: n }, (_, i) => {
        const t = (i / n) * 2 * Math.PI, cx = rx * Math.cos(t), cy = ry * Math.sin(t);
        return `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;
      }).join("");
    },
  },
  // A scalloped medallion: an engraved rosette, an oval whose edge is a
  // ring of fine, even scallops (each a round arc, as on a seal or a
  // coin's rim) around a smooth inner rule.
  scallop: {
    padX: 2.0, height: 2.3, textDy: 0, ellipseInset: 0.3,
    points: (w, h, fs) => {
      const amp = fs * 0.07;
      const rx = w / 2 - amp, ry = h / 2 - amp;
      // (the scallops as wide as each other all round, about a third of the type size)
      const n = Math.max(20, Math.round((Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))) / (fs * 0.36)));
      const steps = n * 10;
      return Array.from({ length: steps }, (_, i) => {
        const t = (i / steps) * 2 * Math.PI;
        // (a round arc per scallop; the valleys meet at the ellipse, never deeper)
        const bump = amp * Math.sqrt(Math.abs(Math.sin((n * t) / 2)));
        const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
        const nx = ry * Math.cos(t), ny = rx * Math.sin(t), nl = Math.hypot(nx, ny) || 1;
        return { x: ex + (bump * nx) / nl, y: ey + (bump * ny) / nl };
      });
    },
    ornament: (w, h, fs) => {
      // the smooth inner rule, as a thin ring (drawn filled: outer ellipse minus inner)
      const g = fs * 0.24, t = fs * 0.035;
      const ring = (rx: number, ry: number, sweep: 0 | 1) => `M${(-rx).toFixed(1)} 0a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 ${sweep} ${(2 * rx).toFixed(1)} 0a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 ${sweep} ${(-2 * rx).toFixed(1)} 0Z`;
      return ring(w / 2 - g, h / 2 - g, 1) + ring(w / 2 - g - t, h / 2 - g - t, 0);
    },
  },
};

export const isDesignShape = (s: string): s is DesignShape => s in DESIGNS;

/** The box of a design around a name `textW` wide (font size fs) with a second line `subH` tall. */
export function designSize(shape: DesignShape, textW: number, fs: number, subH: number): { w: number; h: number } {
  const d = DESIGNS[shape];
  const h = fs * d.height + subH;
  if (d.ellipseInset !== undefined) {
    // (the text block's corners on the ellipse shrunk by the inset)
    const halfText = textW / 2 + fs * 0.15;
    const yText = fs * 0.55 + (subH ? Math.max(fs * 0.35, subH * 0.75) : 0);
    const ry = h / 2 - fs * d.ellipseInset;
    const k = Math.sqrt(Math.max(0.05, 1 - (yText / ry) ** 2));
    const w = Math.max(textW + fs * d.padX, 2 * (halfText / k + fs * d.ellipseInset), h * 1.05);
    return { w, h };
  }
  // (never narrower than tall: a short name in a round-ended design keeps its shape)
  return { w: Math.max(textW + fs * d.padX + h * (d.padH ?? 0), h * (shape === "cameo" || shape === "scallop" ? 1.05 : 0.95)), h };
}

/** A design's outline as an SVG path, centred on 0, 0. */
export function designPath(shape: DesignShape, w: number, h: number, fs: number): string {
  const pts = DESIGNS[shape].points(w, h, fs);
  return `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}Z`;
}

/** The node fields the geometry reads. */
export interface NodeShapeInput {
  shape: PosterShape;
  w: number;
  h: number;
  fontSize: number;
  terminal?: boolean;
  angle?: number;
  leafLength?: number;
  leafWidth?: number;
}

/**
 * How far a node's drawing reaches past its laid-out box, at most, on any
 * side: half its outline's stroke and, around a parent, the gold ring.
 */
export function decorOutset(n: NodeShapeInput): number {
  const fs = n.fontSize;
  if (n.shape === "medallion") return (fs * MEDALLION_STROKE) / 2;
  // (circles are drawn a little bolder)
  const stroke = (fs * NODE_STROKE * (n.shape === "circle" ? 1.2 : 1)) / 2;
  if (n.shape === "leaf" || n.terminal !== false) return stroke;
  return fs * RING_GAP + (fs * RING_STROKE) / 2;
}

/** A shape's outline as points, centred on 0, 0, grown by `grow` on every side. */
export function outlinePoints(n: NodeShapeInput, grow = 0): Vec[] {
  const w = n.w + 2 * grow, h = n.h + 2 * grow;
  switch (n.shape) {
    case "leaf": {
      // (the blade, grown by `grow` across and along)
      const pts = leafPoints((n.leafLength ?? n.w) + 2 * grow, (n.leafWidth ?? n.h) + 2 * grow);
      const a = ((n.angle ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      return pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
    }
    case "medallion":
    case "oval":
      return ellipsePoints(w / 2, h / 2);
    case "circle":
      // (a long name's roundel is a capsule of the same height)
      return n.w > n.h + 0.5 ? roundRectPoints(w, h, h / 2) : ellipsePoints(w / 2, w / 2);
    case "pill":
      return roundRectPoints(w, h, h / 2);
    default:
      if (isDesignShape(n.shape)) return DESIGNS[n.shape].points(w, h, n.fontSize);
      return roundRectPoints(w, h, h / 2);
  }
}

/** The whole drawn extent of a node on the page: its outline grown by its outset (and `extra`). */
export function drawnOutline(n: NodeShapeInput & { x: number; y: number }, extra = 0): Vec[] {
  return outlinePoints(n, decorOutset(n) + extra).map((p) => ({ x: p.x + n.x, y: p.y + n.y }));
}

/** What the layout keeps clear around a node's box: its drawn outset and half the clearance. */
export const layoutPad = (n: NodeShapeInput) => decorOutset(n) + (n.fontSize * CLEARANCE) / 2;

const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const segmentsCross = (p: Vec, q: Vec, r: Vec, s: Vec) =>
  cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0;
function inside(pt: Vec, poly: Vec[]) {
  let on = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) on = !on;
  }
  return on;
}

/** Whether two outlines overlap (their edges cross, or one lies inside the other). */
export function outlinesOverlap(a: Vec[], b: Vec[]): boolean {
  const box = (p: Vec[]) => [Math.min(...p.map((v) => v.x)), Math.max(...p.map((v) => v.x)), Math.min(...p.map((v) => v.y)), Math.max(...p.map((v) => v.y))];
  const [ax0, ax1, ay0, ay1] = box(a), [bx0, bx1, by0, by1] = box(b);
  if (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) if (segmentsCross(p, q, b[j], b[(j + 1) % b.length])) return true;
  }
  return inside(a[0], b) || inside(b[0], a);
}
