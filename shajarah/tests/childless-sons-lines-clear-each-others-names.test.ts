// A childless son's line from one ancestor's badge does not run under the
// name of the next ancestor's childless son. On a 15-ancestor trunk with
// English names the line from one badge to its son's name ran under the
// medallion of the son of the badge below (A1 to A3), because each stub's
// angle is a share of its own badge's range and the higher one was aimed
// lower. A stub's way is now chosen clear of the stubs placed before it,
// and their lines clear of its name. Arabic is checked too: there the two
// such stubs now stand one above the other instead of one line passing
// close over the other's name. The family is invented (the crowded trunk
// of side-branches-start-at-their-badge.test.ts, and an English copy).
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

function crowdedTrunk(): TreeDTO {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  let n = 0;
  const add = (name: string, fatherId: string) => {
    const m: MemberDTO = { ...members[0], id: `t${n++}`, name, laqab: null, gender: "MALE", fatherId, motherId: null, birthOrder: 100 + n };
    members.push(m);
    return m;
  };
  const names = ["سالم", "عوض", "مبارك", "سعيد", "عبيد", "فرج", "حسن", "جمعان", "رمضان", "عقيل", "فضل", "نافع"];
  const family = (fatherId: string, sons: number, grandsons: number) => {
    const s = add(names[n % names.length], fatherId);
    for (let i = 0; i < sons; i++) {
      const g = add(names[(n + i) % names.length], s.id);
      for (let j = 0; j < (i < 2 ? grandsons : 0); j++) add(names[(n + j + 3) % names.length], g.id);
    }
  };
  // (index on the trunk → his other sons: [sons, grandsons] a family, null a childless son)
  const plan: Record<number, ([number, number] | null)[]> = {
    70: [[2, 1]], 72: [null], 73: [[4, 2], null, [2, 0]], 74: [[3, 2]], 75: [[5, 3]],
    76: [[2, 2], null, [3, 1]], 77: [[4, 1]], 78: [null], 79: [[3, 2], [2, 1]], 80: [[2, 1]],
  };
  for (const [i, sons] of Object.entries(plan)) {
    for (const s of sons) {
      if (s) family(members[+i].id, s[0], s[1]);
      else add(names[n % names.length], members[+i].id);
    }
  }
  // the canopy base's own family
  const crown = members[81];
  for (let i = 0; i < 4; i++) family(crown.id, 3, 1);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, marriages: [], trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: false } };
}


const LATIN = ["Salim", "Awad", "Mubarak", "Said", "Ubaid", "Faraj", "Hasan", "Juman", "Ramadan", "Aqil", "Fadl", "Nafi", "Muhammad", "Ali", "Umar", "Ahmad", "Ibrahim", "Ismail", "Yusuf", "Khalid", "Nasir", "Hamid", "Badr", "Tahir", "Nawfal", "Zayd", "Amir", "Malik", "Harith", "Qays", "Hud", "Saleh", "Yahya", "Zakariya", "Ishaq", "Yaqub", "Musa", "Harun", "Dawud", "Sulayman", "Idris", "Nuh", "Adam", "Shith", "Anush", "Qaynan", "Mahlail", "Yarid", "Akhnukh", "Lamk", "Sam", "Arfakhshad", "Shalikh", "Abir", "Qahtan", "Yarub", "Yashjub", "Saba", "Himyar", "Kahlan"];
// (an English version: every distinct name given an invented Latin one, so the poster reads left to right)
const english = (t: TreeDTO): TreeDTO => {
  const map = new Map<string, string>();
  for (const m of t.members) if (!map.has(m.name)) map.set(m.name, LATIN[map.size % LATIN.length] + (map.size >= LATIN.length ? ` ${Math.floor(map.size / LATIN.length) + 1}` : ""));
  return { ...t, title: "The Family", members: t.members.map((m) => ({ ...m, name: map.get(m.name)!, laqab: null })) };
};
const lay = (tree: TreeDTO, paper: string): PosterLayout => {
  const settings = { ...tree.settings, theme: { preset: "refined" } } as TreeDTO["settings"];
  return computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), paper as never));
};
/** Stub lines passing within a stub medallion that is not their own (as drawn). */
const stubLinesUnderStubs = (l: PosterLayout) => {
  const stubIds = new Set(l.stubs.map((s) => s.id));
  const out: string[] = [];
  for (const e of l.edges) {
    if (!stubIds.has(e.childId)) continue;
    const pts = e.points.slice(0, -1);
    for (const s of l.stubs) {
      if (s.id === e.childId) continue;
      const r = s.w / 2 + e.w1 / 2;
      for (let i = 1; i < pts.length; i++) {
        for (const t of [0, 0.25, 0.5, 0.75]) {
          const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
          if (Math.hypot(x - s.x, y - s.y) < r) { out.push(`${e.childId} under ${s.id}`); i = pts.length; break; }
        }
      }
    }
  }
  return out;
};

describe("a childless son's line clears his neighbours' names", () => {
  const ar = crowdedTrunk();
  const en = english(ar);
  for (const [lang, tree] of [["en", en], ["ar", ar]] as const) {
    for (const paper of ["A1", "A2", "A3"]) {
      it(`${lang}, ${paper}`, { timeout: 600_000 }, () => {
        const l = lay(tree, paper);
        expect(l.stubs.length).toBeGreaterThan(3);
        expect(stubLinesUnderStubs(l)).toEqual([]);
        const stubIds = new Set(l.stubs.map((s) => s.id));
        // no problem on any stub's own line
        expect(l.clarity.issues.filter((i) => Array.isArray(i.edge) && stubIds.has(String(i.edge[1])))).toEqual([]);
        expect(l.overlaps).toBe(0);
        if (paper === "A1") {
          // the legible paper for both: clean, names no smaller than before
          expect(l.clarity.issues).toEqual([]);
          expect(l.legibility.ok).toBe(true);
          expect(l.legibility.smallestTextMm).toBeGreaterThanOrEqual(lang === "en" ? 3.78 - 0.01 : 4.95 - 0.01);
        }
      });
    }
  }
  // Not yet fixed: in English on A2 and A3 (both below the legible size, so
  // not offered for this family) a side family's line, to its leaf
  // "Mubarak 2", clips the medallion of the childless son "Salim 2" next to
  // it. A separate defect (a side branch's line, not a stub's); when fixed,
  // this expected failure fails and must become an ordinary check.
  for (const paper of ["A2", "A3"]) {
    it.fails(`en, ${paper}: no line under a childless son's name (known defect)`, { timeout: 600_000 }, () => {
      const l = lay(english(crowdedTrunk()), paper);
      const stubIds = new Set(l.stubs.map((s) => s.id));
      expect(l.clarity.issues.filter((i) => stubIds.has(String(i.other)))).toEqual([]);
    });
  }
});
