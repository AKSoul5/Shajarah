"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/history";
import { useDismiss } from "../useDismiss";

interface Props {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Takes this many steps back at once (1 = the last step). */
  onUndoSteps: (steps: number) => void;
}

const ago = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

/**
 * Undo and redo, kept together, and the list of recent steps: choosing
 * one goes back to just before it (every later step can be redone).
 */
export function UndoControls({ undo, redo, busy, onUndo, onRedo, onUndoSteps }: Props) {
  const [open, setOpen] = useState(false);
  const menu = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const nextUndo = undo.at(-1), nextRedo = redo.at(-1);
  const recent = [...undo].reverse().slice(0, 20);
  return (
    <div className="relative flex items-center rounded-md border border-parchment-300 bg-white" role="group" aria-label="Undo and redo" ref={menu}>
      <button type="button" className="px-2 py-1 text-lg leading-none text-bark-700 hover:bg-parchment-50 disabled:opacity-30"
        aria-label={nextUndo ? `Undo: ${nextUndo.label}` : "Undo"} title={nextUndo ? `Undo: ${nextUndo.label} (Ctrl/⌘+Z)` : "Nothing to undo"}
        disabled={!nextUndo || busy} onClick={onUndo}>↶</button>
      <button type="button" className="border-s border-parchment-200 px-2 py-1 text-lg leading-none text-bark-700 hover:bg-parchment-50 disabled:opacity-30"
        aria-label={nextRedo ? `Redo: ${nextRedo.label}` : "Redo"} title={nextRedo ? `Redo: ${nextRedo.label} (Ctrl/⌘+Shift+Z)` : "Nothing to redo"}
        disabled={!nextRedo || busy} onClick={onRedo}>↷</button>
      <button type="button" className="border-s border-parchment-200 px-1.5 py-1 text-xs text-bark-500 hover:bg-parchment-50 disabled:opacity-30"
        aria-label="Recent steps" aria-expanded={open} title="Recent steps" disabled={!undo.length || busy} onClick={() => setOpen((o) => !o)}>▾</button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-2 w-80 rounded-lg border border-parchment-300 bg-white p-2 shadow-xl">
          <p className="px-2 pb-1 text-xs text-bark-500">Go back to before a step (it can be redone):</p>
          <ol className="max-h-80 overflow-auto">
            {recent.map((e, i) => (
              <li key={e.id}>
                <button type="button" className="flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-parchment-50"
                  onClick={() => { setOpen(false); onUndoSteps(i + 1); }}>
                  <span className="flex-1" dir="auto">{e.label}</span>
                  <span className="whitespace-nowrap text-xs text-bark-500">{ago(e.at)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
