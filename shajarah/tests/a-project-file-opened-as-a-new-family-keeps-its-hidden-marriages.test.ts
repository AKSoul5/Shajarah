// A marriage hidden from the poster (settings.hiddenSpouses, "partner:spouse"
// id pairs) stays hidden when the family's project file is opened as a new
// family. Opening gives every record a new id (withNewIds), and the pairs
// were left with the old ids, so they matched no one: every hidden marriage
// came back on the poster.
import { describe, expect, it } from "vitest";
import { makeProjectFile, readProjectFile, withNewIds } from "@/lib/project";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { TreeDTO } from "@/lib/types";

describe("a project file opened as a new family keeps its hidden marriages", () => {
  it("each hidden pair names the same two people under their new ids", () => {
    const base = QA_FIXTURES.B();
    const [a, b, c] = base.members.filter((m) => m.gender === "MALE").slice(0, 3);
    const tree = { ...base, settings: { showFemales: true, hiddenSpouses: [`${a.id}:${b.id}`, `${c.id}:${a.id}`] } } as TreeDTO;
    const file = readProjectFile(JSON.stringify(makeProjectFile(tree)));
    let n = 0;
    const opened = withNewIds(file.tree, () => `new-${n++}`);
    const newId = new Map(tree.members.map((m, i) => [m.id, opened.members[i].id]));
    expect(opened.settings?.hiddenSpouses).toEqual([`${newId.get(a.id)}:${newId.get(b.id)}`, `${newId.get(c.id)}:${newId.get(a.id)}`]);
  });

  it("a pair naming someone no longer in the family is dropped, not given a made-up id", () => {
    const base = QA_FIXTURES.A();
    const a = base.members[1];
    const tree = { ...base, settings: { hiddenSpouses: [`${a.id}:gone`] } } as TreeDTO;
    const opened = withNewIds(tree, (() => { let n = 0; return () => `new-${n++}`; })());
    expect(opened.settings?.hiddenSpouses).toEqual([]);
  });
});
