"use client";

import { useEffect, useRef, useState } from "react";
import { computePosterLayout, type LayoutOptions, type PosterLayout } from "@/lib/layout/botanical";
import type { TreeDTO } from "@/lib/types";

type Job = { id: number; tree: TreeDTO; options: LayoutOptions };

/**
 * The poster's layout, computed in a worker (layout.worker.ts) so the editor
 * never freezes while a large family is laid out. The last layout stays on
 * screen until the next one is ready (`pending` meanwhile); `null` only
 * before the first. Only the newest request counts: changes made while one
 * is being laid out are folded into a single next request, never queued.
 * (Where a worker cannot run, it is laid out on the page, as before.)
 */
export function usePosterLayout(tree: TreeDTO, options: LayoutOptions): { layout: PosterLayout | null; pending: boolean } {
  const [layout, setLayout] = useState<PosterLayout | null>(null);
  const [pending, setPending] = useState(true);
  const worker = useRef<Worker | null>(null);
  const failed = useRef(false);
  const busy = useRef(false);
  const waiting = useRef<Job | null>(null);
  const inFlight = useRef<Job | null>(null);
  const latest = useRef(0);

  const onPage = (job: Job) => {
    if (job.id !== latest.current) return;
    setLayout(computePosterLayout(job.tree, job.options));
    setPending(false);
  };
  const send = () => {
    const job = waiting.current;
    if (!job || busy.current) return;
    if (!worker.current) {
      if (failed.current) {
        waiting.current = null;
        onPage(job);
      }
      return;
    }
    busy.current = true;
    waiting.current = null;
    inFlight.current = job;
    worker.current.postMessage(job);
  };

  useEffect(() => {
    let w: Worker;
    try {
      w = new Worker(new URL("./layout.worker.ts", import.meta.url));
    } catch {
      failed.current = true;
      send();
      return;
    }
    worker.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; layout?: PosterLayout; error?: string }>) => {
      busy.current = false;
      inFlight.current = null;
      if (e.data.id === latest.current) {
        if (e.data.ok) setLayout(e.data.layout!);
        else console.error("Layout failed:", e.data.error);
        setPending(false);
      }
      send();
    };
    w.onerror = (e) => {
      // (a worker that cannot run: the page lays the poster out instead)
      e.preventDefault();
      console.error("Layout worker failed; laying out on the page:", e.message);
      w.terminate();
      worker.current = null;
      failed.current = true;
      busy.current = false;
      if (inFlight.current && !waiting.current) waiting.current = inFlight.current;
      inFlight.current = null;
      send();
    };
    send();
    return () => {
      w.terminate();
      worker.current = null;
      busy.current = false;
    };
    // (one worker for the editor's life; send reads only refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = JSON.stringify(options);
  useEffect(() => {
    waiting.current = { id: ++latest.current, tree, options };
    setPending(true);
    send();
    // (options is rebuilt on every render: its content is what counts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, key]);

  return { layout, pending };
}
