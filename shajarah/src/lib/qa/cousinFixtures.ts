// Families where spouses are already related: cousin marriages, shared
// ancestors and pedigree collapse (tests/cousin-marriages.test.ts). Every
// person exists once; a marriage and a child's parents always point at the
// people already recorded. Generic names only.
//
//  1 first-cousins       a son of one brother marries a daughter of another
//  2 second-cousins      their grandchildren marry
//  3 many-children       first cousins with five children, sons and daughters
//  4 two-roles           a woman who is a daughter in her own branch and a
//                        wife in her cousin's, married before to a man of
//                        another family with a child by him
//  5 several-marriages   three cousin marriages across the branches
//  6 several-paths       two brothers marry two sisters (their cousins), and
//                        those couples' children (double cousins) marry:
//                        the couple shares grandparents by every line
//  7 related-twice       the child of fixture 6's couple, whose parents are
//                        related through more than one ancestral line
//  8 large               a large family with eight marriages between branches

import { AR, Builder } from "./fixtures";
import type { MemberDTO, TreeDTO } from "../types";

export interface CousinCase {
  tree: TreeDTO;
  /** The couples who were related before they married: [husband, wife]. */
  couples: [string, string][];
  /** Children of those couples. */
  children: string[];
}

/** A patriarch under a short trunk, with `sons` sons; each son with two sons and a daughter. */
function family(id: string, sons = 3) {
  const b = new Builder(id, AR);
  const top = b.trunk(3);
  const head = b.person("MALE", { father: top });
  const branches = Array.from({ length: sons }, (_, i) => {
    const son = b.person("MALE", { father: head, order: i });
    const wife = b.person("FEMALE");
    b.marry(son, wife);
    const kids = [
      b.person("MALE", { father: son, mother: wife, order: 0 }),
      b.person("MALE", { father: son, mother: wife, order: 1 }),
      b.person("FEMALE", { father: son, mother: wife, order: 2 }),
    ];
    return { son, wife, kids };
  });
  return { b, head, branches };
}

/** A couple who were related before: married, and their children recorded with both parents. */
function marryCousins(b: Builder, husband: MemberDTO, wife: MemberDTO, children: number, out: CousinCase) {
  b.marry(husband, wife);
  out.couples.push([husband.id, wife.id]);
  for (let k = 0; k < children; k++) {
    const c = b.person(k === children - 1 && children > 1 ? "FEMALE" : "MALE", { father: husband, mother: wife, order: k });
    out.children.push(c.id);
  }
}

export function firstCousins(): CousinCase {
  const { b, head, branches } = family("cz1");
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  marryCousins(b, branches[0].kids[0], branches[1].kids[2], 2, out);
  out.tree = b.tree("أبناء العمومة", head);
  return out;
}

export function secondCousins(): CousinCase {
  const { b, head, branches } = family("cz2");
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  // a grandson of the first son, a granddaughter of the second
  const g1 = b.person("MALE", { father: branches[0].kids[1] });
  const g2 = b.person("FEMALE", { father: branches[1].kids[0] });
  marryCousins(b, g1, g2, 1, out);
  out.tree = b.tree("أبناء العمومة من الدرجة الثانية", head);
  return out;
}

export function manyChildren(): CousinCase {
  const { b, head, branches } = family("cz3");
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  marryCousins(b, branches[2].kids[0], branches[0].kids[2], 5, out);
  out.tree = b.tree("ذرية زواج الأقارب", head);
  return out;
}

export function twoRoles(): CousinCase {
  const { b, head, branches } = family("cz4");
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  const her = branches[1].kids[2];
  // married first to a man of another family, a son by him
  const first = b.person("MALE", { name: AR.outside[0] });
  b.marry(first, her, 1980, 1985);
  b.person("MALE", { father: first, mother: her });
  // then to her cousin, children by him
  marryCousins(b, branches[0].kids[0], her, 2, out);
  out.tree = b.tree("ابنة وزوجة", head);
  return out;
}

