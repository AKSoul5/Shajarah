"use client";

import { useEffect, useRef, useState } from "react";
import { smallestClearPaper } from "@/lib/layout/branches";
import { computePosterLayout, type LayoutOptions, type PosterLayout } from "@/lib/layout/botanical";
import { PAPER_ORDER, type PaperSize } from "@/lib/paper";
import type { TreeDTO } from "@/lib/types";

/**
 * For a poster drawn clean but with names too small for its paper: the
 * smallest larger paper on which the family is laid out both clean and
 * legible, found by laying it out on each size in turn (in a worker, so the
 * editor stays usable). A larger paper is laid out afresh, so this is often
 * smaller than the paper the shrunk names alone would call for.
 * "checking" while it is being found; null when no paper is enough, or the
 * poster needs no larger paper.
 */
export function useReadablePaper(
  tree: TreeDTO, layout: PosterLayout | null, paper: PaperSize, optionsFor: (p: PaperSize) => LayoutOptions,
): PaperSize | null | "checking" {
  const wanted = !!layout && layout.clarity.ok && layout.overlaps === 0 && !layout.legibility.ok;
  const larger = PAPER_ORDER.slice(PAPER_ORDER.indexOf(paper) + 1);
  const papers = wanted ? larger.map((p) => ({ paper: p, options: optionsFor(p) })) : [];
  const key = wanted ? JSON.stringify(papers.map((p) => p.options)) : "";
  const [found, setFound] = useState<{ key: string; tree: TreeDTO; paper: PaperSize | null } | null>(null);
  const job = useRef(0);

  useEffect(() => {
    if (!wanted || !papers.length) return;
    const id = ++job.current;
    const done = (p: PaperSize | null) => { if (id === job.current) setFound({ key, tree, paper: p }); };
    const onPage = () => done(smallestClearPaper((p) => computePosterLayout(tree, papers.find((x) => x.paper === p)!.options), papers[0].paper));
    let w: Worker;
    try {
      w = new Worker(new URL("./layout.worker.ts", import.meta.url));
    } catch {
      const t = setTimeout(onPage, 30);
      return () => clearTimeout(t);
    }
    w.onmessage = (e: MessageEvent<{ ok: boolean; paper?: PaperSize | null; error?: string }>) => {
      if (e.data.ok) done(e.data.paper ?? null);
      else { console.error("Finding a readable paper failed:", e.data.error); done(null); }
      w.terminate();
    };
    w.onerror = (e) => { e.preventDefault(); w.terminate(); onPage(); };
    w.postMessage({ id, kind: "paper", tree, papers });
    return () => w.terminate();
    // (papers is rebuilt on every render: key holds its content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, key, wanted]);

  if (!wanted || !papers.length) return null;
  return found && found.key === key && found.tree === tree ? found.paper : "checking";
}

/**
 * The smallest paper on which the poster laid out with each paper's options
 * is clear (see smallestClearPaper), found in a worker: on a large family
 * it lays the poster out once per size, which on the page would freeze the
 * editor. Aborting stops the worker. (Where no worker can run, on the page.)
 */
export function smallestClearPaperOffPage(
  tree: TreeDTO, papers: { paper: PaperSize; options: LayoutOptions }[], signal?: AbortSignal,
): Promise<PaperSize | null> {
  const onPage = () => smallestClearPaper((p) => computePosterLayout(tree, papers.find((x) => x.paper === p)!.options), papers[0].paper);
  if (!papers.length) return Promise.resolve(null);
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = new Worker(new URL("./layout.worker.ts", import.meta.url));
    } catch {
      setTimeout(() => resolve(signal?.aborted ? null : onPage()), 0);
      return;
    }
    const stop = () => { w.terminate(); resolve(null); };
    signal?.addEventListener("abort", stop, { once: true });
    w.onmessage = (e: MessageEvent<{ ok: boolean; paper?: PaperSize | null; error?: string }>) => {
      signal?.removeEventListener("abort", stop);
      w.terminate();
      if (!e.data.ok) console.error("Measuring a poster failed:", e.data.error);
      resolve(e.data.ok ? e.data.paper ?? null : null);
    };
    w.onerror = (e) => {
      e.preventDefault();
      signal?.removeEventListener("abort", stop);
      w.terminate();
      resolve(signal?.aborted ? null : onPage());
    };
    w.postMessage({ id: 0, kind: "paper", tree, papers });
  });
}
