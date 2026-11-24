// A family's poster recipes are kept with the family (settings.layoutRecipes),
// not only in the browser's storage: the desktop app opens on a new address
// every time it starts, and storage kept at the old one was never found
// again, so every start ran the whole search (a 340-person family at 2A0:
// 217 s; the same poster from its recipe: 0.65 s).
import { describe, expect, it, vi } from "vitest";

// useLayoutInput is a hook that only keeps one value between renders:
// a stand-in useRef lets the test call it as the editor renders it.
const refs: { current: unknown }[] = [];
let refAt = 0;
vi.mock("react", async (actual) => ({
  ...(await actual<typeof import("react")>()),
  useRef: (init: unknown) => (refs[refAt++] ??= { current: init }),
}));

import { replayLayout, layoutStep, type PosterLayout } from "@/lib/layout/botanical";
import {
  MAX_FAMILY_RECIPES, keepRecipes, mergeRecipes, recipeKey, remapRecipes, sameLayoutInput, withoutRecipes, type StoredRecipe,
} from "@/lib/layout/recipes";
import { TwoLayouts, type FamilyRecipes, type LayoutReply, type StepRequest, type WorkerLike } from "@/lib/layout/twoLayouts";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { makeProjectFile, readProjectFile, withNewIds } from "@/lib/project";
import { exportGedcom } from "@/lib/gedcom";
import { updateTreeSchema } from "@/lib/validation";
import { localRepository } from "@/components/editor/repository";
import { useLayoutInput } from "@/components/editor/useLayoutInput";
import type { TreeDTO } from "@/lib/types";

