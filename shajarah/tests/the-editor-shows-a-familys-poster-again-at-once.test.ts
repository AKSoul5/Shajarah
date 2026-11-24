// The editor keeps each family's last poster's recipe (per settings, also
// in the browser's storage) and, on the next request, makes it again in a
// third worker while the whole search runs: the poster is on screen at
// once, ready to export when it is as good as before, and the search's own
// result replaces it only when it does better.
import { describe, expect, it } from "vitest";
import { computePosterLayout, layoutStep, replayLayout, type PosterLayout } from "@/lib/layout/botanical";
import { TwoLayouts, type LayoutReply, type RecipeStore, type StepRequest, type WorkerLike } from "@/lib/layout/twoLayouts";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

/** A stand-in worker: lays the step out (or replays the recipe) for real, a moment later. */
class FakeWorker implements WorkerLike {
  terminated = false;
  onmessage: ((e: { data: LayoutReply }) => void) | null = null;
  onerror: WorkerLike["onerror"] = null;
  postMessage(job: StepRequest) {
    setTimeout(() => {
      if (this.terminated) return;
      const layout = job.kind === "replay" ? replayLayout(job.tree, job.recipe) : layoutStep(job.tree, job.options);
      this.onmessage?.({ data: { id: job.id, ok: true, layout } });
    }, job.kind === "replay" ? 0 : 5);
  }
  terminate() { this.terminated = true; }
}

const memoryStore = (): RecipeStore => {
  const m = new Map<string, ReturnType<RecipeStore["get"]>>();
  return { get: (k) => m.get(k), set: (k, v) => void m.set(k, v) };
};

const same = (a: object, b: object) => JSON.stringify({ ...a, recipe: undefined }) === JSON.stringify({ ...b, recipe: undefined });

describe("the editor shows a family's poster again at once", () => {
  it("from its recipe, ready to export, the same as the export", { timeout: 300_000 }, async () => {
    const settings = { showFemales: true, theme: { preset: "classic", v: 2, motherNames: true } } as TreeDTO["settings"];
    const tree = { ...QA_FIXTURES.B(), settings } as TreeDTO;
    const options = { showFemales: true, ...layoutOptionsFor(resolveTheme(settings), "A2") };
    const store = memoryStore();
    const shown: { id: number; final: boolean; layout: PosterLayout; draft?: boolean }[] = [];
    let finished: () => void = () => {};
    const runner = new TwoLayouts(() => new FakeWorker(), (id, l, _e, final = true, draft = false) => {
      shown.push({ id, final, layout: l!, draft });
      if (id === 1 && final) finished();
    }, store);
    await new Promise<void>((res) => { finished = res; runner.request({ id: 1, tree, options }); });
    // the first time: no recipe yet, a draft (never final) and the search's poster
    expect(shown.map((s) => [s.id, s.final, s.draft])).toEqual([[1, false, true], [1, true, false]]);
    const exported = computePosterLayout(tree, options);
    expect(same(shown[1].layout, exported)).toBe(true);
    shown.splice(0, shown.length, shown[1]);
    // a second session (the store keeps the recipe): the poster at once
    const again = new TwoLayouts(() => new FakeWorker(), (id, l, _e, final = true) => {
      shown.push({ id, final, layout: l! });
      if (shown.filter((s) => s.id === 2).length >= 2) finished();
    }, store);
    // (the family changed a little since, so the search goes on behind the
    // recipe's poster; unchanged, the recipe's poster is all there is: see
    // an-unchanged-family-opens-without-the-search.test.ts)
    const edited = { ...tree, members: tree.members.map((m, i) => (i === 3 ? { ...m, notes: "a note" } : m)), title: `${tree.title ?? ""} ` };
    const exportedEdited = computePosterLayout(edited, options);
    await new Promise<void>((res) => { finished = res; again.request({ id: 2, tree: edited, options }); });
    const second = shown.filter((s) => s.id === 2);
    expect(second[0].final).toBe(true);
    expect(same(second[0].layout, exportedEdited)).toBe(true);
    expect(same(second[1].layout, exportedEdited)).toBe(true);
  });
});
