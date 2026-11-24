// A family whose poster was made by this layout engine from the same people,
// marriages and settings opens with that poster at once, final and ready to
// export, and the whole search is not run at all (a private 340-person
// family at 2A0: 217 s of search for the poster its recipe makes in 0.65 s).
// Any change to what the poster is made from, or a new layout engine, runs
// the search behind the replayed poster, as before.
import { describe, expect, it } from "vitest";
import { LAYOUT_ENGINE_VERSION, layoutStep, replayLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutInputs, type StoredRecipe } from "@/lib/layout/recipes";
import { TwoLayouts, type FamilyRecipes, type LayoutReply, type StepRequest, type WorkerLike } from "@/lib/layout/twoLayouts";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { makeProjectFile, readProjectFile, withNewIds } from "@/lib/project";
import type { TreeDTO } from "@/lib/types";

/** A stand-in worker that lays each step out (or replays a recipe) for real, and records what it was asked. */
class FakeWorker implements WorkerLike {
  static asked: StepRequest["kind"][] = [];
  static made = 0;
  constructor() { FakeWorker.made++; }
  terminated = false;
  onmessage: ((e: { data: LayoutReply }) => void) | null = null;
  onerror: WorkerLike["onerror"] = null;
  postMessage(job: StepRequest) {
    FakeWorker.asked.push(job.kind);
    setTimeout(() => {
      if (this.terminated) return;
      const layout = job.kind === "replay" ? replayLayout(job.tree, job.recipe) : layoutStep(job.tree, job.options);
      this.onmessage?.({ data: { id: job.id, ok: true, layout } });
    }, 0);
  }
  terminate() { this.terminated = true; }
}

const settings = { showFemales: true, theme: { preset: "classic", v: 2 } } as TreeDTO["settings"];
const family = () => ({ ...QA_FIXTURES.A(), settings }) as TreeDTO;
const optionsOf = (t: TreeDTO) => ({ showFemales: true, ...layoutOptionsFor(resolveTheme(t.settings), "A2") });

/**
 * One request, as the editor makes it, until the poster is final (or the
 * search has finished): every poster shown, whether it was final (the
 * editor's `pending` is its opposite) and what the workers were asked.
 */
async function open(tree: TreeDTO, kept: StoredRecipe[], engine = LAYOUT_ENGINE_VERSION) {
  FakeWorker.asked = [];
  FakeWorker.made = 0;
  const shown: { final: boolean; layout: PosterLayout }[] = [];
  const store: FamilyRecipes = { get: () => kept, save: (r) => kept.splice(0, kept.length, r) };
  await new Promise<void>((done) => {
    const runner = new TwoLayouts(() => new FakeWorker(), (_id, l, _e, final = true) => {
      shown.push({ final, layout: l! });
      // (final with no search started, or the search's own poster)
      if (final && (!FakeWorker.asked.includes("step") || shown.length > 1 || !FakeWorker.asked.includes("replay"))) done();
    }, undefined, store, engine);
    runner.request({ id: 1, tree, options: optionsOf(tree) });
  });
  // (a moment for anything still running to show itself)
  await new Promise((r) => setTimeout(r, 50));
  return { shown, asked: [...FakeWorker.asked], workers: FakeWorker.made };
}

const positions = (l: PosterLayout) => l.nodes.map((n) => [n.id, Math.round(n.x * 100), Math.round(n.y * 100)]);

