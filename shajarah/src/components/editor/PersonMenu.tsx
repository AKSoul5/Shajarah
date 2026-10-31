"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useDismiss } from "../useDismiss";

export interface PersonMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** A thin rule above this item. */
  divider?: boolean;
}

/**
 * The menu a name on the poster opens when right-clicked: what can be done
 * with that person, without going through the side panel. It opens at the
 * pointer, kept inside the window, and closes on a click elsewhere or Escape.
 */
export function PersonMenu({ name, x, y, items, onClose }: { name: string; x: number; y: number; items: PersonMenuItem[]; onClose: () => void }) {
  const ref = useDismiss<HTMLDivElement>(true, onClose);
  const [at, setAt] = useState({ left: x, top: y });
  const first = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setAt({ left: Math.max(8, Math.min(x, window.innerWidth - width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - height - 8)) });
    first.current?.focus();
  }, [x, y, ref]);
  return (
    <div ref={ref} role="menu" aria-label={name} style={{ left: at.left, top: at.top }}
      className="fixed z-50 w-72 rounded-lg border border-parchment-300 bg-white p-1.5 text-sm shadow-xl">
      <p className="truncate px-2 pb-1 pt-0.5 font-naskh text-base font-bold text-bark-900" dir="auto">{name}</p>
      {items.map((it, i) => (
        <div key={it.label}>
          {it.divider && <hr className="my-1 border-parchment-200" />}
          <button ref={i === 0 ? first : undefined} type="button" role="menuitem" disabled={it.disabled} title={it.title}
            className="w-full rounded-md px-2 py-1.5 text-start hover:bg-parchment-50 focus:bg-parchment-50 focus:outline-none disabled:opacity-40"
            onClick={() => { onClose(); it.onClick(); }}>
            {it.label}
          </button>
        </div>
      ))}
    </div>
  );
}
