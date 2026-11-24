// The editor's poster laid out step by step in two workers. Each step of the
// layout (posterSteps) is laid out with the centred son's mother standing
// straight above her husband and, where that may not be the better poster,
// with her placed as any other wife; the better is kept (pickUpright), as
// computePosterLayout does, so the editor shows the same poster that is
// exported. computePosterLayout lays the two out one after the other, which
// took up to twice as long; here they are laid out side by side, and the
// second costs no waiting on a computer with two cores or more.
//
// Before all that, the family's last poster's recipe (how it was made, see
// replayLayout) is made again in a third worker: one attempt, a fraction of
// a second where the whole search takes up to minutes (a 340-person family:
// 0.4 s against 104 s, the same poster). After a small change it is most
// often as clean and legible as before, and is shown, ready to export, at
// once; the whole search goes on behind it and replaces it only when it
// does better. When nothing has changed since that poster was made (the
// same family, settings and layout engine: recipes.ts, layoutInputs), the
// replayed poster is the poster: it is final, and the search is not run
// at all (unless the replay came out worse, which it cannot unless the
// fingerprint misses a change).

import {
  LAYOUT_ENGINE_VERSION, computePosterLayout, draftLayout, pickUpright, posterSteps, replayLayout, uprightNeedsPlain,
  type LayoutOptions, type LayoutRecipe, type PosterLayout, type PosterSteps,
} from "./botanical";
import type { TreeDTO } from "@/lib/types";
import { findRecipe, fingerprint, lastScale, lastSearchMs, layoutInputs, recipeKey, type StoredRecipe } from "./recipes";

export type LayoutJob = { id: number; tree: TreeDTO; options: LayoutOptions };
export type StepRequest =
  | { id: number; kind: "step"; tree: TreeDTO; options: LayoutOptions }
  | { id: number; kind: "replay"; tree: TreeDTO; recipe: LayoutRecipe }
  | { id: number; kind: "draft"; tree: TreeDTO; options: LayoutOptions; scale?: number };

/**
 * How far the search has got, for the editor to show while it runs: the
 * step it is on (posterSteps), when it started, and how long the family's
 * last search on this paper took, where known. No percentage: how many
 * steps a search takes is not known in advance.
 */
export type SearchProgress = { step: number; startedAt: number; lastMs?: number };

/** Where recipes are kept between sessions (the editor: the browser's storage, a fallback to the family's own). */
export interface RecipeStore {
  get(key: string): KnownRecipe | undefined;
  set(key: string, value: KnownRecipe): void;
}

/** A poster's recipe, how good the poster was, and what it was made from (see recipes.ts, layoutInputs). */
export type KnownRecipe = { recipe: LayoutRecipe; rank: number; inputs?: string; ms?: number };

/**
 * The recipes kept with the family itself (its settings' layoutRecipes,
 * see recipes.ts): read first, and given each new one to keep.
 */
export interface FamilyRecipes {
  get(): readonly StoredRecipe[] | undefined;
  save(recipe: StoredRecipe): void;
}

export { fingerprint };

/** How good a poster is, for comparing two: clean first, then legible, then the larger names. */
export function posterRank(l: PosterLayout): number {
  const clean = l.overlaps === 0 && l.clarity.ok;
  return (clean ? 2e6 : 0) + (l.legibility.ok ? 1e6 : 0) - Math.min(999, l.overlaps * 10 + l.clarity.issues.length) * 100 + Math.min(99, l.legibility.smallestTextMm);
}
export type LayoutReply = { id: number; ok: boolean; layout?: PosterLayout; error?: string };

/** What a worker must offer (a Web Worker does; tests pass a stand-in). */
export interface WorkerLike {
  postMessage(msg: StepRequest): void;
  terminate(): void;
  onmessage: ((e: { data: LayoutReply }) => void) | null;
  onerror: ((e: { message?: string; preventDefault?: () => void }) => void) | null;
}

/**
 * Whether the second placement is worth laying out at once, before the
 * first says it is needed: where wives are drawn on the branch and the
 * canopy base's largest branch (the centred son's, most likely) has his
 * mother recorded as the base's wife; her box is what stands upright.
 * Started "just in case" on every poster with wives shown, it made one
 * with no such mother 16% slower (2.77 s against 2.38). (A guess, where
 * the layout centres no son at all: after a family's first poster,
 * whether one of its mothers stood upright is remembered instead.)
 */
