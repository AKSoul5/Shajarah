// The kept layout's fingerprint (src/components/editor/layoutCache.ts): the
// same for the same family and options, different when anything the layout
// depends on changes, so a kept poster is reused only when it is exactly
// the poster that would be laid out.
import { describe, expect, it } from "vitest";
import { layoutFingerprint } from "@/components/editor/layoutCache";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

describe("the kept layout's fingerprint", () => {
  const tree = QA_FIXTURES.B();
  const options = { showFemales: true, ...layoutOptionsFor(resolveTheme(tree.settings), "A2") };
  const fp = layoutFingerprint(tree, options);

  it("is the same for the same family and options (a fresh copy too)", () => {
    expect(layoutFingerprint(structuredClone(tree), { ...options })).toBe(fp);
  });

  it("changes with a name, a parent, a marriage, a setting, the paper or the design", () => {
    const renamed = structuredClone(tree);
    renamed.members[5].name += " بن";
    const reparented = structuredClone(tree);
    reparented.members[9].motherId = null;
    const married = structuredClone(tree);
    married.marriages = married.marriages.slice(1);
    const hidden = structuredClone(tree);
    hidden.settings = { ...(hidden.settings ?? {}), hiddenIds: [tree.members[7].id] };
    const all = [
      layoutFingerprint(renamed, options),
      layoutFingerprint(reparented, options),
      layoutFingerprint(married, options),
      layoutFingerprint(hidden, options),
      layoutFingerprint(tree, { ...options, ...layoutOptionsFor(resolveTheme(tree.settings), "A1") }),
      layoutFingerprint(tree, { ...options, nodeShape: "shield" }),
    ];
    for (const other of all) expect(other).not.toBe(fp);
    expect(new Set(all).size).toBe(all.length);
  });

  it("carries the app's version: a kept layout is never reused by another version", () => {
    expect(fp.split(":")[0]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
