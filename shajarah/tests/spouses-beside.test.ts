// A man whose children by two wives, and by none recorded, spread all round
// him: their spouses' frames found no clear place and settled against him,
// and every line ran together there. Such a poster is laid out again with
// his wives beside him (each in her spouse frame, on a short line) and his
// children's lines from him (LayoutOptions.spousesBeside), when that is
// cleaner. Nobody's parents change.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { validateRelationships } from "@/lib/layout/clarity";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { AR, Builder } from "@/lib/qa/fixtures";
import type { MemberDTO, TreeDTO } from "@/lib/types";

function twoWivesAndNone(): { tree: TreeDTO; man: MemberDTO; wives: MemberDTO[] } {
  const b = new Builder("wives", AR);
  const top = b.trunk(8);
  const head = b.person("MALE", { father: top });
  const man = b.person("MALE", { father: head });
  const other = b.person("MALE", { father: head });
  const grow = (p: MemberDTO, n: number) => {
    let left = n;
    const queue = [p];
    while (left > 0 && queue.length) {
      const q = queue.shift()!;
      for (let i = 0; i < 4 && left > 0; i++, left--) queue.push(b.person(i === 3 ? "FEMALE" : "MALE", { father: q.gender === "MALE" ? q : null }));
    }
  };
  grow(other, 7);
  const w1 = b.person("FEMALE", { name: "نورة الأولى" }), w2 = b.person("FEMALE", { name: "هند الثانية" });
  b.marry(man, w1);
  b.marry(man, w2);
  for (const n of [2, 20, 1, 49, 12]) grow(b.person("MALE", { father: man, mother: w1 }), n - 1);
  for (let i = 0; i < 4; i++) b.person("FEMALE", { father: man, mother: w1 });
  for (let i = 0; i < 5; i++) { const k = b.person("MALE", { father: man }); if (i === 4) b.person("MALE", { father: k }); }
  for (let i = 0; i < 2; i++) b.person("FEMALE", { father: man, mother: w2 });
  const tree = b.tree("شجرة", head);
  tree.settings = { showFemales: true, seed: 18, theme: { preset: "classic", v: 2, motherNames: true, spouseStyle: "manuscript" } } as unknown as TreeDTO["settings"];
  return { tree, man, wives: [w1, w2] };
}

describe("a man's wives beside him when their frames find no clear place", () => {
  it("is clean on 8A0, each wife still drawn as his spouse, and no parent changed", () => {
    const { tree, man, wives } = twoWivesAndNone();
    const before = JSON.stringify(tree.members.map((m) => [m.id, m.fatherId, m.motherId]));
    const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), "8A0"), showFemales: true };
    const framed = computePosterLayout(tree, { ...opts, spousesBeside: [] });
    expect(framed.clarity.ok).toBe(false); // the frames against him: lines run together
    const l = computePosterLayout(tree, opts);
    expect(l.clarity.ok).toBe(true);
    expect(l.overlaps).toBe(0);
    expect(validateRelationships(l, tree).issues).toEqual([]);
    for (const w of wives) {
      const h = l.spouses.find((s) => s.member.id === w.id && s.partnerId === man.id);
      expect(h, w.name).toBeDefined();
      expect(h!.childIds).toEqual([]);
    }
    expect(JSON.stringify(tree.members.map((m) => [m.id, m.fatherId, m.motherId]))).toBe(before);
  }, 600_000);
});
