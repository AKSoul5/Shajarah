"use client";

import { useRef } from "react";
import { sameLayoutInput, withoutRecipes } from "@/lib/layout/recipes";
import type { TreeDTO } from "@/lib/types";

/**
 * The family as every layout sees it: without its poster recipes, and the
 * same object as long as nothing but its recipes changed. A recipe saved
 * with the family can therefore never start a layout, a paper search or a
 * branch measurement (see layout/recipes.ts).
 */
export function useLayoutInput(tree: TreeDTO): TreeDTO {
  const last = useRef<{ from: TreeDTO; input: TreeDTO } | null>(null);
  const prev = last.current;
  if (prev && sameLayoutInput(prev.from, tree)) return prev.input;
  const input = withoutRecipes(tree);
  last.current = { from: tree, input };
  return input;
}
