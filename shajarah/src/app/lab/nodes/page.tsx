import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { nodeLabFamily, type LabCase } from "@/lib/samples/nodeLab";
import { THEME_PRESETS, layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { PosterTheme, ThemePreset, TreeDTO } from "@/lib/types";
import { NodeLab } from "./NodeLab";

export const metadata = { title: "Name boxes — Shajarah" };
// (laid out on each visit: a change to the layout or the designs shows at once)
export const dynamic = "force-dynamic";

export interface LabPoster {
  preset: ThemePreset;
  label: string;
  theme: PosterTheme;
  layout: PosterLayout;
}
export interface LabLanguage {
  lang: "ar" | "en";
  tree: Pick<TreeDTO, "name" | "title" | "subtitle">;
  cases: Record<string, LabCase>;
  posters: LabPoster[];
}

/**
 * The name-box preview: the same small family in every design, drawn by the
 * poster's own renderer from the layout engine's own layout, with each name
 * box shown on its own beside the others of its kind (ordinary or long
 * names, with or without descendants), in Arabic and in English. An
 * evaluation tool: nothing here changes how a poster is drawn.
 */
export default function NodeLabPage() {
  const languages: LabLanguage[] = (["ar", "en"] as const).map((lang) => {
    const { tree, cases } = nodeLabFamily(lang);
    const posters = (Object.keys(THEME_PRESETS) as ThemePreset[]).map((preset) => {
      const theme = resolveTheme({ theme: { preset } });
      const layout = computePosterLayout(tree, { showFemales: true, rtl: lang === "ar", ...layoutOptionsFor(theme, "A3") });
      return { preset, label: THEME_PRESETS[preset].label, theme, layout };
    });
    return { lang, tree: { name: tree.name, title: tree.title, subtitle: tree.subtitle }, cases, posters };
  });
  return <NodeLab languages={languages} />;
}
