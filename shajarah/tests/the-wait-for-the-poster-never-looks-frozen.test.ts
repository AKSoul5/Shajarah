// While a poster is laid out (minutes for a large family the first time),
// the editor never looks frozen: a quick draft is on screen within about a
// second, marked as a draft; the search's progress is shown (its step, the
// time taken, and about how long is left where the family's last search is
// known); and nothing is exported until the poster is final, from the
// button or from the desktop menu bar.
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { draftLayout, layoutStep, replayLayout, type PosterLayout } from "@/lib/layout/botanical";
import type { StoredRecipe } from "@/lib/layout/recipes";
import { TwoLayouts, type FamilyRecipes, type LayoutReply, type SearchProgress, type StepRequest, type WorkerLike } from "@/lib/layout/twoLayouts";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { progressText } from "@/components/editor/LayoutStatus";
import { ExportMenu, NOT_READY, exportIfReady } from "@/components/poster/ExportMenu";
import type { TreeDTO } from "@/lib/types";

/** A stand-in worker: lays each request out for real, a moment later, and records what it was asked. */
class FakeWorker implements WorkerLike {
  static asked: StepRequest[] = [];
  terminated = false;
  onmessage: ((e: { data: LayoutReply }) => void) | null = null;
  onerror: WorkerLike["onerror"] = null;
  postMessage(job: StepRequest) {
    FakeWorker.asked.push(job);
    setTimeout(() => {
      if (this.terminated) return;
      const layout = job.kind === "replay" ? replayLayout(job.tree, job.recipe)
        : job.kind === "draft" ? draftLayout(job.tree, job.options, job.scale) : layoutStep(job.tree, job.options);
      this.onmessage?.({ data: { id: job.id, ok: true, layout } });
    }, job.kind === "draft" ? 0 : 5);
  }
  terminate() { this.terminated = true; }
}

const settings = { showFemales: true, theme: { preset: "classic", v: 2 } } as TreeDTO["settings"];
const family = () => ({ ...QA_FIXTURES.B(), settings }) as TreeDTO;
const optionsOf = (t: TreeDTO) => ({ showFemales: true, ...layoutOptionsFor(resolveTheme(t.settings), "A2") });

/** One request, as the editor makes it, until the poster is final: what was shown, and the progress reported. */
async function layOut(tree: TreeDTO, kept: StoredRecipe[]) {
  FakeWorker.asked = [];
  const shown: { final: boolean; draft: boolean; layout: PosterLayout }[] = [];
  const progress: (SearchProgress | null)[] = [];
  const store: FamilyRecipes = { get: () => kept, save: (r) => kept.splice(0, kept.length, r) };
  await new Promise<void>((done) => {
    const runner = new TwoLayouts(() => new FakeWorker(), (_id, l, _e, final = true, draft = false) => {
      shown.push({ final, draft, layout: l! });
      if (final) done();
    }, undefined, store, undefined, (_id, p) => progress.push(p));
    runner.request({ id: 1, tree, options: optionsOf(tree) });
  });
  return { shown, progress, asked: FakeWorker.asked.map((a) => a.kind) };
}

describe("the wait for the poster never looks frozen", () => {
  it("a draft is asked for before the search's first step, shown first, never final, and the same size as the poster", { timeout: 300_000 }, async () => {
    const { shown, asked } = await layOut(family(), []);
    expect(asked[0]).toBe("draft");
    expect(asked[1]).toBe("step");
    expect(shown[0].draft).toBe(true);
    expect(shown[0].final).toBe(false);
    // (only the search's poster is final: export stays disabled until then)
    expect(shown.filter((s) => s.final)).toHaveLength(1);
    expect(shown.at(-1)).toMatchObject({ final: true, draft: false });
    // (the same page size: swapped in, the poster does not jump in zoom or position)
    expect([shown[0].layout.width, shown[0].layout.height]).toEqual([shown.at(-1)!.layout.width, shown.at(-1)!.layout.height]);
  });

  it("reports each step of the search as it starts, then nothing once the poster is final", { timeout: 300_000 }, async () => {
    const { progress } = await layOut(family(), []);
    const steps = progress.filter((p): p is SearchProgress => !!p).map((p) => p.step);
    expect(steps[0]).toBe(1);
    expect(steps).toEqual(steps.map((_, i) => i + 1));
    expect(progress.at(-1)).toBeNull();
  });

  it("knows how long the family's last search took, and uses its size for the next draft", { timeout: 300_000 }, async () => {
    const kept: StoredRecipe[] = [];
    await layOut(family(), kept);
    expect(kept[0].ms).toBeGreaterThan(0);
    // the family edited: the search runs again, behind the recipe's poster (no draft needed)
    const edited = { ...family(), title: "x" };
    const again = await layOut(edited, kept);
    expect(again.asked).not.toContain("draft");
    expect(again.progress.find((p) => p)?.lastMs).toBe(kept[0].ms ?? -1);
    // another design on the same paper: a draft at the size the last poster came out at
    const other = { ...family(), settings: { ...settings, theme: { preset: "heritage", v: 2 } } } as TreeDTO;
    FakeWorker.asked = [];
    await layOut(other, [...kept]);
    const draft = FakeWorker.asked.find((a) => a.kind === "draft");
    expect(draft && draft.kind === "draft" && draft.scale).toBe(kept[0].recipe.fontScale);
  });

  it("says how far it has got in words, and about how long is left only where that is known", () => {
    const at = 1_000_000;
    expect(progressText({ step: 3, startedAt: at - 83_000 }, at)).toBe("Laying out: step 3 · 1:23 elapsed");
    expect(progressText({ step: 3, startedAt: at - 20_000, lastMs: 200_000 }, at)).toBe("Laying out: step 3 · 20 s elapsed · about 3 min left");
    expect(progressText({ step: 9, startedAt: at - 190_000, lastMs: 200_000 }, at)).toContain("under a minute left");
    expect(progressText({ step: 9, startedAt: at - 260_000, lastMs: 200_000 }, at)).toContain("longer than last time");
    expect(progressText({ step: 9, startedAt: at - 20_000, lastMs: 200_000 }, at)).not.toMatch(/%/);
  });

  it("Export for print is disabled until the poster is final, and says why", () => {
    // (the test runner compiles components for React in scope)
    (globalThis as { React?: typeof React }).React = React;
    const ref = { current: null };
    const waiting = renderToStaticMarkup(createElement(ExportMenu, { svgRef: ref, filename: "f", waiting: true }));
    expect(waiting).toMatch(/<button[^>]*disabled=""[^>]*title="Available when the poster is finished"[^>]*>Export for print/);
    const ready = renderToStaticMarkup(createElement(ExportMenu, { svgRef: ref, filename: "f", waiting: false }));
    expect(ready).not.toMatch(/ disabled=""/);
  });

  it("an export from the menu bar is refused while the poster is not final", async () => {
    const run = vi.fn(async () => {});
    const svg = {} as SVGSVGElement;
    expect(await exportIfReady(false, svg, run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(await exportIfReady(true, svg, run)).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(NOT_READY).toBe("Available when the poster is finished");
  });
});
