"use client";

import { useEffect, useRef, useState } from "react";
import type { LayoutOptions, PosterLayout } from "@/lib/layout/botanical";
import { TwoLayouts, type RecipeStore, type WorkerLike } from "@/lib/layout/twoLayouts";
import type { TreeDTO } from "@/lib/types";

/** Recipes kept in the browser's storage, so a family reopened is laid out at once (see TwoLayouts). */
const browserRecipes: RecipeStore = {
  get(key) {
    try {
      const v = localStorage.getItem(`shajarah.recipe.v1.${key}`);
      return v ? JSON.parse(v) : undefined;
    } catch {
      return undefined;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`shajarah.recipe.v1.${key}`, JSON.stringify(value));
    } catch {
      // (storage full or blocked: the recipe is kept for this session only)
    }
  },
};

/**
 * The poster's layout, computed in workers (layout.worker.ts) so the editor
 * never freezes while a large family is laid out. The last layout stays on
 * screen until the next one is ready (`pending` meanwhile); `null` only
 * before the first. Only the newest request counts: changes made while one
 * is being laid out replace it: the newest starts at once.
 * Where the centred son's mother may stand upright, the two ways of placing
 * her are laid out side by side in two workers (see TwoLayouts).
 * (Where a worker cannot run, it is laid out on the page, as before.)
 */
export function usePosterLayout(tree: TreeDTO, options: LayoutOptions): { layout: PosterLayout | null; pending: boolean } {
  const [layout, setLayout] = useState<PosterLayout | null>(null);
  const [pending, setPending] = useState(true);
  const runner = useRef<TwoLayouts | null>(null);
  const latest = useRef(0);

  const ensure = () => {
    if (!runner.current) {
      runner.current = new TwoLayouts(
        () => new Worker(new URL("./layout.worker.ts", import.meta.url)) as unknown as WorkerLike,
        (id, l, error, final = true) => {
          if (id !== latest.current) return;
          if (l) setLayout(l);
          else console.error("Layout failed:", error);
          // (a poster made again from its recipe is shown at once; it may
          // be exported when it is as good as before, else once the search
          // is done)
          setPending(!final);
        },
        browserRecipes,
      );
    }
    return runner.current;
  };

  useEffect(() => () => {
    runner.current?.dispose();
    runner.current = null;
  }, []);

  const key = JSON.stringify(options);
  useEffect(() => {
    setPending(true);
    ensure().request({ id: ++latest.current, tree, options });
    // (options is rebuilt on every render: its content is what counts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, key]);

  return { layout, pending };
}
