// Room for the tree on small paper (computePosterLayout, LayoutOptions.
// compactLower): a dense family whose names are set smaller to fit its
// paper no longer keeps a foundation two or three times larger than its
// names; the height goes to the tree, and the poster is never less clean
// or less legible for it.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { TreeDTO } from "@/lib/types";

/** A long lineage (80 ancestors, for the foundation) over a dense branch of about 200 people. */
function longLineDenseBranch(): TreeDTO {
  const b = new Builder("room", AR);
  const top = b.trunk(80);
  const head = b.person("MALE", { father: top });
  for (let i = 0; i < 6; i++) {
    const son = b.person("MALE", { father: head });
    b.person("FEMALE", { father: head });
    for (let j = 0; j < 5; j++) {
      const g = b.person("MALE", { father: son });
      b.person("FEMALE", { father: son });
      for (let k = 0; k < 3; k++) b.person(k === 2 ? "FEMALE" : "MALE", { father: g });
    }
  }
  const tree = b.tree("شجرة", top);
  tree.settings = { showFemales: true, focusId: head.id } as TreeDTO["settings"];
  return tree;
}
import type { PaperSize } from "@/lib/paper";

const clean = (l: PosterLayout) => l.overlaps === 0 && l.clarity.ok;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

describe("room for the tree on small paper", () => {
  it("the foundation follows the names when that is as clean and legible, and gives the tree the height", () => {
    const tree = longLineDenseBranch();
    let gained = 0;
    for (const paper of ["A3", "A2"] as PaperSize[]) {
      const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true, soilStyle: "paragraph" as const };
      const plain = computePosterLayout(tree, { ...opts, compactLower: false });
      const chosen = computePosterLayout(tree, opts);
      expect(plain.soil, paper).not.toBeNull();
      // never less clean, never less legible, names no smaller
      if (clean(plain)) expect(clean(chosen), paper).toBe(true);
      if (plain.legibility.ok) expect(chosen.legibility.ok, paper).toBe(true);
      expect(chosen.legibility.smallestTextMm, paper).toBeGreaterThanOrEqual(plain.legibility.smallestTextMm * 0.97 - 1e-9);
      expect(chosen.soil!.box.h, paper).toBeLessThanOrEqual(plain.soil!.box.h + 1e-6);
      const ratio = (l: PosterLayout) => l.soil!.fontSize / median(l.nodes.map((n) => n.fontSize));
      if (chosen.soil!.box.h < plain.soil!.box.h) {
        gained++;
        expect(ratio(chosen), paper).toBeLessThan(ratio(plain));
        expect(chosen.groundY, paper).toBeGreaterThan(plain.groundY);
      }
    }
    expect(gained).toBeGreaterThan(0);
  }, 600_000);
});
