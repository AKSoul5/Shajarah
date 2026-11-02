// Lays the poster out off the page's main thread: a large family takes
// seconds, and the editor must stay usable meanwhile. Also finds the
// smallest paper on which the family is clear (useReadablePaper), which
// lays it out once per size tried.

import { computePosterLayout, type LayoutOptions } from "@/lib/layout/botanical";
import { smallestClearPaper } from "@/lib/layout/branches";
import type { PaperSize } from "@/lib/paper";
import type { TreeDTO } from "@/lib/types";

type Request =
  | { id: number; kind?: "layout"; tree: TreeDTO; options: LayoutOptions }
  | { id: number; kind: "paper"; tree: TreeDTO; papers: { paper: PaperSize; options: LayoutOptions }[] };

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data;
  try {
    if (req.kind === "paper") {
      const byPaper = new Map(req.papers.map((p) => [p.paper, p.options]));
      const paper = req.papers.length
        ? smallestClearPaper((p) => computePosterLayout(req.tree, byPaper.get(p)!), req.papers[0].paper)
        : null;
      self.postMessage({ id: req.id, ok: true, paper });
    } else {
      self.postMessage({ id: req.id, ok: true, layout: computePosterLayout(req.tree, req.options) });
    }
  } catch (err) {
    self.postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