export function mayStandUpright(tree: TreeDTO, options: LayoutOptions): boolean {
  if (!options.motherNames || !tree.marriages?.length) return false;
  const kids = new Map<string, string[]>();
  for (const m of tree.members) if (m.fatherId) kids.set(m.fatherId, [...(kids.get(m.fatherId) ?? []), m.id]);
  const size = new Map<string, number>();
  const count = (id: string): number => {
    const known = size.get(id);
    if (known !== undefined) return known;
    size.set(id, 0);
    let n = 1;
    for (const k of kids.get(id) ?? []) n += count(k);
    size.set(id, n);
    return n;
  };
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const baseId = tree.crownBaseId ?? tree.members.filter((m) => !m.fatherId).sort((a, b) => count(b.id) - count(a.id))[0]?.id;
  const sons = (baseId && kids.get(baseId)) || [];
  if (!sons.length) return false;
  const centred = byId.get([...sons].sort((a, b) => count(b) - count(a))[0]);
  const mother = centred?.motherId;
  return !!mother && tree.marriages.some((m) => (m.spouseAId === baseId && m.spouseBId === mother) || (m.spouseBId === baseId && m.spouseAId === mother));
}

type Step = { options: LayoutOptions; a?: PosterLayout; b?: PosterLayout; bSent: boolean };
type Running = LayoutJob & {
  steps: PosterSteps; step: Step; seq: number; speculate: boolean; sawUpright: boolean; key: string; quick?: PosterLayout; replaySeq?: number;
  /** What the poster is made from (layoutInputs). */
  inputs: string;
  /** The search's first step, kept while it waits on a trusted replay (see next). */
  first?: IteratorResult<LayoutOptions, PosterLayout>;
  /** The replayed recipe is from the same family, settings and engine: its poster is final, and the search only runs if it is worse. */
  trusted?: KnownRecipe;
  /** The draft's message, while one is being made (see next). */
  draftSeq?: number;
  /** When the search started (ms), and the step it is on. */
  startedAt?: number;
  stepNo: number;
  /** How long the family's last search on this paper took, if known. */
  lastMs?: number;
};

/**
 * Lays out one request at a time: the newest request counts, and requests
 * made meanwhile are folded into a single next one. `done` gets each
 * finished poster (or the error). Without workers (none could be made),
 * the poster is laid out on the page.
 */
export class TwoLayouts {
  private a: WorkerLike | null = null;
  private b: WorkerLike | null = null;
  private r: WorkerLike | null = null;
  /** Each family's last poster's recipe on these settings, and how good that poster was. */
  private recipes = new Map<string, KnownRecipe>();
  private running: Running | null = null;
  private waiting: LayoutJob | null = null;
  private failed = false;
  /** Each message's number, so a reply to an abandoned step is not taken for the current one's. */
  private seq = 0;
  /** Whether each family's last poster stood a mother upright (edits rarely change it). */
  private upright = new Map<string, boolean>();

  constructor(
    private readonly make: () => WorkerLike,
    /**
     * `final`: the poster may be exported (a replayed one as good as before,
     * or the search's own). `draft`: a quick draft, shown only until the
     * poster comes (never final).
     */
    private readonly done: (id: number, layout: PosterLayout | null, error?: string, final?: boolean, draft?: boolean) => void,
    private readonly store?: RecipeStore,
    private readonly family?: FamilyRecipes,
    /** The layout engine's version (see LAYOUT_ENGINE_VERSION; a test passes another). */
    private readonly engine = LAYOUT_ENGINE_VERSION,
    /** Told of each step of the search as it starts, and `null` once the poster is final. */
    private readonly progress?: (id: number, p: SearchProgress | null) => void,
  ) {}

  /** The newest request starts at once: a search still going for an older one is given up. */
  request(job: LayoutJob) {
    this.waiting = job;
    if (this.running) {
      this.a?.terminate();
      this.b?.terminate();
      this.r?.terminate();
      this.a = this.b = this.r = null;
      this.running = null;
    }
    this.next();
  }

  dispose() {
    this.a?.terminate();
    this.b?.terminate();
    this.r?.terminate();
    this.a = this.b = this.r = null;
    this.running = this.waiting = null;
  }

  private recipeKey(job: LayoutJob) {
    return `${job.tree.id}:${recipeKey(job.options)}`;
  }

  /**
   * The last poster's recipe for this request: this session's, else the
   * one kept with the family, else the browser's (the family's is found
   * wherever it is opened; the browser's only at the same address).
   */
  private known(run: { key: string; options: LayoutOptions }) {
    return this.recipes.get(run.key) ?? this.fromFamily(run.options) ?? this.store?.get(run.key);
  }