/** A stand-in worker that lays each step out (or replays a recipe) for real, and counts what it was asked. */
class FakeWorker implements WorkerLike {
  static asked: StepRequest["kind"][] = [];
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
const optionsOf = (t: TreeDTO) => ({ showFemales: true, ...layoutOptionsFor(resolveTheme(t.settings), "A2"), focusId: t.members[3].id });

/** Lays the family out once, as the editor does, until the search's poster; returns every poster shown. */
async function layOut(tree: TreeDTO, familyRecipes: FamilyRecipes, id = 1) {
  const shown: { final: boolean; layout: PosterLayout }[] = [];
  await new Promise<void>((done) => {
    const runner = new TwoLayouts(() => new FakeWorker(), (_id, l, _e, final = true) => {
      shown.push({ final, layout: l! });
      // (the search's poster, or a recipe's poster that needs no search; a
      // replayed one with the search still going behind it: wait)
      if (final && (shown.length > 1 || !FakeWorker.asked.includes("replay") || !FakeWorker.asked.includes("step"))) done();
    }, undefined, familyRecipes);
    runner.request({ id, tree, options: optionsOf(tree) });
  });
  return shown;
}

const sample = (key: string, at: number): StoredRecipe => ({
  key, at, rank: 1, options: {}, recipe: { opts: {}, fontScale: 1, final: true, strict: false, dense: false, budget: { checks: 1 } },
});

describe("a family's poster recipes are kept with the family", () => {
  it("a recipe kept with the family brings its poster back with no browser storage at all", { timeout: 300_000 }, async () => {
    const tree = family();
    const kept: StoredRecipe[] = [];
    const store: FamilyRecipes = { get: () => kept, save: (r) => kept.push(r) };
    // the first time: the search, and the recipe handed to the family to keep
    FakeWorker.asked = [];
    const first = await layOut(tree, store);
    expect(FakeWorker.asked).not.toContain("replay");
    expect(kept).toHaveLength(1);
    expect(kept[0].key).toBe(recipeKey(optionsOf(tree)));
    expect(kept[0].options).toEqual(optionsOf(tree));
    // a new start at a new address (no storage): the family's recipe is made again at once
    FakeWorker.asked = [];
    const again = await layOut(tree, { get: () => kept, save: () => {} }, 2);
    expect(FakeWorker.asked[0]).toBe("replay");
    expect(again[0].final).toBe(true);
    expect(again[0].layout.nodes.map((n) => [n.id, n.x, n.y])).toEqual(first.at(-1)!.layout.nodes.map((n) => [n.id, n.x, n.y]));
  });

  it("saving a recipe is not a change the layout sees: no second layout request", () => {
    const tree = family();
    const render = (t: TreeDTO) => { refAt = 0; return useLayoutInput(t); };
    const input = render(tree);
    // the editor's copy of the family once a recipe is kept with it
    const withRecipe = { ...tree, settings: { ...tree.settings, layoutRecipes: [sample("k", 1)] } };
    expect(sameLayoutInput(tree, withRecipe)).toBe(true);
    expect(render(withRecipe)).toBe(input);
    // (and the layout never sees the recipes at all)
    expect(withoutRecipes(withRecipe).settings).not.toHaveProperty("layoutRecipes");
    // a real change is a new layout
    const renamed = { ...withRecipe, members: withRecipe.members.map((m, i) => (i === 2 ? { ...m, name: `${m.name}x` } : m)) };
    expect(render(renamed)).not.toBe(input);
    const recoloured = { ...withRecipe, settings: { ...withRecipe.settings, showFemales: false } };
    expect(sameLayoutInput(withRecipe, recoloured)).toBe(false);
  });

  it("a recipe saved is no edit: the editor's copy stays as it is, and a settings change or an undo keeps the recipe", async () => {
    const tree = family();
    const repo = localRepository(tree);
    await repo.saveRecipes([sample("a", 2)]);
    // a settings change sent from a copy made before the recipe was kept
    const changed = await repo.updateTree({ settings: { ...tree.settings, showFemales: false } });
    expect(changed.settings?.layoutRecipes?.map((r) => r.key)).toEqual(["a"]);
    // an undo back to that copy
    const undone = await repo.restore(tree);
    expect(undone.settings?.showFemales).toBe(true);
    expect(undone.settings?.layoutRecipes?.map((r) => r.key)).toEqual(["a"]);
    // the server keeps them the same way
    expect(keepRecipes({ layoutRecipes: [sample("a", 2)] }, { showFemales: true }).layoutRecipes?.map((r) => r.key)).toEqual(["a"]);
  });

  it("keeps the newest recipe of each poster, and at most a dozen", () => {
    const many = Array.from({ length: 20 }, (_, i) => sample(`k${i}`, i));
    const merged = mergeRecipes(many, [sample("k19", 1)]);
    expect(merged).toHaveLength(MAX_FAMILY_RECIPES);
    expect(merged[0]).toMatchObject({ key: "k19", at: 19 });
    expect(merged.map((r) => r.at)).toEqual([...merged.map((r) => r.at)].sort((a, b) => b - a));
    // and the settings schema takes them, but no more than the cap
    expect(updateTreeSchema.safeParse({ settings: { layoutRecipes: merged } }).success).toBe(true);
    expect(updateTreeSchema.safeParse({ settings: { layoutRecipes: many } }).success).toBe(false);
  });

  it("travels in the project file and is found again in the family opened as a new one", () => {
    const tree = family();
    const options = optionsOf(tree);
    const recipe = { ...sample(recipeKey(options), 5), options, recipe: { ...sample("x", 0).recipe, opts: options } };
    const saved = { ...tree, settings: { ...tree.settings, layoutRecipes: [recipe] } };
    const file = readProjectFile(JSON.stringify(makeProjectFile(saved)));
    expect(file.tree.settings?.layoutRecipes).toHaveLength(1);
    let n = 0;
    const opened = withNewIds(file.tree, () => `new-${n++}`);
    const ids = new Map(tree.members.map((m, i) => [m.id, opened.members[i].id]));
    const reopened = { ...opened, id: "opened" } as TreeDTO;
    const kept = opened.settings!.layoutRecipes![0];
    // the options the editor asks for in the family opened find the recipe
    expect(kept.key).toBe(recipeKey(optionsOf(reopened)));
    expect(kept.options.focusId).toBe(ids.get(tree.members[3].id));
    expect(kept.recipe.opts.focusId).toBe(ids.get(tree.members[3].id));
    // (an id that is not a member's is left as it is)
    expect(remapRecipes([{ ...recipe, options: { ...options, focusId: "nobody" } }], ids)[0].options.focusId).toBe("nobody");
  });

  it("GEDCOM leaves it out", () => {
    const tree = { ...family(), settings: { ...settings, layoutRecipes: [sample("gedcom-recipe-key", 1)] } };
    expect(exportGedcom(tree)).not.toContain("gedcom-recipe-key");
  });
});
