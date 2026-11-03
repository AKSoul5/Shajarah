// The name-box preview's sample family (src/lib/samples/nodeLab.ts): the
// same people in Arabic and English, covering every case the page compares.
import { describe, expect, it } from "vitest";
import { nodeLabFamily } from "@/lib/samples/nodeLab";
import { computePosterLayout } from "@/lib/layout/botanical";

describe("the name-box preview's family", () => {
  const ar = nodeLabFamily("ar");
  const en = nodeLabFamily("en");

  it("is the same family in both languages: the same people, parents and cases", () => {
    const shape = (f: typeof ar) => f.tree.members.map((m) => [m.gender, m.fatherId?.replace(/^lab-..-/, ""), m.motherId?.replace(/^lab-..-/, "")]);
    expect(shape(ar)).toEqual(shape(en));
    expect(Object.values(ar.cases)).toEqual(Object.values(en.cases));
  });

  it("has ordinary and long names, each with and without descendants, men and women", () => {
    for (const { cases } of [ar, en]) {
      const list = Object.values(cases);
      for (const kind of ["ordinary", "long"] as const) {
        for (const descendants of [true, false]) expect(list.some((c) => c.kind === kind && c.descendants === descendants), `${kind} ${descendants}`).toBe(true);
      }
      expect(list.some((c) => c.gender === "FEMALE" && c.descendants)).toBe(true);
    }
  });

  it("draws every person it compares", () => {
    for (const [lang, { tree, cases }] of [["ar", ar], ["en", en]] as const) {
      const layout = computePosterLayout(tree, { showFemales: true, rtl: lang === "ar" });
      const drawn = new Set([...layout.nodes.map((n) => n.id), layout.base?.id]);
      for (const id of Object.keys(cases)) expect(drawn.has(id), `${lang} ${id}`).toBe(true);
    }
  });
});
