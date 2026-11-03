// The layout QA suite's runner (see the layout-qa-*.test.ts files and
// docs in tests/qa/README.md). Each case: a fixture, a display mode, a
// design (its suggested foundation), a paper size. It lays the poster out,
// inspects it (src/lib/qa/layoutQa.ts), writes the poster as SVG and the
// findings as JSON under QA_OUT, and compares the defect counts with the
// recorded baseline: a case with more defects of a kind than recorded fails.
// It reports; it never changes a layout.
import { expect, it } from "vitest";
import * as React from "react";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { QA_FIXTURES, type QaFixture } from "@/lib/qa/fixtures";
import { DEFECTS, inspectPoster, type FindingKind } from "@/lib/qa/layoutQa";
import { TreePoster } from "@/components/poster/TreePoster";
import type { ThemePreset, TreeDTO } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

export const ENABLED = process.env.QA_LAYOUT === "1";
const OUT = process.env.QA_OUT ?? "qa-report";
const BASELINE = "tests/qa/layout-baseline.json";

export const MODES = {
  males: { showFemales: false, motherNames: false, through: false },
  daughters: { showFemales: true, motherNames: false, through: false },
  spouses: { showFemales: false, motherNames: true, through: false },
  all: { showFemales: true, motherNames: true, through: true },
} as const;
export type Mode = keyof typeof MODES;
export const THEMES = Object.keys(THEME_PRESETS) as ThemePreset[];

/** The family's own daughters whose children are recorded (not wives): "show all" draws their families through them. */
const daughtersWithFamilies = (tree: TreeDTO) =>
  tree.members.filter((m) => m.gender === "FEMALE" && m.fatherId && tree.members.some((c) => c.motherId === m.id)).map((m) => m.id);

export interface CaseResult {
  id: string; fixture: QaFixture; mode: Mode; theme: ThemePreset; paper: PaperSize; soilStyle: string;
  counts: Partial<Record<FindingKind, number>>; defects: number; findings: ReturnType<typeof inspectPoster>["findings"];
  summary: ReturnType<typeof inspectPoster>["summary"]; ms: number;
}

export function runCase(fixture: QaFixture, mode: Mode, theme: ThemePreset, paper: PaperSize, soilStyle?: string, nodeShape?: string): CaseResult {
  const tree = QA_FIXTURES[fixture]();
  const m = MODES[mode];
  const themeSettings = { preset: theme, v: 2, motherNames: m.motherNames, ...(soilStyle ? { soilStyle } : {}), ...(nodeShape ? { nodeShape } : {}) };
  const settings = { posterSize: paper, showFemales: m.showFemales, familiesThrough: m.through ? daughtersWithFamilies(tree) : [], theme: themeSettings } as unknown as TreeDTO["settings"];
  const t = resolveTheme(settings);
  const t0 = Date.now();
  const layout = computePosterLayout({ ...tree, settings }, { ...layoutOptionsFor(t, paper) });
  const ms = Date.now() - t0;
  // (an empty poster is a failure of the case itself, not a clean result)
  expect(layout.nodes.length, `${fixture} ${mode}: nothing laid out`).toBeGreaterThan(0);
  const ins = inspectPoster(layout, { ...tree, settings }, PAPER_SIZES[paper].w);
  const id = [fixture, mode, theme, paper, ...(soilStyle ? [soilStyle] : []), ...(nodeShape ? [nodeShape] : [])].join("_");
  mkdirSync(`${OUT}/svg`, { recursive: true });
  mkdirSync(`${OUT}/json`, { recursive: true });
  const svg = renderToStaticMarkup(React.createElement(TreePoster, { layout, meta: { title: tree.title, subtitle: null, name: "" }, theme: t }));
  writeFileSync(`${OUT}/svg/${id}.svg`, svg.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'));
  const result: CaseResult = { id, fixture, mode, theme, paper, soilStyle: t.soilStyle, counts: ins.counts, defects: ins.defects, findings: ins.findings, summary: ins.summary, ms };
  writeFileSync(`${OUT}/json/${id}.json`, JSON.stringify(result));
  return result;
}

/** Per case: the defects of each kind on record, and whether its names were legible. */
const baseline: Record<string, Partial<Record<FindingKind, number>> & { legible?: boolean }> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};

/** One test per case: no defect kind may exceed the recorded baseline (QA_UPDATE=1 records it instead). */
export function caseTest(fixture: QaFixture, mode: Mode, theme: ThemePreset, paper: PaperSize, soilStyle?: string) {
  const id = [fixture, mode, theme, paper, ...(soilStyle ? [soilStyle] : [])].join("_");
  it(id, () => {
    const r = runCase(fixture, mode, theme, paper, soilStyle);
    if (process.env.QA_UPDATE === "1" || !(id in baseline)) return;
    for (const k of DEFECTS) {
      expect(r.counts[k] ?? 0, `${id}: ${k} (baseline ${baseline[id][k] ?? 0})`).toBeLessThanOrEqual(baseline[id][k] ?? 0);
    }
    // a poster that was legible must stay legible
    if (baseline[id].legible) expect(r.summary.legible, `${id}: names now below the legible size`).toBe(true);
  }, 600_000);
}
