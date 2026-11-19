"use client";

import { useEffect, useRef, useState } from "react";
import type { LayoutOptions, PosterLayout } from "@/lib/layout/botanical";
import { TwoLayouts, type WorkerLike } from "@/lib/layout/twoLayouts";
import type { TreeDTO } from "@/lib/types";

/**
 * The poster's layout, computed in workers (layout.worker.ts) so the editor
 * never freezes while a large family is laid out. The last layout stays on
 * screen until the next one is ready (`pending` meanwhile); `null` only
 * before the first. Only the newest request counts: changes made while one
 * is being laid out are folded into a single next request, never queued.
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
        (id, l, error) => {
          if (id !== latest.current) return;
          if (l) setLayout(l);
          else console.error("Layout failed:", error);
          setPending(false);
        },
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
