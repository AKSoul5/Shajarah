// Complex families (tests/complex-families.test.ts): several marriages,
// remarriage after death or divorce, step-children, half-siblings, twins and
// triplets, children with one parent recorded. Each person exists once; each
// child's parents are recorded on the child, never inferred from a
// marriage. Generic names only.
//
//  five-marriages     a daughter of the line married five times, one to
//                     three children by each husband (half-siblings)
//  childless-wives    a man with three wives, children by the second only
//  widowed            a man whose first wife died, remarried; children by both
//  divorced           a daughter divorced and remarried; children by both
//  blended            a man of the line marries a widow with children by her
//                     first husband (his step-children, not his children)
//  twins              twins and triplets (same year, their own birth order)
//  one-parent         a daughter's children with no father recorded, and a
//                     child recorded with neither parent

import { AR, Builder } from "./fixtures";
import type { MemberDTO, TreeDTO } from "../types";

export interface ComplexCase {
  tree: TreeDTO;
  /** The person the case is about. */
  focus: string;
  /** Each recorded couple with children, and the children they have together. */
  families: { parents: [string | null, string | null]; children: string[] }[];
}

function base(id: string) {
  const b = new Builder(id, AR);
  const top = b.trunk(3);
  const head = b.person("MALE", { father: top });
  const sons = [0, 1, 2].map((i) => b.person("MALE", { father: head, order: i }));
  return { b, head, sons };
}

const kids = (b: Builder, father: MemberDTO | null, mother: MemberDTO | null, n: number, from = 0, year: number | null = null) =>
  Array.from({ length: n }, (_, k) => {
    const c = b.person(k % 3 === 2 ? "FEMALE" : "MALE", { father, mother, order: from + k });
    if (year !== null) c.birthYear = year + k;
    return c;
  });

export function fiveMarriages(): ComplexCase {
  const { b, head, sons } = base("cx1");
  const her = b.person("FEMALE", { father: sons[0], order: 5 });
  const out: ComplexCase = { tree: null!, focus: her.id, families: [] };
  let order = 0;
  [1, 3, 2, 1, 2].forEach((n, i) => {
    const h = b.person("MALE", { name: AR.outside[i % AR.outside.length] + (i >= 4 ? " الثاني" : "") });
    // successive marriages, each ended before the next (dates as recorded)
    b.marry(h, her, 1980 + i * 6, i < 4 ? 1984 + i * 6 : null);
    const c = kids(b, h, her, n, order, 1981 + i * 6);
    order += n;
    out.families.push({ parents: [h.id, her.id], children: c.map((x) => x.id) });
  });
  out.tree = b.tree("خمس زيجات", head);
  return out;
}

export function childlessWives(): ComplexCase {
  const { b, head, sons } = base("cx2");
  const man = sons[1];
  const out: ComplexCase = { tree: null!, focus: man.id, families: [] };
  const wives = [0, 1, 2].map(() => b.person("FEMALE"));
  wives.forEach((w, i) => b.marry(man, w, 1970 + i * 5, null));
  const c = kids(b, man, wives[1], 3);
  out.families.push({ parents: [man.id, wives[1].id], children: c.map((x) => x.id) });
  out.tree = b.tree("زوجات بلا أبناء", head);
  return out;
}

export function widowed(): ComplexCase {
  const { b, head, sons } = base("cx3");
  const man = sons[0];
  const out: ComplexCase = { tree: null!, focus: man.id, families: [] };
  const first = b.person("FEMALE");
  first.isDeceased = true;
  first.deathYear = 1990;
  b.marry(man, first, 1975, 1990);
  const second = b.person("FEMALE");
  b.marry(man, second, 1992, null);
  out.families.push({ parents: [man.id, first.id], children: kids(b, man, first, 2, 0, 1977).map((x) => x.id) });
  out.families.push({ parents: [man.id, second.id], children: kids(b, man, second, 2, 2, 1994).map((x) => x.id) });
  out.tree = b.tree("أرمل تزوّج", head);
  return out;
}

export function divorced(): ComplexCase {
  const { b, head, sons } = base("cx4");
  const her = b.person("FEMALE", { father: sons[2], order: 4 });
  const out: ComplexCase = { tree: null!, focus: her.id, families: [] };
  const h1 = b.person("MALE", { name: AR.outside[1] }), h2 = b.person("MALE", { name: AR.outside[2] });
  b.marry(h1, her, 1980, 1986);
  b.marry(h2, her, 1988, null);
  out.families.push({ parents: [h1.id, her.id], children: kids(b, h1, her, 2, 0, 1981).map((x) => x.id) });
  out.families.push({ parents: [h2.id, her.id], children: kids(b, h2, her, 1, 2, 1990).map((x) => x.id) });
  out.tree = b.tree("مطلقة تزوّجت", head);
  return out;
}

export function blended(): ComplexCase {
  const { b, head, sons } = base("cx5");
  const man = sons[1];
  const out: ComplexCase = { tree: null!, focus: man.id, families: [] };
  const widow = b.person("FEMALE");
  const firstHusband = b.person("MALE", { name: AR.outside[3] });
  firstHusband.isDeceased = true;
  b.marry(firstHusband, widow, 1970, 1980);
  b.marry(man, widow, 1982, null);
  // her children by her first husband: his step-children, never his children
  out.families.push({ parents: [firstHusband.id, widow.id], children: kids(b, firstHusband, widow, 2, 0, 1972).map((x) => x.id) });
  out.families.push({ parents: [man.id, widow.id], children: kids(b, man, widow, 2, 0, 1984).map((x) => x.id) });
  out.tree = b.tree("أسرة ممتدة", head);
  return out;
}

export function twins(): ComplexCase {
  const { b, head, sons } = base("cx6");
  const man = sons[0];
  const out: ComplexCase = { tree: null!, focus: man.id, families: [] };
  const wife = b.person("FEMALE");
  b.marry(man, wife, 1995, null);
  const t2 = kids(b, man, wife, 2, 0).map((c) => ((c.birthYear = 2001), c));
  const t3 = kids(b, man, wife, 3, 2).map((c) => ((c.birthYear = 2005), c));
  out.families.push({ parents: [man.id, wife.id], children: [...t2, ...t3].map((x) => x.id) });
  out.tree = b.tree("توائم", head);
  return out;
}

export function oneParent(): ComplexCase {
  const { b, head, sons } = base("cx7");
  const her = b.person("FEMALE", { father: sons[1], order: 4 });
  const out: ComplexCase = { tree: null!, focus: her.id, families: [] };
  out.families.push({ parents: [null, her.id], children: kids(b, null, her, 3).map((x) => x.id) });
  // a child recorded with neither parent (a record still to link): never placed by guess
  const orphan = b.person("MALE");
  out.families.push({ parents: [null, null], children: [orphan.id] });
  out.tree = b.tree("والد غير مسجّل", head);
  return out;
}

export const COMPLEX_FIXTURES = {
  "five-marriages": fiveMarriages,
  "childless-wives": childlessWives,
  widowed,
  divorced,
  blended,
  twins,
  "one-parent": oneParent,
} as const;
