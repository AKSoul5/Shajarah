// Lays the poster out off the page's main thread: a large family takes
// seconds, and the editor must stay usable meanwhile.

import { computePosterLayout, type LayoutOptions } from "@/lib/layout/botanical";
import type { TreeDTO } from "@/lib/types";

type Request = { id: number; tree: TreeDTO; options: LayoutOptions };

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, tree, options } = e.data;
  try {
    self.postMessage({ id, ok: true, layout: computePosterLayout(tree, options) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
