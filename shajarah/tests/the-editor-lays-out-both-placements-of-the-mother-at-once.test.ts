// Where the centred son's mother may stand upright, each step of the layout
// is laid out both with her upright and with her placed as any other wife,
// and the better is kept (pickUpright). computePosterLayout makes the two
// one after the other, which took up to twice as long; the editor now makes
// them in two workers at once (TwoLayouts). Its poster must be exactly the
// one that is exported, the second worker must start at once only where
// wives are drawn on the branch, and requests made meanwhile still fold
// into one.
import { describe, expect, it } from "vitest";
import { computePosterLayout, layoutStep, uprightNeedsPlain, type LayoutOptions } from "@/lib/layout/botanical";
import { TwoLayouts, type LayoutJob, type LayoutReply, type StepRequest, type WorkerLike } from "@/lib/layout/twoLayouts";
import { AR, Builder, QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";
import { knownIt } from "./known-failures";

/** A stand-in worker: lays the step out for real, a moment later. */
class FakeWorker implements WorkerLike {
  static made: FakeWorker[] = [];
  posted: (StepRequest & { kind: "step" })[] = [];
  terminated = false;
  onmessage: ((e: { data: LayoutReply }) => void) | null = null;
  onerror: WorkerLike["onerror"] = null;
  constructor() { FakeWorker.made.push(this); }
  postMessage(job: StepRequest) {
    if (job.kind !== "step") return;
    this.posted.push(job);
    setTimeout(() => {
      if (this.terminated) return;
      this.onmessage?.({ data: { id: job.id, ok: true, layout: layoutStep(job.tree, job.options) } });
    }, 0);
  }
  terminate() { this.terminated = true; }
}

/** A founder with two wives; the second bore the centred son (invented names). */
function twoWives(): TreeDTO {
  const b = new Builder("parallel", AR);
  const top = b.trunk(5);
  const head = b.person("MALE", { father: top });
  const first = b.person("FEMALE"), second = b.person("FEMALE");
  b.marry(head, first);
  b.marry(head, second);
  let order = 0;
  for (let i = 0; i < 3; i++) b.person("MALE", { father: head, mother: first, order: order++ });
  for (let i = 0; i < 4; i++) b.person("MALE", { father: head, order: order++ });
  for (let i = 0; i < 5; i++) {
    const s = b.person(i % 2 ? "FEMALE" : "MALE", { father: head, mother: second, order: order++ });
    if (i === 2) for (let j = 0; j < 3; j++) b.person("MALE", { father: s, order: j });
  }
  const centred = b.person("MALE", { father: head, mother: second, order: order++ });
  for (let i = 0; i < 4; i++) {
    const g = b.person("MALE", { father: centred, order: i });
    for (let j = 0; j < 3; j++) b.person("MALE", { father: g, order: j });
  }
  return { ...b.tree("parallel", head), settings: { showFemales: true, theme: { preset: "classic", v: 2, motherNames: true } } } as TreeDTO;
}

const optionsOf = (tree: TreeDTO, paper: "A3" | "A1"): LayoutOptions => ({ ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });

const run = (jobs: LayoutJob[]) => new Promise<{ id: number; json: string }[]>((resolve) => {
  const got: { id: number; json: string }[] = [];
  const runner = new TwoLayouts(() => new FakeWorker(), (id, l) => {
    got.push({ id, json: JSON.stringify(l) });
    if (id === jobs[jobs.length - 1].id) resolve(got);
  });
  for (const j of jobs) runner.request(j);
});

describe("the editor lays out both placements of the mother at once", () => {
  knownIt("editor both started")("shows exactly the poster that is exported, both started together", { timeout: 300_000 }, async () => {
    FakeWorker.made = [];
    const tree = twoWives();
    const options = optionsOf(tree, "A3");
    // (a poster whose first step needs the comparison: names below full
    // size with her upright)
    expect(uprightNeedsPlain(layoutStep(tree, options))).toBe(true);
    const [only] = await run([{ id: 1, tree, options }]);
    expect(only.json).toBe(JSON.stringify(computePosterLayout(tree, options)));
    expect(FakeWorker.made.length).toBeGreaterThanOrEqual(2);
    expect(FakeWorker.made[0].posted[0].options.uprightOff).toBeUndefined();
    expect(FakeWorker.made[1].posted[0].options.uprightOff).toBe(true);
  });

  knownIt("editor mixed steps")("comes to the same poster where the steps mix the two placements", { timeout: 600_000 }, async () => {
    // (the layout QA's complex family, everything shown, Modern mono, A2,
    // rectangular names: its first step keeps her placed as any other wife,
    // and the retry with more room for the wives' boxes then keeps her
    // upright, with larger names, 8.19 mm against 7.20)
    const base = QA_FIXTURES.B();
    const through = base.members.filter((m) => m.gender === "FEMALE" && m.fatherId && base.members.some((c) => c.motherId === m.id)).map((m) => m.id);
    const settings = { posterSize: "A2", showFemales: true, familiesThrough: through, theme: { preset: "mono", v: 2, motherNames: true, nodeShape: "rect" } } as unknown as TreeDTO["settings"];
    const tree = { ...base, settings };
    const options = layoutOptionsFor(resolveTheme(settings), "A2");
    const [only] = await run([{ id: 1, tree, options }]);
    const exported = computePosterLayout(tree, options);
    expect(exported.legibility.smallestTextMm).toBeGreaterThan(8);
    expect(only.json).toBe(JSON.stringify(exported));
  });

  it("uses one worker where no wives are drawn on the branch", { timeout: 300_000 }, async () => {
    FakeWorker.made = [];
    const tree = twoWives();
    const options = { ...optionsOf(tree, "A1"), motherNames: false };
    const [only] = await run([{ id: 1, tree, options }]);
    expect(only.json).toBe(JSON.stringify(computePosterLayout(tree, options)));
    expect(FakeWorker.made.length).toBe(1);
  });

  it("gives up older requests for the newest", { timeout: 300_000 }, async () => {
    FakeWorker.made = [];
    const tree = twoWives();
    const options = optionsOf(tree, "A1");
    const got = await run([1, 2, 3].map((id) => ({ id, tree, options })));
    expect(got.map((g) => g.id)).toEqual([3]);
  });
});
