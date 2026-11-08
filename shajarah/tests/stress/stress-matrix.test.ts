// The poster stress test (tests/stress/README.md). Runs only with STRESS=1:
//   STRESS_PART   primary | designs | modes
//   STRESS_FAMILY comma-separated family ids (default: all ten)
//   STRESS_OUT    where results go (default stress-report)
// Every case is appended to <out>/<part>.jsonl; a resumed run skips the
// cases already recorded.
import { describe, it } from "vitest";
import { PAPER_ORDER, PAPER_SIZES, type PaperSize } from "@/lib/paper";
import { NODE_DESIGNS, THEME_PRESETS } from "@/lib/theme";
import { SOIL_STYLE_ORDER } from "@/lib/layout/soil";
import { STRESS_FAMILY_IDS, type StressFamilyId } from "@/lib/qa/stressFamilies";
import type { ThemePreset } from "@/lib/types";
import { OUT, caseId, record, recorded, runStressCase, type CaseRow, type CaseSpec } from "./run";

const ENABLED = process.env.STRESS === "1";
const PART = process.env.STRESS_PART ?? "primary";
const FAMILIES = (process.env.STRESS_FAMILY?.split(",") ?? STRESS_FAMILY_IDS) as StressFamilyId[];
const PRESETS = Object.keys(THEME_PRESETS) as ThemePreset[];

/** Each family's reference paper for the design and mode parts: where its default poster is meant to be read. */
export const REFERENCE_PAPER: Record<StressFamilyId, PaperSize> = {
  tiny: "A3", small: "A3", daughters: "A1", sons: "A1", spouses: "A2", medium: "A1", large: "A0", huge: "2A0", wide: "A0", deep: "A0",
};

/** A small covering array: every pair of values of any two factors appears in at least one row. */
export function pairwise<T extends Record<string, readonly unknown[]>>(factors: T): { [K in keyof T]: T[K][number] }[] {
  const keys = Object.keys(factors) as (keyof T & string)[];
  const uncovered = new Set<string>();
  const pairKey = (a: keyof T, va: number, b: keyof T, vb: number) => `${String(a)}=${va}|${String(b)}=${vb}`;
  keys.forEach((a, i) => keys.slice(i + 1).forEach((b) => factors[a].forEach((_, va) => factors[b].forEach((__, vb) => uncovered.add(pairKey(a, va, b, vb))))));
  const rows: Record<keyof T, number>[] = [];
  while (uncovered.size) {
    const row = {} as Record<keyof T, number>;
    for (const k of keys) {
      let best = 0, bestGain = -1;
      factors[k].forEach((_, v) => {
        let gain = 0;
        for (const done of keys) {
          if (done === k || row[done] === undefined) continue;
          const [a, b] = keys.indexOf(done) < keys.indexOf(k) ? [done, k] : [k, done];
          if (uncovered.has(pairKey(a, a === k ? v : row[a], b, b === k ? v : row[b]))) gain++;
        }
        // (the first factor: the value in the most uncovered pairs)
        if (Object.keys(row).length === 0) gain = [...uncovered].filter((p) => p.startsWith(`${String(k)}=${v}|`)).length;
        if (gain > bestGain) { bestGain = gain; best = v; }
      });
      row[k] = best;
    }
    keys.forEach((a, i) => keys.slice(i + 1).forEach((b) => uncovered.delete(pairKey(a, row[a], b, row[b]))));
    rows.push(row);
  }
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, factors[k][r[k]]])) as { [K in keyof T]: T[K][number] });
}

const file = `${OUT}/${PART}.jsonl`;

describe.skipIf(!ENABLED)(`poster stress test: ${PART}`, () => {
  const done = recorded(file);
  const run = (s: CaseSpec): CaseRow => {
    const id = caseId(s);
    const had = done.get(id);
    if (had) return had;
    const row = runStressCase(s);
    record(file, row);
    done.set(id, row);
    return row;
  };

  if (PART === "primary") {
    // every family × design × paper, everything shown. Papers are laid out
    // from the smallest up; once two sizes in a row give the same poster
    // (names at their full size, nothing left to gain) the largest paper is
    // laid out too, and when it is the same again the sizes between are
    // recorded as that same poster (verified at both ends), not skipped.
    for (const family of FAMILIES) for (const preset of PRESETS) {
      it(`${family} ${preset}`, { timeout: 24 * 3600_000 }, () => {
        const spec = (paper: PaperSize): CaseSpec => ({ family, lang: "ar", preset, paper, mode: "all" });
        let prev: CaseRow | null = null;
        for (let i = 0; i < PAPER_ORDER.length; i++) {
          const row = run(spec(PAPER_ORDER[i]));
          if (prev && !row.error && row.hash === prev.hash && row.legible && i < PAPER_ORDER.length - 1) {
            const top = run(spec(PAPER_ORDER[PAPER_ORDER.length - 1]));
            if (top.hash === row.hash) {
              for (const p of PAPER_ORDER.slice(i + 1, -1)) {
                const id = caseId(spec(p));
                if (!done.has(id)) {
                  // (the same poster: its names scale with the paper)
                  const k = PAPER_SIZES[p].w / PAPER_SIZES[row.spec.paper].w;
                  const eq: CaseRow = { ...row, id, spec: spec(p), ms: 0, heapMB: 0, svgFile: undefined, equivalentTo: row.id, textMm: +((row.textMm ?? 0) * k).toFixed(2) };
                  record(file, eq);
                  done.set(id, eq);
                }
              }
              break;
            }
          }
          prev = row;
        }
      });
    }
  }

  if (PART === "designs") {
    // every name design × every foundation, at the family's reference paper
    for (const family of FAMILIES) for (const nodeShape of NODE_DESIGNS) {
      it(`${family} ${nodeShape}`, { timeout: 24 * 3600_000 }, () => {
        for (const soilStyle of SOIL_STYLE_ORDER) run({ family, lang: "ar", preset: "refined", paper: REFERENCE_PAPER[family], mode: "all", nodeShape, soilStyle });
      });
    }
  }

  if (PART === "modes") {
    // the poster's modes, every pair of their values together at least once
    const rows = pairwise({
      mode: ["sons", "daughters", "spouses", "all"] as const, lang: ["ar", "en"] as const, branch: [false, true] as const,
      lineage: ["PATRILINEAL", "MATRILINEAL"] as const, labelMode: ["name", "withFather"] as const, showYears: [false, true] as const,
      spouseStyle: ["manuscript", "capsule", "inscribed"] as const, trunkStyle: ["badges", "carved"] as const, preset: PRESETS,
    });
    for (const family of FAMILIES) {
      it(`${family} modes (${rows.length} combinations)`, { timeout: 24 * 3600_000 }, () => {
        for (const r of rows) run({ family, paper: REFERENCE_PAPER[family], ...r, preset: r.preset as ThemePreset });
      });
    }
  }
});
