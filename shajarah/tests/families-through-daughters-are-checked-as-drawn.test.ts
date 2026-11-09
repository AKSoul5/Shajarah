// A family shown through a daughter has its dotted lines leave her (or her
// husband's box) along one short stem and part at its end. The layout's own
// check read each such line from the fork alone, as starting off its
// parent's box: dozens of misattached lines on every try, more than the
// line bending (30) and the untangling (15) take on, so neither ran, however
// few real problems were left. Checked as drawn (with the stem), the real
// problems are bent clear. Found on a 340-person family shown with spouses
// (the untangling never ran on its 5 merges); these families are invented.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { stressFamily } from "@/lib/samples/stress";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

describe("families shown through daughters are checked as drawn", () => {
  for (const [size, seed, spouses] of [[90, 1, false], [60, 4, true]] as const) {
    it(`${size} people, seed ${seed}${spouses ? ", with spouses" : ""}: clear and legible on A1`, { timeout: 600_000 }, () => {
      const { tree, mothers } = stressFamily({ size, seed });
      const settings = { ...tree.settings, showFemales: true, familiesThrough: mothers, theme: { motherNames: spouses } };
      const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), "A1"));
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
    });
  }
});