  private familyLastMs(options: LayoutOptions) {
    try {
      return lastSearchMs(this.family?.get(), options);
    } catch {
      return undefined;
    }
  }

  private familyScale(options: LayoutOptions) {
    try {
      return lastScale(this.family?.get(), options);
    } catch {
      return undefined;
    }
  }

  private fromFamily(options: LayoutOptions) {
    try {
      return findRecipe(this.family?.get(), recipeKey(options));
    } catch {
      return undefined;
    }
  }

  private worker(which: "a" | "b" | "r"): WorkerLike | null {
    if (this.failed) return null;
    const have = which === "a" ? this.a : which === "b" ? this.b : this.r;
    if (have) return have;
    let w: WorkerLike;
    try {
      w = this.make();
    } catch {
      this.failed = true;
      return null;
    }
    w.onmessage = (e) => (which === "r" ? this.replayed(e.data) : this.reply(which, e.data));
    w.onerror = (e) => {
      e.preventDefault?.();
      // (one given up for a newer request can fail while it was still
      // loading: that says nothing about whether workers can run here)
      if (w !== this.a && w !== this.b && w !== this.r) return;
      // (a worker that cannot run: the page lays the poster out instead)
      console.error("Layout worker failed; laying out on the page:", e.message);
      this.failed = true;
      const job = this.running;
      this.a?.terminate();
      this.b?.terminate();
      this.r?.terminate();
      this.a = this.b = this.r = null;
      this.running = null;
      if (job && !this.waiting) this.waiting = { id: job.id, tree: job.tree, options: job.options };
      this.next();
    };
    if (which === "a") this.a = w;
    else if (which === "b") this.b = w;
    else this.r = w;
    return w;
  }

  private next() {
    const job = this.waiting;
    if (!job) return;
    this.waiting = null;
    const key = this.recipeKey(job);
    const inputs = layoutInputs(job.tree, job.options, this.engine);
    const known = this.known({ key, options: job.options });
    // (an unchanged family needs only its recipe's poster: one worker, and
    // the search's is not started, so it does not load alongside it)
    const trusted = !!known && known.inputs === inputs;
    if (!this.worker(trusted ? "r" : "a")) {
      // (on the page: an unchanged family's recipe is its poster, as in the workers)
      const again = trusted ? replayLayout(job.tree, known!.recipe) : null;
      this.done(job.id, again && posterRank(again) >= known!.rank ? again : computePosterLayout(job.tree, job.options));
      this.next();
      return;
    }
    const steps = posterSteps(job.options);
    const first = steps.next();
    const ukey = `${job.tree.id}:${!!job.options.motherNames}`;
    const speculate = this.upright.get(ukey) ?? mayStandUpright(job.tree, job.options);
    const run: Running = { ...job, steps, step: { options: {}, bSent: false }, seq: 0, speculate, sawUpright: false, key, inputs, stepNo: 0 };
    this.running = run;
    run.lastMs = known?.ms ?? this.familyLastMs(job.options);
    // No recipe for this poster yet: a quick draft of it first, in the
    // third worker, shown within about a second while the search runs (at
    // the size the family's last poster on this paper came out at). It is
    // asked for before the search's first step.
    const wd = !known && !first.done && this.worker("r");
    if (wd) {
      run.draftSeq = ++this.seq;
      wd.postMessage({ id: run.draftSeq, kind: "draft", tree: job.tree, options: job.options, scale: this.familyScale(job.options) });
    }
    // (the last poster's recipe made again, at once, while the search runs)
    const wr = known && this.worker("r");
    if (known && wr) {
      run.replaySeq = ++this.seq;
      wr.postMessage({ id: run.replaySeq, kind: "replay", tree: job.tree, recipe: known.recipe });
      // Nothing changed since that poster was made (the same family,
      // settings and layout engine): it is the poster, and the search is
      // not started at all (it waits, in case the replay comes out worse).
      if (trusted) {
        run.trusted = known;
        run.first = first;
        return;
      }
    }
    this.begin(run, first);
  }

  /** The search, from its first step. */
  private begin(run: Running, first: IteratorResult<LayoutOptions, PosterLayout>) {
    // (no worker for the search: laid out on the page)
    if (!first.done && !this.worker("a")) {
      this.running = null;
      this.done(run.id, computePosterLayout(run.tree, run.options));
      this.next();
      return;
    }
    run.startedAt = Date.now();
    if (first.done) this.finish(first.value);
    else this.start(run, first.value);
  }

