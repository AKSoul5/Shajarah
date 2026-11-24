"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchProgress } from "@/lib/layout/twoLayouts";

/** "1:23" for 83 s, "12 s" under a minute. */
function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The search's progress in words: the step it is on, the time it has taken,
 * and, where the family's last search on this paper is known, about how
 * long is left. No percentage: a search's number of steps is not known in
 * advance.
 */
export function progressText(p: SearchProgress, now: number): string {
  const elapsed = now - p.startedAt;
  const parts = [`Laying out: step ${p.step}`, `${clock(elapsed)} elapsed`];
  if (p.lastMs) {
    const left = p.lastMs - elapsed;
    if (left <= 0) parts.push("longer than last time");
    else if (left < 60_000) parts.push("under a minute left");
    else parts.push(`about ${Math.ceil(left / 60_000)} min left`);
  }
  return parts.join(" · ");
}

interface Props {
  /** A poster is on screen (a draft, the last one, or the replayed one). */
  shown: boolean;
  pending: boolean;
  draft: boolean;
  progress: SearchProgress | null;
}

/**
 * While the poster is being laid out: a slim strip across the top of the
 * canvas ("Draft — finishing the layout…" over a draft, else "Updating the
 * poster…") with the search's progress, so the wait never looks frozen.
 * When the finished poster comes in after a wait, "Poster ready" is said
 * briefly (and announced to a screen reader).
 */
export function LayoutStatus({ shown, pending, draft, progress }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const waited = useRef(false);
  useEffect(() => {
    if (!progress) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [progress]);
  useEffect(() => {
    if (pending) {
      waited.current = true;
      setReady(false);
      return;
    }
    if (!waited.current) return;
    waited.current = false;
    setReady(true);
    const t = setTimeout(() => setReady(false), 2500);
    return () => clearTimeout(t);
  }, [pending]);

  const strip = pending && (draft || progress || shown);
  return (
    <>
      {strip && (
        <div className={`absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border-b px-4 py-1 text-xs shadow-sm ${
          draft ? "border-amber-300 bg-amber-50 text-amber-900" : "border-parchment-300 bg-white/95 text-bark-600"}`}>
          <span className="font-medium" role="status">{draft ? "Draft — finishing the layout…" : "Updating the poster…"}</span>
          {progress && <span className="text-bark-500" aria-hidden>{progressText(progress, now)}</span>}
        </div>
      )}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
        {ready && <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs text-emerald-900 shadow">Poster ready</span>}
      </div>
    </>
  );
}
