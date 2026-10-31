"use client";

import { useState } from "react";
import { useDismiss } from "../useDismiss";

export interface ViewToggle {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  /** A short explanation, shown as the item's tooltip. */
  title?: string;
  /** The keyboard shortcut, shown beside the label. */
  keys?: string;
}

/**
 * What the poster shows and how the editor is laid out, in one menu: the
 * family's daughters and spouses, the selected person's line, the member
 * list and full screen. (They were loose tick boxes crowding the header.)
 */
export function ViewMenu({ toggles }: { toggles: ViewToggle[] }) {
  const [open, setOpen] = useState(false);
  const menu = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={menu}>
      <button type="button" className="btn-outline whitespace-nowrap" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        View ▾
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-30 mt-2 w-72 space-y-1 rounded-lg border border-parchment-300 bg-white p-2 shadow-xl">
          {toggles.map((t) => (
            <label key={t.label} title={t.title} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-parchment-50">
              <input type="checkbox" role="menuitemcheckbox" aria-checked={t.checked} checked={t.checked} onChange={(e) => t.onChange(e.target.checked)} />
              <span className="flex-1">{t.label}</span>
              {t.keys && <kbd className="rounded border border-parchment-300 px-1.5 text-xs text-bark-500">{t.keys}</kbd>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
