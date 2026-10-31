"use client";

import { useEffect, useRef } from "react";

/**
 * A menu that closes as menus do: on a click or tap anywhere outside it, or
 * on Escape. Returns the ref for the menu's outer element (its button and
 * panel both inside it, so the button still toggles). While `keep` is true
 * (an export running), it stays open.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void, keep = false) {
  const ref = useRef<T>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open || keep) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, keep]);
  return ref;
}