  private start(run: Running, options: LayoutOptions) {
    run.step = { options, bSent: false };
    run.stepNo++;
    this.progress?.(run.id, { step: run.stepNo, startedAt: run.startedAt ?? Date.now(), lastMs: run.lastMs });
    run.seq = ++this.seq;
    this.worker("a")!.postMessage({ id: run.seq, kind: "step", tree: run.tree, options });
    if (run.speculate) this.sendB(run);
  }

  private sendB(run: Running) {
    const wb = this.worker("b");
    if (!wb) return false;
    run.step.bSent = true;
    wb.postMessage({ id: run.seq, kind: "step", tree: run.tree, options: { ...run.step.options, uprightOff: true } });
    return true;
  }

  /** The second worker stopped (its layout no longer needed), to free its core for the next step. */
  private dropB() {
    this.b?.terminate();
    this.b = null;
  }

  /** The replayed recipe: shown at once; ready to export when it is as good as the poster it was made from. */
  private replayed(r: LayoutReply) {
    const run = this.running;
    if (run && r.id === run.draftSeq) {
      run.draftSeq = undefined;
      // (shown only while nothing better is: a failed draft is no loss)
      if (r.ok && r.layout) this.done(run.id, r.layout, undefined, false, true);
      return;
    }
    if (!run || r.id !== run.replaySeq) return;
    const trusted = run.trusted;
    if (trusted) {
      run.trusted = undefined;
      // (the same poster as before: final, ready to export, and no search)
      if (r.ok && r.layout && posterRank(r.layout) >= trusted.rank) {
        this.running = null;
        this.progress?.(run.id, null);
        this.done(run.id, r.layout, undefined, true);
        this.next();
        return;
      }
      // (worse than before after all, or failed: the search after all)
      const first = run.first!;
      run.first = undefined;
      this.begin(run, first);
    }
    if (!r.ok || !r.layout) return;
    run.quick = r.layout;
    const before = this.known(run);
    this.done(run.id, r.layout, undefined, !!before && posterRank(r.layout) >= Math.floor(before.rank / 1e6) * 1e6);
  }

  private reply(which: "a" | "b", r: LayoutReply) {
    const run = this.running;
    if (!run || r.id !== run.seq) return;
    const step = run.step;
    if (!r.ok) {
      if (which === "b") {
        // (the comparison failed: the upright layout, as laid out alone)
        step.bSent = false;
        if (step.a) this.advance(run, step.a);
        else step.b = undefined;
        return;
      }
      if (step.bSent && !step.b) this.dropB();
      this.running = null;
      this.done(run.id, null, r.error);
      this.next();
      return;
    }
    if (which === "a") step.a = r.layout!;
    else step.b = r.layout!;
    const a = step.a;
    if (!a) return;
    if (a.uprightUsed) run.sawUpright = true;
    if (!uprightNeedsPlain(a)) {
      if (step.bSent && !step.b) this.dropB();
      // (no mother stands upright on this poster: no use laying her out twice)
      if (!a.uprightUsed) run.speculate = false;
      this.advance(run, a);
      return;
    }
    if (step.b) this.advance(run, pickUpright(a, step.b));
    else if (!step.bSent && !this.sendB(run)) this.advance(run, a);
  }

  private advance(run: Running, layout: PosterLayout) {
    const r = run.steps.next(layout);
    if (r.done) this.finish(r.value);
    else this.start(run, r.value);
  }

  private finish(layout: PosterLayout) {
    const run = this.running!;
    this.running = null;
    this.r?.terminate();
    this.r = null;
    this.upright.set(`${run.tree.id}:${!!run.options.motherNames}`, run.sawUpright);
    // (the better of the search's poster and the replayed one, which after
    // a small change can be the better)
    const best = run.quick && posterRank(run.quick) > posterRank(layout) ? run.quick : layout;
    if (best.recipe) {
      const ms = run.startedAt ? Date.now() - run.startedAt : undefined;
      const entry = { recipe: best.recipe, rank: posterRank(best), inputs: run.inputs, ms };
      this.recipes.set(run.key, entry);
      try { this.store?.set(run.key, entry); } catch { /* storage full or blocked: kept for this session */ }
      // (and with the family, so it is found wherever the family is opened)
      try {
        this.family?.save({ key: recipeKey(run.options), recipe: best.recipe, rank: entry.rank, options: run.options, at: Date.now(), inputs: run.inputs, ...(ms !== undefined ? { ms } : {}) });
      } catch { /* not kept: the next time the search runs again */ }
    }
    this.progress?.(run.id, null);
    this.done(run.id, best, undefined, true);
    this.next();
  }
}
