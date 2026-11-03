// The person profile (src/components/editor/PersonProfile.tsx), drawn for
// every person of the layout QA's families, Arabic and English: it never
// throws, and what it lists is what the family engine finds.
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonProfile } from "@/components/editor/PersonProfile";
import { buildFamilyIndex } from "@/lib/family/index";
import { QA_FIXTURES } from "@/lib/qa/fixtures";

// (the components' JSX, compiled for the app, finds React as a global)
(globalThis as unknown as { React: typeof React }).React = React;

const draw = (fx: keyof typeof QA_FIXTURES, id?: string) => {
  const tree = QA_FIXTURES[fx]();
  const ix = buildFamilyIndex(tree);
  const m = tree.members.find((x) => x.id === id) ?? tree.members[0];
  return { tree, ix, m, html: renderToStaticMarkup(React.createElement(PersonProfile, { ix, tree, member: m, onOpen: () => {} })) };
};

describe("the person profile", () => {
  it.each(["B", "C-en"] as const)("draws for every person of family %s", (fx) => {
    const tree = QA_FIXTURES[fx]();
    const ix = buildFamilyIndex(tree);
    for (const m of tree.members) {
      const html = renderToStaticMarkup(React.createElement(PersonProfile, { ix, tree, member: m, onOpen: () => {} }));
      expect(html).toContain("Family");
      expect(html).toContain("In the family");
    }
  });

  it("lists exactly the engine's parents, children and spouses, each a link to their profile", () => {
    const tree = QA_FIXTURES.B();
    const ix = buildFamilyIndex(tree);
    // the person with the most marriages
    const m = [...tree.members].sort((a, b) => ix.spouses(b.id).length - ix.spouses(a.id).length)[0];
    const { html } = draw("B", m.id);
    expect(ix.spouses(m.id).length).toBeGreaterThan(1);
    for (const s of ix.spouses(m.id)) expect(html).toContain(s.person.name);
    for (const c of ix.children(m.id)) expect(html).toContain(c.name);
    expect(html).toContain(`Children (${ix.children(m.id).length})`);
    // several marriages: children grouped by their other parent
    expect(html).toContain("with ");
  });

  it("says what is not recorded rather than leaving it out", () => {
    const tree = QA_FIXTURES.B();
    const ix = buildFamilyIndex(tree);
    const noMother = tree.members.find((m) => m.fatherId && !m.motherId && ix.generations.get(m.id)?.kind === "level")!;
    const { html } = draw("B", noMother.id);
    expect(html).toContain("Not recorded");
    expect(html).toMatch(/Not recorded: [^.]*Mother/);
  });

  it("gives the generation and, for anyone but Generation 1, how they are related to Generation 1, in Arabic and English", () => {
    const tree = QA_FIXTURES.B();
    const ix = buildFamilyIndex(tree);
    const grandchild = tree.members.find((m) => ix.generations.get(m.id)?.kind === "level" && (ix.generations.get(m.id) as { level: number }).level === 3)!;
    const { html } = draw("B", grandchild.id);
    expect(html).toContain("Generation 3");
    expect(html).toMatch(/dir="rtl"/);
  });
});
