// The poster's foot and head: the family's numbers (with how many
// generations it spans) and the edition line under the title.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";

describe("the poster's numbers", () => {
  it("count the generations the family spans, from its oldest ancestor", () => {
    const tree = kalaliFilledTree();
    const l = computePosterLayout(tree, layoutOptionsFor(resolveTheme(tree.settings), "A1"));
    expect(l.stats.generations).toBe(new Set(tree.members.map((m) => m.generation)).size);
    expect(l.stats.generations).toBeGreaterThan(30);
    expect(l.stats.total).toBe(l.stats.males + l.stats.females + tree.members.filter((m) => m.gender !== "MALE" && m.gender !== "FEMALE").length);
  }, 60_000);
});

describe("the edition line", () => {
  it("is on in every theme, with room kept for it under the title", () => {
    for (const preset of Object.keys(THEME_PRESETS)) {
      const on = resolveTheme({ theme: { preset } } as never);
      expect(on.edition, preset).toBe(true);
      const off = { ...on, edition: false };
      expect(layoutOptionsFor(on).headerBand, preset).toBeGreaterThan(layoutOptionsFor(off).headerBand);
    }
  });
});
