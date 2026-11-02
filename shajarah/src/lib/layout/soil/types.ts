// The foundation (soil) tier: the ancient lineage below the trunk, the
// ancestors older than FamilyTree.trunkStartId.
//
// Which ancestors go into the soil is decided by the layout engine (the
// three-tier logic is unchanged). How they are drawn is a *soil style*: a
// pure function from the ancestors and the space available to SVG geometry.
// The renderer draws any style the same way (shapes, then texts), so a new
// style is one file and one registry entry, with no renderer change.

/** One ancestor in the soil. */
export interface SoilEntry {
  /** Member id (the name is clickable in the editor), or null for a name from a custom inscription. */
  id: string | null;
  /** The name as set on the poster (with laqab). */
  label: string;
  /** Generation counted from the oldest ancestor of the tree (1 = the first), when known. */
  generation: number | null;
  /**
   * Set on the one entry that stands for names left out of a lineage too
   * long for its space (only when shortening is chosen): how many. Its label
   * says so ("… ١٢ جيلًا …"), so the omission is never silent.
   */
  omitted?: number;
}

/** What a style is given to measure itself (no positions yet). */
export interface SoilContext {
  /** Ancestors in the soil, nearest to the trunk first, oldest last. */
  entries: SoilEntry[];
  /**
   * The lineage as running text, newest first. Automatic: the trunk's first
   * ancestor then the soil ("X بن Y بن …"); custom: FamilyTree.soilText.
   */
  text: string;
  /** A verbatim inscription (FamilyTree.soilText) is used. */
  custom: boolean;
  /** The trunk's first (lowest) ancestor, whom a custom inscription may begin with. */
  trunkName: string | null;
  rtl: boolean;
  /** "بن" or "son of": joins names in running text. */
  joiner: string;
  /** The poster's base font size (the canopy's names), the legibility floor, the largest font. */
  f: number;
  /**
   * The size of the trunk's names: the foundation's names are sized from it,
   * so the nearest ancestors are a step larger than the trunk's and never
   * outweigh the family above (the canopy's names are often well under f).
   * Defaults to f.
   */
  nameFont?: number;
  floor: number;
  maxFont: number;
  /** Widest the foundation may be. */
  maxWidth: number;
  /** Height of the poster's content area: structured styles budget their column against it. */
  avail: number;
  /** Width of a text at a font size (Amiri metrics; calligraphic fonts run wider). */
  textWidth: (text: string, fontSize: number) => number;
}

/** What a style is given to lay itself out. */
export interface SoilPlacement extends SoilContext {
  /** Centre line of the trunk. */
  cx: number;
  /** The ground line the trunk stands on: everything is drawn below it. */
  groundY: number;
  /** Where the gold thread joining the trunk's ancestors ends (the lowest badge), to continue it. */
  threadFrom: number;
  trunkWidth: number;
  /** Page width, for proportional strokes. */
  W: number;
}

/** Colours are roles; the renderer maps them to the palette (and to black in the print-mono style). */
export type SoilInk = "ink" | "gold" | "goldLight" | "muted" | "bark" | "trunk" | "ivory" | "line" | "paper";

export interface SoilText {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  anchor: "start" | "middle" | "end";
  ink: SoilInk;
  /**
   * "ruqaa" is the display face: Aref Ruqaa, or Amiri in a design whose
   * titles are set in Kufi (calligraphy would be out of place there, and
   * Amiri is narrower, so the line still fits).
   */
  font: "naskh" | "ruqaa";
  weight?: 400 | 700;
  /** The member this name is (clickable in the editor). */
  memberId?: string | null;
  /**
   * A number or ornament set beside the names (generation numbers): not a
   * name, so not held to the names' legibility floor.
   */
  annotation?: boolean;
  /**
   * The widest the text may be drawn (its panel, plaque, step or column):
   * the renderer condenses a line that comes out wider (a font other than
   * Amiri, which the widths are measured with). Otherwise the foundation's
   * area holds it.
   */
  maxWidth?: number;
}

/**
 * An ornament the renderer draws in the poster's own design (a lozenge in
 * Refined Heritage, a star in Emerald Dynasty, a pair of leaves in Botanical
 * Classic, a small square in Platinum…). Its `d` is the plain lozenge form,
 * the fallback; every form keeps within the same size, so no design moves a
 * name. Separators sit between names, marks head a panel or an inscription,
 * finials end a column, corners sit on a panel's corners, knots where a root
 * or a spine meets a name.
 */
export interface SoilOrnament {
  kind: "sep" | "mark" | "finial" | "corner" | "knot";
  x: number;
  y: number;
  /** Half its height. */
  s: number;
}

export interface SoilShape {
  d: string;
  /** Drawn in the design's own ornament (see SoilOrnament) instead of `d`. */
  orn?: SoilOrnament;
  fill?: SoilInk;
  stroke?: SoilInk;
  strokeWidth?: number;
  /** Opacity of the fill. */
  opacity?: number;
  /** A dashed stroke (dash, gap): a root or a spine broken where names are left out. */
  dash?: [number, number];
}

export interface SoilGeometry {
  style: SoilStyleId;
  /** The ground line (stroked), or null when the style meets the trunk without one. */
  ground: string | null;
  /** Fine roots from the trunk base down into the foundation (filled). */
  roots: string[];
  /** Drawn first, in order: panels, rules, threads, spines, ornaments. */
  shapes: SoilShape[];
  /** Drawn last, in reading order (newest ancestor first). */
  texts: SoilText[];
  /** Smallest name size (legibility). */
  fontSize: number;
  /** Everything the foundation occupies, below the ground line. */
  box: { x: number; y: number; w: number; h: number };
  /** The width allotted to the foundation (set by the layout engine): no text is drawn beyond it. */
  area?: { x: number; w: number };
  /** Ancestors inscribed (0 when a custom text is used). */
  count: number;
  custom: boolean;
  /**
   * How the trunk meets the foundation: the width of its root flare (1 =
   * full flare on open ground, 0.55 = into a mound, small = the trunk
   * narrows into a thread or spine).
   */
  trunkSpread: number;
  /**
   * When > 0 the trunk does not flare at all: below the ground line it
   * narrows to a point this far down (the calligraphic column grows out of
   * that point), and trunkSpread is ignored.
   */
  trunkTaper: number;
}

export type SoilStyleId = "roots" | "paragraph" | "column" | "spine" | "banner" | "pedestal";

/** A soil style: measure, then lay out. Both pure. */
export interface SoilStyleDef {
  id: SoilStyleId;
  label: string;
  description: string;
  /**
   * Vertical space the foundation needs below the ground line. The layout
   * engine sizes the whole poster with it, so it must equal the laid-out
   * box's bottom minus the ground line.
   */
  height(ctx: SoilContext): number;
  layout(ctx: SoilPlacement): SoilGeometry;
}
