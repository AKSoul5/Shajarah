// Every poster records how it was made (its recipe: the options, the
// names' size and the search's settings of the one attempt it came from),
// and replayLayout makes it again in that one attempt: the same poster in a
// fraction of the time (a private 340-person family at A0: 0.4 s against
// 104 s). The editor shows a family's poster at once from its last recipe
// (twoLayouts.ts); this checks the poster is the same, and that after a
// small change the replay is a sound poster.
import { describe, expect, it } from "vitest";
import { computePosterLayout, replayLayout } from "@/lib/layout/botanical";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const same = (a: object, b: object) => JSON.stringify({ ...a, recipe: undefined }) === JSON.stringify({ ...b, recipe: undefined });

describe("a poster made again from its recipe is the same", () => {
  for (const [fx, paper, fem] of [["A", "A2", true], ["B", "A2", true], ["C", "A1", false]] as const) {
    it(`family ${fx}, ${paper}`, { timeout: 300_000 }, () => {
      const settings = { showFemales: fem, theme: { preset: "classic", v: 2, motherNames: true } } as TreeDTO["settings"];
      const tree = { ...QA_FIXTURES[fx](), settings } as TreeDTO;
      const options = { showFemales: fem, ...layoutOptionsFor(resolveTheme(settings), paper) };
      const full = computePosterLayout(tree, options);
      expect(full.recipe).toBeDefined();
      expect(same(replayLayout(tree, full.recipe!), full)).toBe(true);
      // one son added in the canopy: the old recipe still makes a sound poster
      const father = tree.members.find((m) => full.nodes.some((n) => n.id === m.id) && m.gender === "MALE" && tree.members.some((c) => c.fatherId === m.id))!;
      const son: MemberDTO = { ...father, id: "added-son", name: "سليم", fatherId: father.id, motherId: null, birthOrder: 99, generation: (father.generation ?? 0) + 1 };
      const again = replayLayout({ ...tree, members: [...tree.members, son] }, full.recipe!);
      expect(again.nodes.some((n) => n.id === "added-son")).toBe(true);
      expect(again.overlaps).toBe(0);
    });
  }
});
