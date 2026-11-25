// Stand-in for the private family's shape (invented neutral names): a large
// canopy base with many childless sons, and three daughters on the 2nd ring
// whose families are shown through them.
import { naturalFamily } from "@/lib/samples/natural";
import { computeGenerations } from "@/lib/genealogy";
import type { MemberDTO, TreeDTO } from "@/lib/types";

export function standIn(seed: number, extraSons = 12, size = 300, wifeShare = 0.25): TreeDTO {
  const t = naturalFamily(size, seed);
  const members = t.members.map((m) => ({ ...m }));
  const root = members[0];
  let n = 0;
  const mk = (name: string, female: boolean, fatherId: string | null, motherId: string | null, order: number): MemberDTO => {
    const m: MemberDTO = { id: `si-${++n}`, name, laqab: null, gender: female ? "FEMALE" : "MALE", birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId };
    members.push(m); return m;
  };
  const rootKids = members.filter((m) => m.fatherId === root.id).length;
  for (let i = 0; i < extraSons; i++) mk(["سالم","مبارك","زيد","هاشم","وليد","نايف","طلال","بندر","غازي","جابر","عادل","رائد"][i % 12], false, root.id, null, rootKids + i);
  // daughters two generations below the root (2nd ring)
  const fathers = new Set(members.map((m) => m.fatherId));
  const sons = members.filter((m) => m.fatherId === root.id && fathers.has(m.id));
  const daughters = [sons[0], sons[Math.floor(sons.length / 2)], sons[sons.length - 1]].map((f, k) =>
    mk(["هند","ريم","مها"][k], true, f.id, null, members.filter((m) => m.fatherId === f.id).length));
  const marriages: TreeDTO["marriages"] = [];
  daughters.forEach((d, k) => {
    const h = mk(["حمزة","أنس","مازن"][k], false, null, null, 0);
    marriages.push({ id: `mar-${k}`, spouseAId: h.id, spouseBId: d.id, startYear: null, endYear: null });
    const kids = [4, 5, 3][k];
    for (let i = 0; i < kids; i++) {
      const c = mk(["ياسر","لينا","كريم","دانة","سامي"][i], i % 2 === 1, h.id, d.id, i);
      if (i === 0) for (let j = 0; j < 2; j++) mk(["رامي","جود"][j], j === 1, c.id, null, j);
    }
  });
  // a recorded wife for every father in the line (spouses shown draws her box)
  const W = ["أمل","سلمى","وفاء","رنا","هدى","نجلاء","عبير","سمر"];
  const lineFathers = [...new Set(members.filter((m) => m.fatherId && !m.motherId).map((m) => m.fatherId!))];
  let wr = seed * 7919;
  const rnd = () => ((wr = (wr * 16807) % 2147483647) / 2147483647);
  lineFathers.filter(() => rnd() < wifeShare).forEach((fid, k) => {
    const w = mk(W[k % W.length], true, null, null, 0);
    marriages.push({ id: `mw-${k}`, spouseAId: fid, spouseBId: w.id, startYear: null, endYear: null });
    for (const c of members) if (c.fatherId === fid && !c.motherId && c.id !== w.id) c.motherId = w.id;
  });
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...t, members, marriages, settings: { ...t.settings, familiesThrough: daughters.map((d) => d.id) } } as TreeDTO;
}
