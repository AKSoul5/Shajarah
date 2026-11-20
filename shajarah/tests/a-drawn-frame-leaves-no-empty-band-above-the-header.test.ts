// Inside a frame the header and footer once kept clear of the gold-foil
// artwork's rosettes in every design, though only Luxe draws that artwork:
// the others draw their own frame (rules, a band, corner ornaments), with
// nothing at the middle of its top or foot. At A0 in Classic that left 78 mm
// of empty paper between the frame and the basmala, and 73 mm under the
// credit. A drawn frame now keeps W·0.032 of paper inside it, as an unframed
// poster keeps from the page's edge (framePlacement, FRAME_INSET).
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { FRAME_INSET, layoutOptionsFor, paletteOf, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { ThemePreset, TreeDTO } from "@/lib/types";

/** A small family under a short lineage (invented names). */
function family(preset: ThemePreset): TreeDTO {
  const b = new Builder("frame", AR);
  const top = b.trunk(6);
  const head = b.person("MALE", { father: top });
  for (let i = 0; i < 5; i++) {
    const s = b.person("MALE", { father: head, order: i });
    for (let j = 0; j < 3; j++) b.person("MALE", { father: s, order: j });
  }
  const tree = b.tree("شجرة", head);
  tree.settings = { showFemales: false, theme: { preset, v: 2, frame: true, bismillah: true, verse: true, hadith: true, edition: true } } as unknown as TreeDTO["settings"];
  return tree;
}

const PRESETS: ThemePreset[] = ["refined", "luxe", "heritage", "classic", "silver-gold", "emerald", "mono"];

describe("a drawn frame leaves no empty band above the header", () => {
  it("sits the basmala and the credit W·0.032 inside a drawn frame, and keeps the foil's rosettes clear", () => {
    for (const preset of PRESETS) {
      const tree = family(preset);
      const theme = resolveTheme(tree.settings);
      const opts = layoutOptionsFor(theme, "A1");
      const l = computePosterLayout(tree, { ...opts, showFemales: false });
      const { width: W, height: H } = l;
      const inset = FRAME_INSET[paletteOf(theme).frame];
      expect(opts.frameInset, preset).toBe(inset);
      if (inset === undefined) {
        // (the foil artwork: as before)
        expect(l.frame.header.basmala, preset).toBeCloseTo(H * 0.112, 6);
        expect(l.frame.footerY, preset).toBeCloseTo(H * 0.905, 6);
        continue;
      }
      // the basmala's top (W·0.022 above its baseline) W·0.032 inside the frame
      expect((l.frame.header.basmala - W * 0.022) / W - inset, preset).toBeCloseTo(0.032, 6);
      expect((H - l.frame.footerY - W * 0.004) / W - inset, preset).toBeCloseTo(0.032, 6);
      // and the tree starts below the header, the corner medallions beside it
      for (const m of l.medallions) expect(m.y - m.r, preset).toBeGreaterThan(W * (inset + 0.08));
      expect(l.overlaps, preset).toBe(0);
    }
  }, 600_000);

  it("gives the tree the room: a Classic poster's names are no smaller than with the rosettes' room", () => {
    const tree = family("classic");
    const opts = layoutOptionsFor(resolveTheme(tree.settings), "A1");
    const drawn = computePosterLayout(tree, { ...opts, showFemales: false });
    const roomy = computePosterLayout(tree, { ...opts, showFemales: false, frameInset: undefined, headerBand: (opts.headerBand ?? 0) });
    expect(drawn.legibility.smallestTextMm).toBeGreaterThanOrEqual(roomy.legibility.smallestTextMm);
    expect(drawn.groundY).toBeGreaterThan(roomy.groundY);
  }, 600_000);
});
