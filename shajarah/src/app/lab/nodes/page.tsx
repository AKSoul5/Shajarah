import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { nodeLabFamily, type LabCase } from "@/lib/samples/nodeLab";
import { NODE_DESIGNS, NODE_DESIGN_LABELS, SUGGESTED_NODE_DESIGNS, THEME_PRESETS, layoutOptionsFor, resolveTheme, type NodeDesign } from "@/lib/theme";
import type { PosterTheme, ThemePreset, TreeDTO } from "@/lib/types";
import { NodeLab } from "./NodeLab";

export const metadata = { title: "Node Design Lab — Shajarah" };
// (laid out on each visit: a change to the layout or the designs shows at once)
export const dynamic = "force-dynamic";

export interface LabPoster {
  design: NodeDesign;
  label: string;
  /** One of the designs suggested for the chosen poster design. */
  suggested: boolean;
  /** The poster design's own node design. */
  current: boolean;
  theme: PosterTheme;
  layout: PosterLayout;
}
export interface LabLanguage {
  lang: "ar" | "en";
  tree: Pick<TreeDTO, "name" | "title" | "subtitle">;
  cases: Record<string, LabCase>;
  posters: LabPoster[];
}
export interface LabChoice {
  preset: ThemePreset;
  lang: "ar" | "en";
  /** Names with a second line (years of birth and death). */
  years: boolean;
}

/**
 * The Node Design Lab: the same small family in every node design, within
 * one poster design (chosen), laid out by the layout engine and drawn by the
 * poster's own renderer, each name lifted from the poster as drawn (ordinary
 * and long names, with and without descendants), in Arabic or English, with
 * or without a second line. It shows the designs; it changes nothing.
 */
export default function NodeLabPage({ searchParams }: { searchParams: { theme?: string; lang?: string; years?: string } }) {
  const preset = (searchParams.theme && searchParams.theme in THEME_PRESETS ? searchParams.theme : "classic") as ThemePreset;
  const lang = searchParams.lang === "en" ? "en" : "ar";
  const years = searchParams.years === "1";
  const { tree, cases } = nodeLabFamily(lang);
  const suggested = SUGGESTED_NODE_DESIGNS[preset];
  const own = THEME_PRESETS[preset].nodeShape;
  // (the suggested designs first, then the rest in the menu's order)
  const order = [...suggested, ...NODE_DESIGNS.filter((d) => !suggested.includes(d))];
  const posters: LabPoster[] = order.map((design) => {
    const theme = resolveTheme({ theme: { preset, nodeShape: design, showYears: years } });
    const layout = computePosterLayout(tree, { showFemales: true, rtl: lang === "ar", ...layoutOptionsFor(theme, "A3") });
    return { design, label: NODE_DESIGN_LABELS[design][lang], suggested: suggested.includes(design), current: own === design, theme, layout };
  });
  const language: LabLanguage = { lang, tree: { name: tree.name, title: tree.title, subtitle: tree.subtitle }, cases, posters };
  const presets = (Object.keys(THEME_PRESETS) as ThemePreset[]).map((p) => ({ preset: p, label: THEME_PRESETS[p].label }));
  return <NodeLab language={language} choice={{ preset, lang, years }} presets={presets} />;
}
