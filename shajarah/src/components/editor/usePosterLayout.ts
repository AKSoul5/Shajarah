"use client";

import { useEffect, useRef, useState } from "react";
import type { LayoutOptions, PosterLayout } from "@/lib/layout/botanical";
import { TwoLayouts, type FamilyRecipes, type RecipeStore, type WorkerLike } from "@/lib/layout/twoLayouts";
import type { TreeDTO } from "@/lib/types";

/**
 * Recipes kept in the browser's storage too: the family's own copy
 * (FamilyRecipes) is read first; this one is only found again at the same
 * address (the desktop app opens on a new one every time it starts).
 */
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
export function usePosterLayout(
  tree: TreeDTO, options: LayoutOptions,
  /** The recipes kept with the family (read when a layout starts; given each new one). */
  family?: FamilyRecipes,
): { layout: PosterLayout | null; pending: boolean } {
  const [layout, setLayout] = useState<PosterLayout | null>(null);
  const [pending, setPending] = useState(true);
  const runner = useRef<TwoLayouts | null>(null);
  const latest = useRef(0);
  const familyRef = useRef(family);
  familyRef.current = family;

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
        // (read through the ref: the family's latest copy, not the first one)
        { get: () => familyRef.current?.get(), save: (r) => familyRef.current?.save(r) },
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