export function severalMarriages(): CousinCase {
  const { b, head, branches } = family("cz5", 4);
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  marryCousins(b, branches[0].kids[0], branches[1].kids[2], 2, out);
  marryCousins(b, branches[2].kids[1], branches[3].kids[2], 1, out);
  marryCousins(b, branches[3].kids[0], branches[0].kids[2], 3, out);
  out.tree = b.tree("زيجات بين الفروع", head);
  return out;
}

/** Fixture 6's family, and the couple of double cousins. */
function doubleCousins(id: string) {
  const { b, head, branches } = family(id);
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  // two sisters of the third branch marry two cousins, brothers of the first
  const sister2 = b.person("FEMALE", { father: branches[2].son, mother: branches[2].wife, order: 3 });
  const [brotherA, brotherB] = branches[0].kids;
  const sisterA = branches[2].kids[2];
  marryCousins(b, brotherA, sisterA, 0, out);
  marryCousins(b, brotherB, sister2, 0, out);
  // their children: double cousins (the same four grandparents)
  const son = b.person("MALE", { father: brotherA, mother: sisterA });
  const daughter = b.person("FEMALE", { father: brotherB, mother: sister2 });
  return { b, head, out, son, daughter };
}

export function severalPaths(): CousinCase {
  const { b, head, out, son, daughter } = doubleCousins("cz6");
  marryCousins(b, son, daughter, 0, out);
  out.tree = b.tree("أنساب متعددة", head);
  return out;
}

export function relatedTwice(): CousinCase {
  const { b, head, out, son, daughter } = doubleCousins("cz7");
  marryCousins(b, son, daughter, 2, out);
  out.tree = b.tree("قرابة من جهتين", head);
  return out;
}

export function largeFamily(): CousinCase {
  const b = new Builder("cz8", AR);
  const out: CousinCase = { tree: null!, couples: [], children: [] };
  const top = b.trunk(4);
  const head = b.person("MALE", { father: top });
  // six branches, three generations each, a daughter in most families
  const byGen: MemberDTO[][] = [[head]];
  for (let g = 0; g < 3; g++) {
    const next: MemberDTO[] = [];
    byGen[g].filter((p) => p.gender === "MALE").forEach((p, i) => {
      const n = g === 0 ? 6 : 2 + ((i + g) % 2);
      for (let k = 0; k < n; k++) next.push(b.person(k === n - 1 && g > 0 ? "FEMALE" : "MALE", { father: p, order: k }));
    });
    byGen.push(next);
  }
  // eight marriages between branches, each with children
  const men = byGen[3].filter((m) => m.gender === "MALE");
  const women = [...byGen[2], ...byGen[3]].filter((m) => m.gender === "FEMALE");
  const branchOf = (m: MemberDTO) => {
    let cur: MemberDTO | undefined = m;
    while (cur && cur.fatherId !== head.id) cur = b.members.find((x) => x.id === cur!.fatherId);
    return cur?.id;
  };
  let made = 0;
  for (const man of men) {
    if (made >= 8) break;
    const wife = women.find((w) => branchOf(w) !== branchOf(man) && !out.couples.some(([, x]) => x === w.id) && w.generation === man.generation);
    const sameGen = women.find((w) => branchOf(w) !== branchOf(man) && !out.couples.some(([, x]) => x === w.id) && byGen.findIndex((l) => l.includes(w)) === byGen.findIndex((l) => l.includes(man)));
    const w = sameGen ?? wife;
    if (!w) continue;
    marryCousins(b, man, w, 1 + (made % 3), out);
    made++;
  }
  out.tree = b.tree("عائلة كبيرة بزيجات بين فروعها", head);
  return out;
}

export const COUSIN_FIXTURES = {
  "first-cousins": firstCousins,
  "second-cousins": secondCousins,
  "many-children": manyChildren,
  "two-roles": twoRoles,
  "several-marriages": severalMarriages,
  "several-paths": severalPaths,
  "related-twice": relatedTwice,
  large: largeFamily,
} as const;