describe("an unchanged family opens without the search", () => {
  it("opens with its recipe's poster, final at once, with no search step at all", { timeout: 300_000 }, async () => {
    const tree = family();
    const kept: StoredRecipe[] = [];
    const first = await open(tree, kept);
    expect(first.asked).toContain("step");
    expect(kept[0].inputs).toBe(layoutInputs(tree, optionsOf(tree), LAYOUT_ENGINE_VERSION));
    // the family opened again, unchanged
    const again = await open(tree, kept);
    expect(again.asked).toEqual(["replay"]);
    // (the search's workers are not even started)
    expect(again.workers).toBe(1);
    expect(again.shown).toHaveLength(1);
    expect(again.shown[0].final).toBe(true); // pending = false
    expect(positions(again.shown[0].layout)).toEqual(positions(first.shown.at(-1)!.layout));
  });

  it("runs the search after one name is edited, behind the replayed poster", { timeout: 300_000 }, async () => {
    const tree = family();
    const kept: StoredRecipe[] = [];
    await open(tree, kept);
    const edited = { ...tree, members: tree.members.map((m, i) => (i === 5 ? { ...m, name: `${m.name}ة` } : m)) };
    const after = await open(edited, kept);
    expect(after.asked[0]).toBe("replay");
    expect(after.asked).toContain("step");
    expect(after.shown.length).toBeGreaterThanOrEqual(2);
  });

  it("runs the search when the layout engine has changed since the recipe was made", { timeout: 300_000 }, async () => {
    const tree = family();
    const kept: StoredRecipe[] = [];
    await open(tree, kept, LAYOUT_ENGINE_VERSION - 1);
    expect(kept[0].inputs).not.toBe(layoutInputs(tree, optionsOf(tree), LAYOUT_ENGINE_VERSION));
    const after = await open(tree, kept);
    expect(after.asked[0]).toBe("replay");
    expect(after.asked).toContain("step");
  });

  it("reads every part a poster is made from, and nothing else", () => {
    const tree = family();
    const o = optionsOf(tree);
    const base = layoutInputs(tree, o, 1);
    const changes: [string, TreeDTO][] = [
      ["a name", { ...tree, members: tree.members.map((m, i) => (i === 1 ? { ...m, name: "x" } : m)) }],
      ["a father", { ...tree, members: tree.members.map((m, i) => (i === 4 ? { ...m, fatherId: tree.members[1].id } : m)) }],
      ["a marriage", { ...tree, marriages: [...tree.marriages, { id: "m-new", spouseAId: tree.members[1].id, spouseBId: tree.members[2].id, startYear: null, endYear: null }] }],
      ["the trunk's start", { ...tree, trunkStartId: tree.members[2].id }],
      ["a hidden person", { ...tree, settings: { ...tree.settings, hiddenIds: [tree.members[3].id] } }],
      ["the seed", { ...tree, settings: { ...tree.settings, seed: 99 } }],
    ];
    for (const [what, t] of changes) expect(layoutInputs(t, o, 1), what).not.toBe(base);
    expect(layoutInputs(tree, { ...o, paperWidthMm: 841 }, 1), "the paper").not.toBe(base);
    expect(layoutInputs(tree, o, 2), "the engine").not.toBe(base);
    // (not: a note, the recipes kept, the order the database returns people in)
    const same: TreeDTO[] = [
      { ...tree, members: tree.members.map((m, i) => (i === 1 ? { ...m, notes: "a note" } : m)) },
      { ...tree, settings: { ...tree.settings, layoutRecipes: [] } },
      { ...tree, members: [...tree.members].reverse(), marriages: [...tree.marriages].reverse() },
    ];
    for (const t of same) expect(layoutInputs(t, o, 1)).toBe(base);
  });

  it("a family opened from its project file opens without the search too", () => {
    const tree = family();
    const options = optionsOf(tree);
    const inputs = layoutInputs(tree, options, LAYOUT_ENGINE_VERSION);
    const recipe: StoredRecipe = {
      key: "k", at: 1, rank: 1, options, inputs,
      recipe: { opts: options, fontScale: 1, final: true, strict: false, dense: false, budget: { checks: 1 } },
    };
    const file = readProjectFile(JSON.stringify(makeProjectFile({ ...tree, settings: { ...tree.settings, layoutRecipes: [recipe] } })));
    let n = 0;
    const opened = withNewIds(file.tree, () => `new-${n++}`);
    const kept = opened.settings!.layoutRecipes![0];
    expect(kept.inputs).toBe(layoutInputs(opened, kept.options, LAYOUT_ENGINE_VERSION));
    // (a recipe already out of date stays out of date)
    const stale = withNewIds({ ...file.tree, settings: { ...file.tree.settings, layoutRecipes: [{ ...recipe, inputs: "old" }] } }, () => `new-${n++}`);
    expect(stale.settings!.layoutRecipes![0].inputs).toBeUndefined();
  });
});
