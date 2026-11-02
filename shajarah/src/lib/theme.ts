import { PAPER_SIZES, type PaperSize } from "./paper";
import type { PosterSettings, PosterTheme, ThemePreset } from "./types";

const ORNAMENTS = { bismillah: true, edition: true, verse: true, hadith: true, frame: true };

export const THEME_PRESETS: Record<ThemePreset, PosterTheme & { label: string }> = {
  refined: {
    label: "Refined ivory (recommended)",
    preset: "refined", colorBy: "gender",
    male: "#c9cbc7", female: "#dcbc6a", ancestor: "#b08a2e", branch: "#6e5538",
    background: "parchment", metallic: true, nodeRim: "#8d8f8a",
    nodeShape: "auto", femaleCapsule: true, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "column",
    bismillah: true, edition: true, verse: false, hadith: false, frame: false,
  },
  luxe: {
    label: "Luxe (Canva gold-foil frame)",
    preset: "luxe", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#5b4128",
    background: "parchment", metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "auto", femaleCapsule: true, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "banner",
    ...ORNAMENTS,
  },
  heritage: {
    label: "Heritage (ivory & gold)",
    preset: "heritage", colorBy: "gender",
    male: "#fbf3dc", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#b8892f",
    nodeShape: "oval", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "banner",
    ...ORNAMENTS,
  },
  "silver-gold": {
    label: "Silver & Gold",
    preset: "silver-gold", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "oval", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "column",
    ...ORNAMENTS,
  },
  classic: {
    label: "Classic botanical",
    preset: "classic", colorBy: "gender",
    // a heritage palette (deep teal, dusty rose, antique gold, walnut): the
    // old bright green and pink sat loud on the parchment
    male: "#2c5d52", female: "#d4a3aa", ancestor: "#a77c2e", branch: "#594b3d",
    background: "parchment", metallic: false, nodeRim: "#183f36",
    nodeShape: "auto", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "carved", spouseStyle: "manuscript", soilStyle: "paragraph",
    ...ORNAMENTS,
  },
  emerald: {
    label: "Parchment & Emerald",
    preset: "emerald", colorBy: "gender",
    male: "#1f7a4d", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: false, nodeRim: "#0f3d26",
    nodeShape: "auto", femaleCapsule: false, branchColors: true, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "spine",
    ...ORNAMENTS,
  },
  mono: {
    label: "Minimal black & white",
    preset: "mono", colorBy: "gender",
    male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a",
    background: "white", metallic: false, nodeRim: "#111111",
    nodeShape: "oval", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, motherNames: false, trunkStyle: "badges", spouseStyle: "manuscript", soilStyle: "paragraph",
    bismillah: true, edition: true, verse: false, hadith: false, frame: false,
  },
};

/** Merges a tree's saved overrides onto its preset. */
export function resolveTheme(settings: PosterSettings | null | undefined): PosterTheme {
  const saved = settings?.theme ?? {};
  // Refined ivory (fine gold rule, satin leaves and capsules) is the default look.
  const preset = THEME_PRESETS[saved.preset ?? "refined"] ?? THEME_PRESETS.refined;
  const { label: _label, ...base } = preset;
  return { ...base, ...saved, preset: base.preset };
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
  return lum > 0.4 ? "#1f1408" : "#ffffff";
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
  /** The title's two-stop fill (top, bottom). */
  titleHi: string;
  titleLo: string;
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
}

/** The colours every preset was drawn in before each had its own palette. */
const BASE_PALETTE: Omit<PosterPalette, "inkOnly"> = {
  paper: "#f7f1e3", ivory: "#fcf8ee", rule: "#b08a2e", ornament: "#b08a2e", thread: "#d9b45a",
  figure: "#8a6a1f", edition: "#8a6a1f", titleHi: "#b98d2c", titleLo: "#6e4f12",
  ink: "#2a1c0c", inkSoft: "#6b4a22", muted: "#6b4a22", footerInk: "#5a4630", creditInk: "#8a6d40",
  canopyWash: "#efe3c3", canopyWashOpacity: 0.35,
  spouseFill: "#f8ece6", spouseRim: "#9a6656", spouseInk: "#6e4438", legendParent: "#e8e0cc",
  lineage: LINEAGE_COLORS,
};

/** Black ink on white: every colour, metal and wash dropped. */
const INK_PALETTE: Omit<PosterPalette, "inkOnly"> = {
  paper: "#ffffff", ivory: "#ffffff", rule: "#111111", ornament: "#111111", thread: "#111111",
  figure: "#111111", edition: "#555555", titleHi: "#111111", titleLo: "#111111",
  ink: "#111111", inkSoft: "#444444", muted: "#111111", footerInk: "#111111", creditInk: "#666666",
  canopyWash: "#ffffff", canopyWashOpacity: 0,
  spouseFill: "#ffffff", spouseRim: "#111111", spouseInk: "#111111", legendParent: "#ffffff",
  lineage: ["#1a1a1a"],
};

/** Whether a theme is drawn in black ink only (white paper meant it, before the setting existed). */
export const isInkOnly = (theme: Pick<PosterTheme, "inkOnly" | "background">) => theme.inkOnly ?? theme.background === "white";

/** The full palette a theme is drawn in. */
export function paletteOf(theme: PosterTheme): PosterPalette {
  const inkOnly = isInkOnly(theme);
  return { inkOnly, ...(inkOnly ? INK_PALETTE : BASE_PALETTE) };
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
