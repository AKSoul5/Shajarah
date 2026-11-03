"use client";

// The desktop program's menu bar (desktop/electron/menu.js), seen from the
// page. Its commands arrive here and run the page's own actions; the page
// tells it what is possible. In a browser there is no bridge, and these do
// nothing.

import { useEffect, useRef } from "react";

export const DESKTOP_COMMANDS = [
  "new-family", "open-project", "save-project", "save-project-as", "import-gedcom", "import-outline",
  "export-svg", "export-pdf", "export-png", "export-tiled-pdf",
  "undo", "redo", "toggle-sidebar", "zoom-in", "zoom-out", "zoom-reset",
] as const;
export type DesktopCommandType = (typeof DESKTOP_COMMANDS)[number];

/** A file the person chose in the program's Open dialog. */
export interface DesktopFile {
  name: string;
  data: Uint8Array;
}
export interface DesktopCommand {
  type: DesktopCommandType;
  file?: DesktopFile;
}

/** What the menu offers: which page is open, what undo and redo would do, the member list. */
export interface DesktopState {
  page: "home" | "editor" | "none";
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string | null;
  redoLabel?: string | null;
  sidebar?: boolean;
}

interface Bridge {
  onCommand(listener: (command: unknown) => void): () => void;
  reportState(state: DesktopState): void;
}

const bridge = (): Bridge | null => {
  if (typeof window === "undefined") return null;
  const b = (window as unknown as { shajarahDesktop?: Bridge }).shajarahDesktop;
  return b && typeof b.onCommand === "function" && typeof b.reportState === "function" ? b : null;
};

/** Whether the page runs in the desktop program. */
export const inDesktop = () => bridge() !== null;

/** A command from the bridge, if it is one this page knows (with a well-formed file, if any). */
export function parseCommand(raw: unknown): DesktopCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, file } = raw as { type?: unknown; file?: unknown };
  if (typeof type !== "string" || !(DESKTOP_COMMANDS as readonly string[]).includes(type)) return null;
  if (file === undefined) return { type: type as DesktopCommandType };
  const f = file as { name?: unknown; data?: unknown };
  if (!f || typeof f.name !== "string" || !(f.data instanceof Uint8Array)) return null;
  return { type: type as DesktopCommandType, file: { name: f.name, data: f.data } };
}

/** The chosen file as the page's own file inputs give it. */
export function fileOf(file: DesktopFile, type = ""): File {
  return new File([file.data as BlobPart], file.name, { type });
}

/** Input types that are not for typing text (their undo is the family's). */
const NOT_TEXT = ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"];

/**
 * Whether undo and redo would edit text here (a text field, or something
 * editable, has the focus): there they are the field's own, elsewhere the
 * family's. The same rule for the keys and for the desktop menu.
 */
export function editingText(el: Element | null = typeof document === "undefined" ? null : document.activeElement): boolean {
  if (!el || typeof el.closest !== "function") return false;
  if (el.closest("textarea, [contenteditable=''], [contenteditable='true']")) return true;
  return el.tagName === "INPUT" && !NOT_TEXT.includes(((el as HTMLInputElement).type || "text").toLowerCase());
}

export type DesktopHandlers = Partial<Record<DesktopCommandType, (command: DesktopCommand) => void>>;

/**
 * Listens for menu commands, running the action `handlers()` has for each
 * (a command it has none for, or not a known command, is ignored; one that
 * fails is logged, never thrown into the bridge). Returns how to stop; in a
 * browser, where there is no menu, it does nothing.
 */
export function listenForCommands(handlers: () => DesktopHandlers): () => void {
  const b = bridge();
  if (!b) return () => {};
  return b.onCommand((raw) => {
    const command = parseCommand(raw);
    if (!command) return;
    try {
      handlers()[command.type]?.(command);
    } catch (e) {
      console.error(`The menu's ${command.type} failed:`, e);
    }
  });
}

/** Tells the menu what the page offers (nothing in a browser). */
export function reportDesktopState(state: DesktopState) {
  bridge()?.reportState(state);
}

/** listenForCommands for a component: its latest handlers, listening once. */
export function useDesktopCommands(handlers: DesktopHandlers) {
  const current = useRef(handlers);
  current.current = handlers;
  useEffect(() => listenForCommands(() => current.current), []);
}

/** Tells the menu what this page offers, whenever that changes (and "none" when the page goes). */
export function useDesktopState(state: DesktopState) {
  const key = JSON.stringify(state);
  useEffect(() => reportDesktopState(JSON.parse(key) as DesktopState), [key]);
  useEffect(() => () => reportDesktopState({ page: "none" }), []);
}
