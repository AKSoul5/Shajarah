// The last poster layout of each tree, kept on this computer (IndexedDB), so
// a tree opens with its poster at once instead of after the layout runs:
// exactly as last laid out when nothing it depends on has changed (no
// layout at all), or the last one, marked as updating, while the new one is
// computed. A cache only: never the family's data, and anything that fails
// here (private windows, storage turned off) just means no cache.

import type { LayoutOptions, PosterLayout } from "@/lib/layout/botanical";
import type { TreeDTO } from "@/lib/types";
import appPackage from "../../../desktop/electron/package.json";

const DB = "shajarah-layouts";
const STORE = "layouts";
/** Layouts from another version of the app are never reused as they are. */
const VERSION = appPackage.version;

export interface CachedLayout {
  fingerprint: string;
  layout: PosterLayout;
  at: number;
}

/** A short hash of everything the layout depends on (FNV-1a, 53 bits). */
export function layoutFingerprint(tree: TreeDTO, options: LayoutOptions): string {
  const text = JSON.stringify({
    v: VERSION,
    m: tree.members, x: tree.marriages, s: tree.settings, l: tree.lineage,
    r: tree.rootMemberId, c: tree.crownBaseId, t: tree.trunkStartId, soil: tree.soilText,
    title: tree.title, subtitle: tree.subtitle, o: options,
  });
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return `${VERSION}:${h1.toString(36)}${h2.toString(36)}:${text.length}`;
}

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** The tree's last layout on this computer, or null. */
export async function readCachedLayout(treeId: string): Promise<CachedLayout | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(treeId);
      req.onsuccess = () => resolve((req.result as CachedLayout | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Keeps the tree's layout for next time (best effort). */
export async function writeCachedLayout(treeId: string, fingerprint: string, layout: PosterLayout): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).put({ fingerprint, layout, at: Date.now() } satisfies CachedLayout, treeId);
  } catch {
    // (no room, or storage refused: simply no cache)
  }
}
