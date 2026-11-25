import { readFileSync } from "node:fs";
import { standIn } from "./standin";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
export interface Case { key: string; tree: any; opts: any }
export function makeCase(key: string): Case {
  // key: seed|paper|spouses(0/1)|daughters(0/1)|preset
  const [seed, paper, sp, da, preset] = key.split("|");
  const [sd, size, share] = seed.split(":");
  // "private": the owner's family, read from outside the repository, never copied into it
  let tree = sd === "private" ? { id: "private", ...JSON.parse(readFileSync("/home/claude/private/family.shajarah", "utf8")).tree }
    : standIn(Number(sd), 12, size ? Number(size) : 300, share ? Number(share) : 0.25);
  if (da === "0") tree = { ...tree, settings: { ...tree.settings, familiesThrough: [] } };
  if (preset && preset !== "default") tree = { ...tree, settings: { ...tree.settings, theme: { ...(tree.settings.theme ?? {}), preset } } };
  const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), paper as any), showFemales: true, motherNames: sp === "1" };
  return { key, tree, opts };
}
