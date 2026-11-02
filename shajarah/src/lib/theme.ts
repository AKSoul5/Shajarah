import { PAPER_SIZES, type PaperSize } from "./paper";
import type { PosterSettings, PosterTheme, ThemePreset } from "./types";

const ORNAMENTS = { bismillah: true, edition: true, verse: true, hadith: true, frame: true };

/**
 * Each preset is its own design (see PRESET_PALETTES for the rest of its
 * colours). The ids stay as they were, so saved posters keep their theme;
 * the names are the ones shown in the editor.
 */
export const THEME_PRESETS: Record<ThemePreset, PosterTheme & { label: string; description: string }> = {
  refined: {
    label: "Refined Heritage",
    description: "Quiet luxury: warm ivory, satin silver and champagne, walnut branches, fine antique-gold rules.",
    preset: "refined", colorBy: "gender",
    male: "#c5c9c5", female: "#d9bd78", ancestor: "#9a7a3a", branch: "#66503a",
    background: "parchment", inkOnly: false, metallic: true, nodeRim: "#7e837e",
    nodeShape: "auto", femaleCapsule: true, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "column",
    bismillah: true, edition: true, verse: false, hadith: false, frame: false,
  },
  luxe: {
    label: "Imperial Gold",
    description: "Opulent and formal: the gold-foil frame, deep espresso, foil gold and brushed silver.",
    preset: "luxe", colorBy: "gender",
    male: "#c0c0c0", female: "#d6b45c", ancestor: "#9a7029", branch: "#49301f",
    background: "parchment", inkOnly: false, metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "auto", femaleCapsule: true, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "banner",
    ...ORNAMENTS,
  },
  heritage: {
    label: "Ancestral Manuscript",
    description: "Historic and archival: aged parchment, ink-brown branches, brass, engraved ovals.",
    preset: "heritage", colorBy: "gender",
    male: "#f5ebd5", female: "#d9bf8c", ancestor: "#8a6a35", branch: "#67472d",
    background: "parchment", inkOnly: false, metallic: false, nodeRim: "#8a6a35",
    nodeShape: "oval", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "paragraph",
    ...ORNAMENTS,
  },
  "silver-gold": {
    label: "Platinum",
    description: "Contemporary luxury: porcelain paper, brushed platinum and champagne, steel rules, clean geometry.",
    preset: "silver-gold", colorBy: "gender",
    male: "#b9c0c8", female: "#c7a45b", ancestor: "#8c7440", branch: "#59616c",
    background: "parchment", inkOnly: false, metallic: true, nodeRim: "#59616c",
    nodeShape: "oval", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "spine",
    ...ORNAMENTS,
  },
  classic: {
    label: "Botanical Classic",
    description: "Organic: deep teal leaves, dusty rose, walnut, antique gold kept for the lineage.",
    preset: "classic", colorBy: "gender",
    male: "#35685d", female: "#d2a0a5", ancestor: "#8e6e32", branch: "#4b4035",
    background: "parchment", inkOnly: false, metallic: false, nodeRim: "#1f4038",
    nodeShape: "auto", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "carved", spouseStyle: "manuscript", soilStyle: "roots",
    ...ORNAMENTS,
  },
  emerald: {
    label: "Emerald Dynasty",
    description: "Regal: forest emerald, warm brass, deep green, gold-rimmed names.",
    preset: "emerald", colorBy: "gender",
    male: "#236347", female: "#d6b65e", ancestor: "#8a6a25", branch: "#654a2d",
    background: "parchment", inkOnly: false, metallic: false, nodeRim: "#123f30",
    nodeShape: "auto", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "roots",
    ...ORNAMENTS,
  },
  mono: {
    label: "Modern Archive",
    description: "Minimal and editorial: black ink on soft white, precise rules, no colour or metal.",
    preset: "mono", colorBy: "gender",
    male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a",
    background: "white", inkOnly: true, metallic: false, nodeRim: "#111111",
    nodeShape: "oval", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "paragraph",
    bismillah: true, edition: true, verse: false, hadith: false, frame: false,
  },
};

