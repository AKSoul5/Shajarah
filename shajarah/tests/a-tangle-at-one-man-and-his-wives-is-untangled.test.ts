// Problems that all lie among one man's lines and his wives' boxes count as
// one tangle, which the untangling takes on however many there are. A
// canopy base's lines to his two wives' boxes and to his sons with no
// mother recorded ran together in five places (a 340-person family, every
// one shown): more than the four problems the untangling takes on
// otherwise, so it never ran; once it did, moving one wife's box a little
// further out cleared all five (that family is private; checked locally,
// all 13 of its variants clean). The ids here are invented.
import { describe, expect, it } from "vitest";
import { isOneTangle } from "@/lib/layout/botanical";
import type { ClarityReport } from "@/lib/layout/clarity";

type Issue = ClarityReport["issues"][number];
const merge = (a: [string, string], b: [string, string]): Issue => ({ kind: "merge", edge: a, other: b });

describe("a tangle at one man and his wives' boxes is untangled", () => {
  const base = "m1", w1 = `spouse:${base}:w1`, w2 = `spouse:${base}:w2`;
  const five: Issue[] = [
    merge([base, w2], [base, w1]),
    merge([base, "s1"], [w1, "s9"]),
    merge([base, "s2"], [w1, "s9"]),
    merge([base, "s3"], [w1, "s9"]),
    merge([base, "s4"], [w1, "s9"]),
  ];
  it("five problems among one man's lines and his wives' boxes are one tangle", () => {
    expect(isOneTangle(five)).toBe(true);
  });
  it("not when another family's lines are in it", () => {
    expect(isOneTangle([...five, merge(["m2", "x1"], ["m2", "x2"])])).toBe(false);
  });
  it("not without a wife's box: a crowded man's own lines are crowding", () => {
    expect(isOneTangle([merge([base, "s1"], [base, "s2"]), merge([base, "s3"], [base, "s4"]), merge([base, "s5"], [base, "s6"]), merge([base, "s7"], [base, "s8"]), merge([base, "s9"], [base, "s10"])])).toBe(false);
  });
  it("not with a line under a name (room, not untangling, is the remedy)", () => {
    expect(isOneTangle([...five, { kind: "occlusion", edge: [w1, "s9"], other: "s3" }])).toBe(false);
  });
  it("as before: lines from one or two places crossing one another", () => {
    const c = (p: string, a: string, b: string): Issue => ({ kind: "crossing", edge: [p, a], other: [p, b], detail: "between siblings" });
    expect(isOneTangle([c("a", "1", "2"), c("a", "3", "4"), c("b", "5", "6")])).toBe(true);
    expect(isOneTangle([c("a", "1", "2"), c("b", "3", "4"), c("c", "5", "6")])).toBe(false);
  });
  it("at most twelve", () => {
    expect(isOneTangle(Array.from({ length: 13 }, () => five[1]))).toBe(false);
  });
});
