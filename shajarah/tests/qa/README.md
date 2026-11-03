# Layout QA suite

A repeatable check of the finished posters' geometry: crossings, lines under
names, lines running together, false junctions, near misses, overlapping
names, and the foundation against the canopy and the footer. It **reports
only**; it never changes a layout.

## What it runs

| | |
| --- | --- |
| Families | `src/lib/qa/fixtures.ts`: **A** balanced, **B** complex (three wives with marriage years, a wife's later husband, half-siblings, daughters married out, children of an unrecorded father), **C** stress (nine uneven branches, one seven generations deep, long names, long trunk and foundation), **C-en** the stress family in English |
| Display modes | males only · daughters · spouses · all (daughters, spouses and daughters' families) |
| Designs | all seven, each with its suggested foundation |
| Papers | A3 and A1; the stress family also on 2A0 and 4A0 (the app goes up to 1024A0) |
| Foundation stage | the stress family, everything shown, on A2, in all six foundation styles × seven designs |

322 cases in all, about 2½ minutes on four cores.

## Checks (`src/lib/qa/layoutQa.ts`)

- **Defects**: every relationship-clarity issue (a connection missing or from
  the wrong parent, a line not ending at its name, a line under an unrelated
  name, any line crossing another (brothers' and sisters' lines from where
  they leave their parent's name, steep crossings too), two lines running together, a
  false junction, the trunk out of order); names overlapping; the foundation's
  text overlapping itself, the canopy or the footer's key.
- **For review**: clear crossings listed again on their own (each is also a
  defect), and near misses (two unrelated lines under 0.6 mm apart at print size).
- **Legibility**: whether the names stay at the legible size. A dense poster
  that cannot be both clean and legible is laid out one way or the other;
  the report shows which.

## Running it

```sh
QA_LAYOUT=1 QA_OUT=qa-report npx vitest run tests/qa      # lay out, inspect, compare with the baseline
node scripts/qa-report.mjs qa-report                      # contact sheets, close-ups, full-size renders
```

(`npm run qa:layout` does both. The report needs Playwright with Chromium; set
`PLAYWRIGHT_MODULE` to its `index.mjs` if it is installed globally.)

`qa-report/index.html` has, per family and paper, a sheet of the four modes ×
seven designs with each case's counts; a close-up of every defect (up to six
per case) and of two findings for review per case; and the hardest cases
rendered at 300 DPI across the paper's width.

## Regression baseline

`tests/qa/layout-baseline.json` records each case's defects by kind and
whether its names were legible. A run fails when a case has more defects of
any kind than recorded, or a legible case becomes illegible. After a change
that is meant to alter the results, review the report, then record the new
baseline with `QA_UPDATE=1`.