/**
 * The design of each preset before the themes were redesigned (1.0.42 and
 * earlier). A saved poster stored every one of these values, touched or
 * not: those still equal to them were never changed by its owner, and take
 * the redesigned values (see resolveTheme).
 */
const LEGACY_DESIGN: Record<ThemePreset, Partial<PosterTheme>> = {
  refined: { male: "#c9cbc7", female: "#dcbc6a", ancestor: "#b08a2e", branch: "#6e5538", background: "parchment", metallic: true, nodeRim: "#8d8f8a" },
  luxe: { male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#5b4128", background: "parchment", metallic: true, nodeRim: "#6f6f6f" },
  heritage: { male: "#fbf3dc", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a", background: "parchment", metallic: true, nodeRim: "#b8892f" },
  "silver-gold": { male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a", background: "parchment", metallic: true, nodeRim: "#6f6f6f" },
  classic: { male: "#2c5d52", female: "#d4a3aa", ancestor: "#a77c2e", branch: "#594b3d", background: "parchment", metallic: false, nodeRim: "#183f36" },
  emerald: { male: "#1f7a4d", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a", background: "parchment", metallic: false, nodeRim: "#0f3d26" },
  mono: { male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a", background: "white", metallic: false, nodeRim: "#111111" },
};

/** The fields that make up a preset's look (colours and finish); the rest are the poster's content and layout. */
const DESIGN_FIELDS = ["male", "female", "ancestor", "branch", "background", "metallic", "nodeRim", "inkOnly"] as const;

/** Saved theme settings from this version on carry only what differs from their preset. */
const THEME_VERSION = 2;

/** Merges a tree's saved overrides onto its preset. */
export function resolveTheme(settings: PosterSettings | null | undefined): PosterTheme {
  const stored = (settings?.theme ?? {}) as Partial<PosterTheme> & { v?: number };
  // Refined Heritage is the default look.
  const preset = THEME_PRESETS[stored.preset ?? "refined"] ?? THEME_PRESETS.refined;
  const { label: _label, description: _description, ...base } = preset;
  const { v: _v, ...saved } = migrateTheme(stored, base.preset);
  return { ...base, ...saved, preset: base.preset };
}

/**
 * A theme saved before the redesign stored its preset's every colour, so a
 * poster never changed by its owner would keep the old look for good.
 * Each design value still equal to the old preset's is dropped, so the
 * redesigned one applies; anything the owner changed stays.
 */
function migrateTheme(stored: Partial<PosterTheme> & { v?: number }, preset: ThemePreset): Partial<PosterTheme> & { v?: number } {
  if ((stored.v ?? 0) >= THEME_VERSION) return stored;
  const legacy = LEGACY_DESIGN[preset];
  const out: Record<string, unknown> = { ...stored };
  // (white paper on a theme saved before inkOnly existed meant black ink only)
  if (stored.inkOnly === undefined && stored.background === "white") out.inkOnly = true;
  for (const k of DESIGN_FIELDS) {
    const was = legacy[k as keyof PosterTheme];
    const now = out[k];
    if (now === undefined) continue;
    if (typeof was === "string" && typeof now === "string" ? was.toLowerCase() === now.toLowerCase() : was === now) delete out[k];
  }
  return out as Partial<PosterTheme>;
}

/**
 * What to save of a theme: its preset and content settings, and only the
 * design values that differ from the preset's (so a later refinement of
 * the preset reaches every poster that kept its look).
 */
export function compactTheme(theme: PosterTheme): Partial<PosterTheme> & { v: number } {
  const preset = THEME_PRESETS[theme.preset] ?? THEME_PRESETS.refined;
  const out: Record<string, unknown> = { ...theme, v: THEME_VERSION };
  for (const k of DESIGN_FIELDS) {
    const a = out[k], b = preset[k as keyof PosterTheme];
    if (typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b) delete out[k];
  }
  return out as Partial<PosterTheme> & { v: number };
}

/** The preset's own design again, keeping the poster's content settings (spouses, ornaments, labels …). */
export function resetDesign(theme: PosterTheme): PosterTheme {
  const { label: _label, description: _description, ...preset } = THEME_PRESETS[theme.preset] ?? THEME_PRESETS.refined;
  const out = { ...theme };
  for (const k of DESIGN_FIELDS) (out as Record<string, unknown>)[k] = preset[k as keyof PosterTheme];
  return out;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

/** Mixes a colour toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return `#${rgb(hex)
    .map((c) => Math.round(c + (target - c) * k).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Dark or light text, whichever reads better on the fill. */
export function textOn(hex: string): string {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // (whichever of the two reads better on the fill: for a mid-tone neither
  // threshold side is safe)
  const dark = "#1f1408", light = "#ffffff";
  if (lum > 0.4) return dark;
  return contrast(hex, dark) > contrast(hex, light) ? dark : light;
}

/** The default bark colour; it maps to a hand-tuned walnut gradient. */
export const BARK_DEFAULT = "#4a2e1a";

/** Three bark gradient stops (shadow, lit, deep shadow). */
export function barkStops(c: string): [string, string, string] {
  if (c.toLowerCase() === BARK_DEFAULT) return ["#3B2314", "#6E472A", "#24140B"];
  return [shade(c, -0.2), shade(c, 0.3), shade(c, -0.5)];
}

/** Metallic gradient stops (highlight, body, shadow) for a node colour. */
export function metalStops(c: string): [string, string, string] {
  const k = c.toLowerCase();
  if (k === "#c0c0c0") return ["#E8E8E8", "#C0C0C0", "#999999"]; // silver
  if (k === "#d4af37") return ["#FFE57F", "#D4AF37", "#AA7C11"]; // gold
  return [shade(c, 0.55), c, shade(c, -0.25)];
}

/**
 * The main branches' colours: four muted heritage tones of like weight
 * (deep teal, antique gold, dusty plum, slate blue), ordered so neighbours
 * differ strongly. Fewer than one per branch on purpose: six or seven
 * colours read as a rainbow, and branches four apart are far apart. All
 * are dark enough to read as lines on ivory (≥ 3:1).
 */
export const LINEAGE_COLORS = ["#2a5f5a", "#8c6b23", "#6d4c66", "#4a6380"] as const;

export function lineageColor(i: number | null | undefined, fallback: string, colours: readonly string[] = LINEAGE_COLORS): string {
  return i == null ? fallback : colours[i % colours.length];
}

/**
 * Every colour a poster is drawn in, beyond the ones a person can choose
 * (son, daughter, ancestor, branch, rim). Each preset has its own; nothing
 * on the poster is drawn in a colour outside its palette (the editor's own
 * marks aside: selection, search, the relationship trace).
 */
export interface PosterPalette {
  /** Black ink only (see PosterTheme.inkOnly). */
  inkOnly: boolean;
  /** The paper, and the ivory of cards, badges and medallions. */
  paper: string;
  ivory: string;
  /** Fine rules and rims (the poster's metal); ornament drawn in it. */
  rule: string;
  ornament: string;
  /** The thread up the trunk and the light metal of the foundation. */
  thread: string;
  /** Small figures and the edition line, in a deeper shade of the metal. */
  figure: string;
  edition: string;
  /** The title's two-stop fill (top, bottom), and its face. */
  titleHi: string;
  titleLo: string;
  titleFont: "ruqaa" | "kufi";
  /** Text: names and labels; the subtitle and soft lines; the foundation's muted words; the footer's labels; the credit. */
  ink: string;
  inkSoft: string;
  muted: string;
  footerInk: string;
  creditInk: string;
  /** The wash behind the canopy (opacity 0: none). */
  canopyWash: string;
  canopyWashOpacity: number;
  /** Spouses' cards. */
  spouseFill: string;
  spouseRim: string;
  spouseInk: string;
  /** The key's swatch for a parent. */
  legendParent: string;
  /** One colour per main branch, in order round the canopy. */
  lineage: readonly string[];
  /**
   * The design's visual language: its frame (drawn when the poster's frame
   * is on; "foil" is the gold-foil artwork, the others vector drawings in
   * the palette), the treatment under or around the title, how names are
   * rimmed, and the paper's surface.
   */
  frame: "rule" | "foil" | "manuscript" | "metal" | "botanical" | "regal" | "hairline";
  titleStyle: "divider" | "cartouche" | "panel" | "steel" | "sprig" | "star" | "hairline";
  rimStyle: "fill" | "engraved" | "metal" | "gold";
  texture: "none" | "grain";
}

/** The colours every preset was drawn in before each had its own palette. */
const BASE_PALETTE: Omit<PosterPalette, "inkOnly"> = {
  paper: "#f7f1e3", ivory: "#fcf8ee", rule: "#b08a2e", ornament: "#b08a2e", thread: "#d9b45a",
  figure: "#8a6a1f", edition: "#8a6a1f", titleHi: "#b98d2c", titleLo: "#6e4f12", titleFont: "ruqaa",
  ink: "#2a1c0c", inkSoft: "#6b4a22", muted: "#6b4a22", footerInk: "#5a4630", creditInk: "#8a6d40",
  canopyWash: "#efe3c3", canopyWashOpacity: 0.35,
  spouseFill: "#f8ece6", spouseRim: "#9a6656", spouseInk: "#6e4438", legendParent: "#e8e0cc",
  lineage: LINEAGE_COLORS,
  frame: "foil", titleStyle: "divider", rimStyle: "fill", texture: "none",
};

/** Black ink on white: every colour, metal and wash dropped. */
const INK_PALETTE: Omit<PosterPalette, "inkOnly"> = {
  paper: "#ffffff", ivory: "#ffffff", rule: "#111111", ornament: "#111111", thread: "#111111",
  figure: "#111111", edition: "#555555", titleHi: "#111111", titleLo: "#111111", titleFont: "ruqaa",
  ink: "#111111", inkSoft: "#444444", muted: "#111111", footerInk: "#111111", creditInk: "#666666",
  canopyWash: "#ffffff", canopyWashOpacity: 0,
  spouseFill: "#ffffff", spouseRim: "#111111", spouseInk: "#111111", legendParent: "#ffffff",
  lineage: ["#1a1a1a"],
  frame: "hairline", titleStyle: "hairline", rimStyle: "fill", texture: "none",
};

/**
 * The palettes of the seven designs. Light metals and pastels are fills
 * only: every rule, rim, branch and lineage colour is at least 3:1 against
 * its paper, and every text colour at least 4.5:1 against what it sits on
 * (tests/themes.test.ts checks each one).
 */
export const PRESET_PALETTES: Record<ThemePreset, Omit<PosterPalette, "inkOnly">> = {
  // quiet luxury: warm ivory, satin gold, walnut
  refined: {
    paper: "#f6f0e3", ivory: "#fbf7ee", rule: "#9a7a3a", ornament: "#9a7a3a", thread: "#d9bd78",
    figure: "#6f5524", edition: "#6f5524", titleHi: "#a98542", titleLo: "#5a4430", titleFont: "ruqaa",
    ink: "#2e2418", inkSoft: "#5c4834", muted: "#5c4834", footerInk: "#4f3e2c", creditInk: "#5f4d38",
    canopyWash: "#ece2cb", canopyWashOpacity: 0.4,
    spouseFill: "#f3ece0", spouseRim: "#8a7350", spouseInk: "#4a3b2a", legendParent: "#e6dcc6",
    lineage: ["#5a6a5c", "#8a6a2e", "#7a4a52", "#3f5a7e"],
    frame: "rule", titleStyle: "divider", rimStyle: "fill", texture: "none",
  },
  // opulent: rich parchment, espresso, foil gold kept to frame, title and ornament
  luxe: {
    paper: "#efe3c8", ivory: "#f8f0dc", rule: "#9a7029", ornament: "#9a7029", thread: "#d6b45c",
    figure: "#6a4a19", edition: "#6a4a19", titleHi: "#b8862e", titleLo: "#49301f", titleFont: "ruqaa",
    ink: "#2d2119", inkSoft: "#49301f", muted: "#49301f", footerInk: "#49301f", creditInk: "#5a4330",
    canopyWash: "#e4cf9f", canopyWashOpacity: 0.22,
    spouseFill: "#f4e7cc", spouseRim: "#8d6626", spouseInk: "#49301f", legendParent: "#e5d4ad",
    lineage: ["#86601d", "#4f4a2a", "#7a3e34", "#3f4f5c"],
    frame: "foil", titleStyle: "cartouche", rimStyle: "metal", texture: "none",
  },
  // historic: aged parchment, ink brown, brass
  heritage: {
    paper: "#e9d9b9", ivory: "#f5ebd5", rule: "#7f6131", ornament: "#7f6131", thread: "#c9a45c",
    figure: "#553d1f", edition: "#553d1f", titleHi: "#7f6131", titleLo: "#382719", titleFont: "ruqaa",
    ink: "#2b1e12", inkSoft: "#5a3e27", muted: "#5a3e27", footerInk: "#4a3320", creditInk: "#54402b",
    canopyWash: "#dcc69c", canopyWashOpacity: 0.2,
    spouseFill: "#f2e5c9", spouseRim: "#7f6131", spouseInk: "#4a3320", legendParent: "#e0cfa8",
    lineage: ["#6b3e26", "#4b5a3a", "#3e4e63", "#80691f"],
    frame: "manuscript", titleStyle: "panel", rimStyle: "engraved", texture: "grain",
  },
  // contemporary: porcelain, platinum, champagne, steel
  "silver-gold": {
    paper: "#f7f7f3", ivory: "#fdfdfb", rule: "#59616c", ornament: "#86703c", thread: "#c7a45b",
    figure: "#3f464e", edition: "#4a525c", titleHi: "#6b737e", titleLo: "#2b333c", titleFont: "kufi",
    ink: "#22282e", inkSoft: "#4a525c", muted: "#4a525c", footerInk: "#3a4149", creditInk: "#4f5761",
    canopyWash: "#e9ebe8", canopyWashOpacity: 0.5,
    spouseFill: "#f2f1ec", spouseRim: "#7b6a44", spouseInk: "#3a4149", legendParent: "#e4e6e8",
    lineage: ["#3f5f86", "#836a33", "#4f6f55", "#7a4f6a"],
    frame: "metal", titleStyle: "steel", rimStyle: "metal", texture: "none",
  },
  // organic: deep teal, dusty rose, walnut, antique gold for the lineage
  classic: {
    paper: "#f2ebdd", ivory: "#faf6ee", rule: "#8e6e32", ornament: "#8e6e32", thread: "#c9a45c",
    figure: "#6a5124", edition: "#6a5124", titleHi: "#35685d", titleLo: "#1f4038", titleFont: "ruqaa",
    ink: "#2a2620", inkSoft: "#4b4035", muted: "#4b4035", footerInk: "#4b4035", creditInk: "#564a3c",
    canopyWash: "#dfe6d6", canopyWashOpacity: 0.45,
    spouseFill: "#f5e5e6", spouseRim: "#9a6656", spouseInk: "#5a3730", legendParent: "#e5ded0",
    lineage: ["#2a5f5a", "#8c6b23", "#6d4c66", "#4a6380"],
    frame: "botanical", titleStyle: "sprig", rimStyle: "fill", texture: "none",
  },
  // regal: forest emerald, brass, deep green
  emerald: {
    paper: "#f3ebdd", ivory: "#faf5ea", rule: "#856522", ornament: "#856522", thread: "#d6b65e",
    figure: "#5c431f", edition: "#5c431f", titleHi: "#236347", titleLo: "#123f30", titleFont: "ruqaa",
    ink: "#1c2a22", inkSoft: "#3d4a40", muted: "#5c431f", footerInk: "#2c4639", creditInk: "#45554b",
    canopyWash: "#d7e6dc", canopyWashOpacity: 0.5,
    spouseFill: "#edf2ea", spouseRim: "#2c6a4e", spouseInk: "#123f30", legendParent: "#e1e4d6",
    lineage: ["#236347", "#856522", "#2f5e73", "#6e4a5c"],
    frame: "regal", titleStyle: "star", rimStyle: "gold", texture: "none",
  },
  // minimal: black ink on soft white
  mono: { ...INK_PALETTE, paper: "#fafaf8", titleFont: "kufi" },
};

/** Whether a theme is drawn in black ink only (white paper meant it, before the setting existed). */
export const isInkOnly = (theme: Pick<PosterTheme, "inkOnly" | "background">) => theme.inkOnly ?? theme.background === "white";

/** The full palette a theme is drawn in. */
export function paletteOf(theme: PosterTheme): PosterPalette {
  const inkOnly = isInkOnly(theme);
  if (inkOnly) return { inkOnly, ...(theme.preset === "mono" ? PRESET_PALETTES.mono : INK_PALETTE) };
  const own = PRESET_PALETTES[theme.preset] ?? BASE_PALETTE;
  // (white paper chosen for a coloured theme: its colours on white)
  return { inkOnly, ...own, ...(theme.background === "white" ? { paper: "#ffffff", ivory: "#ffffff" } : {}) };
}

/** WCAG contrast ratio between two colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * The rim of a name drawn in `fill` on `paper`: the fill darkened, as far
 * as it takes to stand at least 3:1 against the paper (a pale silver or
 * champagne, or a pale colour someone chose, would otherwise melt into it).
 */
export function rimOn(fill: string, paper: string): string {
  let k = 0.38, rim = shade(fill, -k);
  while (contrast(rim, paper) < 3 && k < 0.95) { k += 0.05; rim = shade(fill, -k); }
  return rim;
}

/** A soft satin finish (highlight, body, shade): metal without the glare. */
export function satinStops(c: string): [string, string, string] {
  return [shade(c, 0.55), shade(c, 0.12), shade(c, -0.1)];
}

/** Layout options implied by a theme and poster size (shape, labels, legibility, header space). */
export function layoutOptionsFor(theme: PosterTheme, paper: PaperSize = "A2") {
  return {
    nodeShape: theme.nodeShape,
    labelMode: theme.labelMode,
    showYears: theme.showYears,
    motherNames: theme.motherNames,
    branchScale: isInkOnly(theme) ? 0.35 : 1,
    cornerMedallions: theme.verse || theme.hadith,
    framed: theme.frame,
    soilStyle: theme.soilStyle,
    soilShorten: theme.soilShorten ?? false,
    femaleCapsule: theme.femaleCapsule,
    paperWidthMm: PAPER_SIZES[paper].w,
    // inside the frame the header starts below its top rosette
    // (room for basmala, title, subtitle and the divider under them)
    // the basmala pushes the title down (see TreePoster's Header)
    // (and a little more for the edition line under the divider)
    headerBand: (theme.frame ? (theme.bismillah ? 0.215 : 0.19) : theme.bismillah ? 0.15 : theme.verse || theme.hadith ? 0.13 : 0.105)
      + (theme.edition ? 0.012 : 0),
  };
}
