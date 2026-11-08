// The ten synthetic families of the poster stress test (src/lib/qa/stressFamilies.ts):
// each is a valid genealogy and has the make-up it is meant to test, in
// Arabic and in English (the same family: the names differ, nothing else).
import { describe, expect, it } from "vitest";
import { STRESS_FAMILIES, STRESS_FAMILY_IDS, composition, validateFamily, type Lang } from "@/lib/qa/stressFamilies";

const WANT: Record<(typeof STRESS_FAMILY_IDS)[number], (c: ReturnType<typeof composition>) => void> = {
  tiny: (c) => { expect(c.people).toBeGreaterThanOrEqual(3); expect(c.people).toBeLessThanOrEqual(5); expect(c.marriages).toBe(1); },
  small: (c) => { expect(c.people).toBeGreaterThanOrEqual(10); expect(c.people).toBeLessThanOrEqual(15); expect(Math.abs(c.femaleShare - 0.5)).toBeLessThan(0.1); expect(c.marriages).toBeGreaterThan(1); },
  daughters: (c) => { expect(c.femaleShare).toBeGreaterThanOrEqual(0.7); expect(c.generationsBelowCrown).toBeGreaterThanOrEqual(3); },
  sons: (c) => { expect(1 - c.femaleShare).toBeGreaterThanOrEqual(0.7); expect(c.generationsBelowCrown).toBeGreaterThanOrEqual(3); },
  spouses: (c) => { expect(c.people).toBeGreaterThanOrEqual(30); expect(c.people).toBeLessThanOrEqual(50); expect(c.menWithSeveralWives).toBeGreaterThanOrEqual(3); expect(c.womenMarriedTwice).toBeGreaterThanOrEqual(1); },
  medium: (c) => { expect(c.people).toBeGreaterThanOrEqual(60); expect(c.people).toBeLessThanOrEqual(80); expect(c.generationsBelowCrown).toBeGreaterThanOrEqual(4); expect(c.generationsBelowCrown).toBeLessThanOrEqual(5); expect(Math.abs(c.femaleShare - 0.5)).toBeLessThan(0.1); },
  large: (c) => { expect(c.people).toBeGreaterThanOrEqual(150); expect(c.people).toBeLessThanOrEqual(200); expect(c.menWithSeveralWives).toBeGreaterThanOrEqual(2); expect(c.largestSiblingGroup).toBeGreaterThanOrEqual(8); },
  huge: (c) => { expect(c.people).toBeGreaterThanOrEqual(300); expect(c.people).toBeLessThanOrEqual(500); expect(Math.abs(c.femaleShare - 0.5)).toBeGreaterThanOrEqual(0.05); expect(c.generationsBelowCrown).toBeGreaterThanOrEqual(6); },
  wide: (c) => { expect(c.people).toBeGreaterThanOrEqual(100); expect(c.people).toBeLessThanOrEqual(200); expect(c.generationsBelowCrown).toBeLessThanOrEqual(3); expect(c.largestSiblingGroup).toBeGreaterThanOrEqual(12); },
  deep: (c) => { expect(c.people).toBeGreaterThanOrEqual(100); expect(c.people).toBeLessThanOrEqual(200); expect(c.generationsBelowCrown).toBeGreaterThanOrEqual(10); expect(c.menWithSeveralWives).toBeGreaterThanOrEqual(1); },
};

describe("the stress-test families", () => {
  for (const id of STRESS_FAMILY_IDS) for (const lang of ["ar", "en"] as Lang[]) {
    it(`${id} (${lang}): a valid genealogy with the make-up it tests`, () => {
      const t = STRESS_FAMILIES[id](lang);
      expect(validateFamily(t)).toEqual([]);
      WANT[id](composition(t));
    });
  }
  it("each family is the same every run, and the same in both languages", () => {
    for (const id of STRESS_FAMILY_IDS) {
      const a = STRESS_FAMILIES[id]("ar"), b = STRESS_FAMILIES[id]("ar"), en = STRESS_FAMILIES[id]("en");
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const shape = (t: typeof a) => t.members.map((m) => [m.gender, m.fatherId?.replace(/^sf\d+-\w+-/, ""), m.motherId?.replace(/^sf\d+-\w+-/, ""), m.birthOrder].join());
      expect(shape(en)).toEqual(shape(a));
    }
  });
  it("names of every length: short, long, compound and with a laqab", () => {
    const all = STRESS_FAMILY_IDS.flatMap((id) => STRESS_FAMILIES[id]("ar").members);
    expect(all.some((m) => m.name.length <= 3)).toBe(true);
    expect(all.some((m) => m.name.includes(" "))).toBe(true);
    expect(all.some((m) => m.laqab)).toBe(true);
    const en = STRESS_FAMILY_IDS.flatMap((id) => STRESS_FAMILIES[id]("en").members);
    expect(en.some((m) => m.name.includes("-"))).toBe(true);
  });
});
