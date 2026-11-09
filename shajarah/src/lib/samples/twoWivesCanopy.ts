// Invented test family (no real person): a canopy base with two wives and
// seventeen children, interleaved by birth: nine by his first wife (five
// sons, three of them with large families, and four daughters, two of whom
// have families of their own, shown through them on dotted lines), five
// sons with no mother recorded, and three children by his second wife. The
// trunk is the published Al-Kalali chain from its 70th name, with other
// sons' families beside it. The arrangement under which the canopy base's
// lines to his wives' boxes once ran together in five places.
import { computeGenerations } from "@/lib/genealogy";
import { kalaliTree } from "@/lib/samples/kalali";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

const SONS = ["سالم", "عوض", "مبارك", "سعيد", "عبيد", "فرج", "حسن", "جمعان", "رمضان", "عقيل", "فضل", "نافع", "بدر", "طاهر", "نوفل", "حامد"];
const DAUGHTERS = ["مريم", "فاطمة", "عائشة", "خديجة", "زينب", "سارة", "نورة", "هند"];

/** The family, and the daughters whose families are shown through them. */
export function twoWivesCanopy(): { tree: TreeDTO; mothers: string[] } {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const crown = members[81];
  let n = 0;
  const add = (gender: Gender, fatherId: string | null, motherId: string | null = null) => {
    const list = gender === "MALE" ? SONS : DAUGHTERS;
    const m: MemberDTO = { ...members[0], id: `w${n}`, name: list[(n * 7) % list.length], laqab: null, gender, fatherId, motherId, birthOrder: n };
    n++;
    members.push(m);
    return m;
  };
  const marriages: MarriageDTO[] = [];
  const marry = (a: MemberDTO, b: MemberDTO) => marriages.push({ id: `wm${marriages.length}`, spouseAId: a.id, spouseBId: b.id, startYear: null, endYear: null });
  // other sons of the trunk's ancestors: families and childless sons
  const family = (fatherId: string, sons: number, grandsons: number) => {
    const s = add("MALE", fatherId);
    for (let i = 0; i < sons; i++) {
      const g = add("MALE", s.id);
      for (let j = 0; j < (i < 2 ? grandsons : 0); j++) add("MALE", g.id);
    }
  };
  const sides: Record<number, ([number, number] | null)[]> = {
    70: [[2, 1]], 72: [null], 73: [[4, 2], null], 74: [[3, 2]], 75: [[5, 3]], 76: [[2, 2], null, [3, 1]], 77: [[4, 1]], 79: [[3, 2]], 80: [[2, 1]],
  };
  for (const [i, list] of Object.entries(sides)) for (const x of list) { if (x) family(members[+i].id, x[0], x[1]); else add("MALE", members[+i].id); }
  // the canopy base's two wives and seventeen children
  const w1 = add("FEMALE", null), w2 = add("FEMALE", null);
  marry(crown, w1);
  marry(crown, w2);
  const mothers: string[] = [];
  // [gender, wife (1, 2, or 0: not recorded), sons, grandsons for each of his first sons, children through her]
  const plan: ["M" | "F", 0 | 1 | 2, number, number, number][] = [
    ["M", 1, 1, 0, 0], ["M", 1, 8, 2, 0], ["M", 1, 0, 0, 0], ["M", 1, 8, 8, 0], ["M", 1, 7, 1, 0],
    ["F", 1, 0, 0, 9], ["F", 1, 0, 0, 1], ["F", 1, 0, 0, 0], ["F", 1, 0, 0, 0],
    ["M", 0, 0, 0, 0], ["M", 0, 0, 0, 0], ["M", 0, 0, 0, 0], ["M", 0, 0, 0, 0], ["M", 2, 0, 0, 0], ["M", 0, 0, 0, 0],
    ["F", 2, 0, 0, 0], ["F", 2, 0, 0, 0],
  ];
  for (const [g, wife, sons, grand, through] of plan) {
    const c = add(g === "M" ? "MALE" : "FEMALE", crown.id, wife === 1 ? w1.id : wife === 2 ? w2.id : null);
    for (let i = 0; i < sons; i++) {
      const s = add("MALE", c.id);
      // (the large families: grandsons for the first few sons)
      for (let j = 0; j < (i < Math.ceil(sons / 2) ? grand : 0); j++) add("MALE", s.id);
    }
    if (through) {
      const husband = add("MALE", null);
      marry(husband, c);
      for (let i = 0; i < through; i++) add(i % 3 === 2 ? "FEMALE" : "MALE", husband.id, c.id);
      mothers.push(c.id);
    }
  }
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { tree: { ...base, members, marriages, trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: true } }, mothers };
}
