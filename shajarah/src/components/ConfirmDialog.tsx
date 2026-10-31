"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  /** The confirming button's words ("Delete", "Merge"). */
  confirm: string;
  /** A destructive action: the confirming button in red. */
  danger?: boolean;
}

/**
 * A confirmation in the app's own style, in place of the browser's
 * `confirm()` box. `ask(...)` opens it and resolves true or false; render
 * `dialog` once. Enter confirms, Escape or a click outside cancels, and
 * the safe choice (Cancel) has the focus first.
 */
export function useConfirm(): { dialog: ReactNode; ask: (o: ConfirmOptions) => Promise<boolean> } {
  const [open, setOpen] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const ask = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setOpen({ ...o, resolve })), []);
  const close = (ok: boolean) => {
    open?.resolve(ok);
    setOpen(null);
  };
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const dialog = open ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bark-900/30 p-4" onPointerDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message"
        className="w-full max-w-md rounded-xl border border-parchment-300 bg-white p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-base font-semibold text-bark-900">{open.title}</h2>
        <div id="confirm-message" className="mt-2 whitespace-pre-line text-sm text-bark-700" dir="auto">{open.message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn-outline" onClick={() => close(false)}>Cancel</button>
          <button type="button" onClick={() => close(true)}
            className={open.danger
              ? "inline-flex items-center rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white outline-none hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
              : "btn-primary"}>
            {open.confirm}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { dialog, ask };
}
