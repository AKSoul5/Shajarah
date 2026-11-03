// Every preview the Style menu draws (each design drawn on the poster as it
// is now, each foundation style in miniature, in every design), rendered as
// the menu renders them: none may throw. (1.0.47 opened the menu to a blank
// page: a foundation preview passed the palette a layout without names.)
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoilPreview, TreePoster } from "@/components/poster/TreePoster";
import { computePosterLayout } from "@/lib/layout/botanical";
import { SOIL_STYLES, type SoilStyleId } from "@/lib/layout/soil";
import { fixtureBalanced } from "@/lib/qa/fixtures";
import { THEME_PRESETS, layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { ThemePreset } from "@/lib/types";

// (the poster renderer's JSX, compiled for the app, finds React as a global)
(globalThis as unknown as { React: typeof React }).React = React;

const presets = Object.keys(THEME_PRESETS) as ThemePreset[];
const styles = Object.keys(SOIL_STYLES) as SoilStyleId[];

describe("the Style menu's previews", () => {
  it.each(presets)("%s: every foundation style's preview draws, in Arabic and English", (preset) => {
    const theme = resolveTheme({ theme: { preset, branchColors: true } });
    for (const style of styles) {
      for (const rtl of [true, false]) {
        const svg = renderToStaticMarkup(React.createElement(SoilPreview, { style, theme, rtl, idPrefix: `t-${style}` }));
        expect(svg, `${preset} ${style}`).toContain("<svg");
      }
    }
  });

  it("each design's preview of the poster draws (with and without branch colours)", () => {
    const tree = fixtureBalanced();
    const layout = computePosterLayout(tree, { showFemales: true, ...layoutOptionsFor(resolveTheme(null), "A3") });
    for (const preset of presets) {
      for (const branchColors of [true, false]) {
        const theme = resolveTheme({ theme: { preset, branchColors } });
        const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: tree.name }, theme, idPrefix: `pv-${preset}` }));
        expect(svg, preset).toContain("<svg");
      }
    }
  });
});
