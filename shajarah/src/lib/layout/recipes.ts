// A family's poster recipes, kept with the family itself (its settings,
// `layoutRecipes`) rather than only in the browser's storage.
//
// A recipe (see replayLayout) makes a poster again in one attempt: a
// 340-person family at 2A0 in 0.65 s against 217 s for the whole search.
// The browser's storage belongs to the page's address, and the desktop app
// opens on a new port every time it starts, so a recipe kept there alone
// was never found again: every start began with the whole search. Kept
// with the family, it is found again wherever the family is opened (and
// travels in its project file).
//
// Saving a recipe is not an edit: no undo step, no new version of the
// family, and no new layout. The layout is given the family without its
// recipes (withoutRecipes, sameLayoutInput), so a recipe saved can never
// start a layout of its own.

import type { LayoutOptions, LayoutRecipe } from "./botanical";
import type { PosterSettings, TreeDTO } from "@/lib/types";

/** The most recent recipes a family keeps (one per paper and setting): settings stay small. */
export const MAX_FAMILY_RECIPES = 12;

/** One poster's recipe, as a family keeps it. */
export interface StoredRecipe {
  /** Which poster: the fingerprint of the options it was laid out with (recipeKey). */
  key: string;
  recipe: LayoutRecipe;
  /** How good the poster was (twoLayouts' posterRank). */
  rank: number;
  /** The options the poster was asked for, so the key can be made again when ids change (a project file opened). */
  options: LayoutOptions;
  /** When it was saved (ms since 1970): the newest is kept. */
  at: number;
}

/** A short, stable fingerprint of a text (53-bit, cyrb53). */
export function fingerprint(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Which poster a recipe is for: its options' fingerprint. */
export const recipeKey = (options: LayoutOptions) => fingerprint(JSON.stringify(options));

const isRecipe = (r: unknown): r is StoredRecipe =>
  !!r && typeof r === "object" && typeof (r as StoredRecipe).key === "string" && !!(r as StoredRecipe).recipe;

/**
 * Several lists of recipes as one: one per poster (the newest), newest
 * first, at most MAX_FAMILY_RECIPES. Used wherever two copies meet (the
 * server's and a change's), so an older copy never undoes a newer recipe.
 */
export function mergeRecipes(...lists: (readonly unknown[] | null | undefined)[]): StoredRecipe[] {
  const byKey = new Map<string, StoredRecipe>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (!isRecipe(r)) continue;
      const had = byKey.get(r.key);
      if (!had || (r.at ?? 0) > (had.at ?? 0)) byKey.set(r.key, r);
    }
  }
  return [...byKey.values()].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, MAX_FAMILY_RECIPES);
}

/**
 * Settings about to be written, with the family's recipes kept: the ones
 * it has and any in `incoming`, the newest of each. A change sent from a
 * copy of the family made before a recipe was saved (a settings change,
 * an undo) never drops that recipe.
 */
export function keepRecipes(current: PosterSettings | null | undefined, incoming: PosterSettings): PosterSettings {
  const recipes = mergeRecipes(current?.layoutRecipes, incoming.layoutRecipes);
  const { layoutRecipes: _, ...rest } = incoming;
  return recipes.length ? { ...rest, layoutRecipes: recipes } : rest;
}

/** The family's recipe for a poster, if it keeps one. */
export function findRecipe(list: readonly StoredRecipe[] | null | undefined, key: string): StoredRecipe | undefined {
  return list?.find((r) => r.key === key);
}

/** The family as the layout sees it: without its recipes (they are not part of the poster). */
export function withoutRecipes(tree: TreeDTO): TreeDTO {
  if (!tree.settings || !("layoutRecipes" in tree.settings)) return tree;
  const { layoutRecipes: _r, ...settings } = tree.settings;
  return { ...tree, settings };
}

/**
 * Whether two copies of a family give the same poster as far as the
 * editor can tell without comparing their content: every part the same
 * object, apart from the recipes. (A recipe saved changes the settings
 * object only; any real change replaces another part, or a setting.)
 */
export function sameLayoutInput(a: TreeDTO, b: TreeDTO): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof TreeDTO>;
  for (const k of keys) {
    if (k === "settings") continue;
    if (a[k] !== b[k]) return false;
  }
  // (no settings and settings holding recipes only are the same to the layout)
  const sa = (a.settings ?? {}) as Record<string, unknown>, sb = (b.settings ?? {}) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (k === "layoutRecipes") continue;
    if (sa[k] !== sb[k]) return false;
  }
  return true;
}

/** Every id in a value (the options' focus, families shown, hidden people, "a:b" spouse pairs) mapped. */
function remapValue<T>(value: T, ids: ReadonlyMap<string, string>): T {
  if (typeof value === "string") {
    if (ids.has(value)) return ids.get(value) as T;
    const pair = value.split(":");
    if (pair.length === 2 && ids.has(pair[0]) && ids.has(pair[1])) return `${ids.get(pair[0])}:${ids.get(pair[1])}` as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => remapValue(v, ids)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapValue(v, ids)])) as T;
  }
  return value;
}

/**
 * A family's recipes for the same family under new ids (a project file
 * opened as a new family): the ids in each recipe's options are mapped and
 * its key made again from them.
 */
export function remapRecipes(list: readonly unknown[] | null | undefined, ids: ReadonlyMap<string, string>): StoredRecipe[] {
  return mergeRecipes(list).map((r) => {
    const options = remapValue(r.options ?? {}, ids);
    return { ...r, options, key: recipeKey(options), recipe: { ...r.recipe, opts: remapValue(r.recipe.opts, ids) } };
  });
}
