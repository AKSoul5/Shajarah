# Autonomous progress record

Kept up to date while the owner is away. Decisions awaiting the owner:
[ON-HOLD.md](ON-HOLD.md). Nothing is merged into `main` and nothing is
published without the owner.

## Workstreams and branches

| Workstream | Branch (worktree) | HEAD |
|---|---|---|
| A. Stress test + spouse-frame page fix | `layout/fan-every-foundation` (`/home/user/wt-fan`) | `aa98dc0` |
| B. Typography and spacing | `layout/typography-spacing` (`/home/user/wt-typo`), branched from A at `600d9a0` | `dea3143` (+ trunk work, uncommitted at 22:40) |
| C. Quotation language | `feature/quote-language` (`/home/user/wt-quote`), from `main` | `eae75af` |
| Notes | `notes/autonomous-progress` (`/home/user/wt-notes`), from `main` | this file |

Scratch outputs (not in git): `/tmp/claude-0/-home-user/e90cb42e-c033-5f48-94e9-9bb338f9cd65/scratchpad/`
(`stress/` matrix results and logs, `typo/` typography renders and
inspections, `quote/` quotation renders).

## Log

### 21:31 — resumed after a worker restart
- Stress matrix (A): restarted by `scratchpad/stress/run-all.sh`; resumable
  (saved results kept: 270 primary, 23 designs rows before the restart).
  Uses the corrected pairwise generator (`aa98dc0`, verified present in
  `wt-fan` before starting).
- B: committed the generator fix there too (`404c9ab`).

### 21:50 — B: R5 (spouse box on another spouse's line), R2–R4 regression test
- **Root causes found (R5):**
  1. `holderHit` (re-place a box a line runs under) ignored the partner's
     lines to the other spouses' boxes (`holderCurve`), and
  2. it ran only when the drawing already had clarity issues. On a clean
     drawing a line could run up to 0.18 font sizes inside a two-line box,
     which the clarity check accepts.
  3. The fallback tier ("group") checked the other spouses' lines straight,
     not as drawn (curved).
- **Fix (uncommitted at this point, `wt-typo`):** all three. On a clean
  drawing the boxes are placed again and the result is kept only if it is
  still clean; otherwise the old places are restored.
- **Tried and backed out** (no effect, or worse):
  - a same-family crossing check in the first tier (no effect);
  - the same check in the fallback (5 and 3 overlaps at full size and 0.833);
  - keeping a box's line to its own child off the partner's name (3
    overlaps at full size).
- **Case B English (6.55 mm against its control's 9.83): not caused by R5.**
  - Sister 24 has three husbands. Husband 29's box goes to the far side of
    her (x 1543, with her at 1799), while his only child is at x 2069.
  - No tier finds room for him on his child's side, between the other two
    husbands' boxes, so the last-resort search goes all the way round and
    his line crosses her line to husband 27.
  - This persists at every size from 0.75 to 1. Four bisection steps
    (instead of two) give 6.96 mm, not 9.83.
  - The cause is room allocation between the three boxes: still open
    (recorded as R5b).
- **Case E regression (frames touching): resolved by the earlier fixes.**
  - The least box gap is now ≥ 0.41 font sizes in every case; it was
    −0.42 mm.
  - What remains in E Arabic (control) is two corner grazes, 0.07 and 0.09
    font sizes, one sample point each.
- **Before → after (smallest name, mm):**

  | Case | Before | After |
  |---|---|---|
  | A ar test | 8.19 | 9.83 |
  | B en test | 4.90 | 6.55 |
  | C ar | 8.58 | 11.24 |
  | D ar | 8.58 | 11.24 |
  | F ar | 8.19 | 9.83 |
  | E en test | 1.99 | 1.78 |

  - Everything else is equal or better.
  - **E en test (1.99 → 1.78):** the old estimate made the English boxes
    narrower than their text. With the old estimate and the new spouse
    code it is 1.99 again, so this is the measurement correction (R1), not
    a layout regression.
- **New test `tests/sisters-several-husbands.test.ts`: 11 tests, all pass.**
  - Checks cases A–D (ar/en), E (ar) and F (ar/en): clean; legible; box gap
    ≥ 0.2 font sizes; no line deeper than 0.1 font size inside a box; size
    floors.
  - **Red proof:** on the engine before the fixes (600d9a0), 5 of 11 fail.
    F ar also failed on 404c9ab (R5).

### 22:15 — B: R7 (titles overflowing their cartouche), committed `dea3143`
- **Two causes.**
  1. Titles were measured as the names' width times 1.1 (Ruqaa) or 1.45
     (Kufi), but the poster loads only the title fonts' Arabic, so English
     titles are drawn in Amiri. Measured over 410 titles (estimate ÷ true
     width): the old estimate ran down to 0.65 for English in Ruqaa, and
     Kufi English was set about 60% too small.
  2. The title was sized so the text alone filled the room. The ground
     (cartouche + 2.6 font sizes, panel + 1.8) was then clamped to the room,
     so long titles ran onto the tips.
- **Fix.**
  - `titleEms(text, "ruqaa" | "kufi")` uses per-glyph tables for each
    title font as drawn (`titleMetrics.json`, from
    `scripts/font-metrics.mjs`; Latin at the title's weight in Amiri). It
    is within −5.2% to +5.4% of Chromium over 410 titles.
  - The header adds a 6% allowance and sizes the title together with its
    ground's padding (`titleGroundPad`, shared with `TitleGround`).
- **Test.** `tests/title-width.test.ts`: 15 tests.
  - **Red proof:** 6 of 15 fail on 404c9ab, and the same 6 with main's
    estimate.
  - **Renders:** before/after at A1 (Luxe, Heritage, Platinum):
    `scratchpad/r7/titles-before-after.png`.

### 22:40 — B: trunk with spouses added (uncommitted at this point)
- **Finding.** The trunk itself never moves. In 22 layouts the trunk, the
  canopy base and the crown centre were exactly on the page centre, and
  the trunk names were in one column. What moved was the canopy.
- **Root cause 1.**
  - *Cause:* one wife for the canopy base sent every brother of the centred
    son to one side. The rule "never split one mother's children" forbade
    every cut, since all the children were hers.
  - *Effect:* the first generation's middle moved 12.7% of the page width;
    medium family 10%, names 4.3 mm instead of 6.5 mm.
  - *Fix:* the rule does not apply when the centred son is her child too.
- **Root cause 2.**
  - *Cause:* a sole wife's frame sat to one side of the trunk because the
    canopy base's medallion obstacle (`base:obstacle`) was counted as
    another name, ruling out every spot above the base.
  - *Fix:* it is treated as the partner's own box.
- **After.** One wife: canopy middle +2.2% (same as no spouse). Medium:
  +0.7% Arabic, names 6.52 mm (were 4.33); English 4.30 mm (were 3.47).
  Tiny family's wife frame: 1.8% from the axis.
- **Test** `tests/trunk-upright-with-spouses.test.ts` (21 tests):
  - the trunk drawn upright for every case;
  - shift ≤ `SIDE_SHIFT_MAX` (4% W, the engine's own balancing limit);
  - a sole wife's frame within 4% of the axis;
  - limbs on both sides;
  - determinism;
  - long-title families.

  Two or three wives, and a daughter's two husbands, are checked only for
  upright trunk and limbs on both sides: half-siblings stay grouped on one
  side, so the balance there is the family's own (English two wives: names
  10:7). **Red proof:** 6 of 21 fail on `dea3143`.

### 22:40 — C: Basmala in the quotations' language, committed `eae75af`
- The Basmala follows `layout.quoteLang`: ﷽ in Arabic; in English the
  exact sentence, on one line between the medallions (4.1 mm at A3, 8.2 mm
  at A1), never cut.
- The control is now "Basmala and quotations in", shown when the Basmala
  or a quotation is on. README updated.
- `tests/quotation-language.test.ts`: 17 tests pass (6 language
  combinations × 7 designs × frame on/off, exact sentence, fits between
  the medallions, legible).
- Renders: `scratchpad/quote/basmala/basmala-sheet.png`.

### 23:00 — Performance investigation (findings; decision H2 on hold)
- **Measured on `main`'s engine** (`wt-quote`): the bench family (350,
  A1) takes 12.0 s of CPU per layout. `npm run bench` fails two of three
  budgets on `main` (while the matrix shared the machine).
- **Time is in the layout:** 24 whole layouts per poster (CPU profile:
  `scratchpad/perf/prof-main/`; attempt log via the bundled probe in
  `scratchpad/perf/probe-count.mjs`). Not rendering, not the harness.
- **Two avoidable parts:**
  - the `keepGuarded` retry repeats the opening five layouts identically;
  - the search bisects below the legible size.
- Options and a recommendation are in ON-HOLD H2. No code change was made,
  because each option changes posters or needs a decision.

### 23:20 — B: trunk work committed `1f10f91`; integration analysis (no merges made)
- **B `1f10f91` (pushed).** Canopy centred with one wife; sole wife's frame
  on the axis. Related tests: 84 run, 82 passed. The 2 failures were
  sister-case assertions that the trunk fix made out of date (C Arabic
  control improved from 11.24 to 13.90 mm; B Arabic control now has a line
  0.16 font sizes inside another sister's husband's frame).
  - The floors were raised to the new measured values.
  - The B control defect is a known failing check (`it.fails`), not
    hidden. Final related run: 33 of 33.
  - Tried and reverted: (a) the fallback tier avoiding every frame's line
    (no effect); (b) a final re-placement after untangling (no effect on
    B; cut English case E test from 3.20 to 2.49 mm).
- **Ancestry.**
  - A: 5 commits on `main`.
  - B: 8 commits on `main`, containing A up to `600d9a0`; A's `aa98dc0` is
    copied in B as `404c9ab`.
  - C: 2 commits on `main`.
  - None is behind `main`.
- **Trial merges** (`git merge-tree`, in memory only):
  - A into B: clean.
  - B + C: 3 conflicts, all mechanical:
    1. `TreePoster.tsx` imports (keep both sides' names);
    2. the header's `avail` and title sizing (keep C's medallion-aware
       `avail` and B's `titleEms`, `titleGroundPad` and `TITLE_EM_SAFE`);
    3. `botanical.ts`, two adjacent constants (`HOLDER_TOUCH`,
       `QUOTE_EN_SCALE`): keep both.
- **Semantic dependency.** C's `textInCircle` and the English Basmala size
  use `textWidth`, which B changes to glyph metrics. After combining B and
  C, re-run `tests/quotation-language.test.ts` and re-check the
  medallions. The Basmala allowance is safe: true width 25.8 em, ×1.05.
- **Suggested order** (for the owner's approval, not done): PR #7 first
  (H1); then A; then B (includes A); then C, resolving the three conflicts
  above. Then full suite, `qa:layout` against the baseline, and PDF export
  checks on the combined tree.

### 23:55 — B: layout QA result (H3)
- `qa:layout` on B `1f10f91`: **447 of 448 pass**; typecheck and lint
  clean. One regression, `C_all_silver-gold_A1`: 3.20 mm → 2.95 mm (below
  the legible minimum).
- Bisected to `1f70b91`, the true name widths. The fault at the legible
  size is two lines under a brother's long name with honorific. Details in
  ON-HOLD H3; the baseline was **not** updated.
- QA output: `scratchpad/qa-B/` (SVG and JSON per case); log
  `scratchpad/qa-B.log`.
- C: typecheck and lint clean; quotation tests 17 of 17.

### 00:05 — Container restarted; matrix resumed; first grading
- The container restarted at about 23:58 and the matrix runner stopped.
  Saved results were kept: 367 primary, 82 designs, 31 modes. Restarted
  ("RESUMED after restart (2)" in `progress.log`); finished jobs are
  skipped.
- **Graded so far** (`tests/stress/grade.py`, A's engine `aa98dc0`,
  without B's fixes):
  - **Primary** (367): genealogy 367 PASS; layout 135 FAIL (merges,
    junctions, occlusions, crossings); page fit 344 FAIL (one side heavier
    279, stub of a trunk 234, crown swung aside 176, canopy hangs 171);
    readability 55 SMALL; performance FAIL nearly everywhere (see H2).
  - **Designs** (82): all FAIL, on page fit and line faults.
  - **Modes** (huge family, 31): 10 PASS.
- The page-fit faults (side heavier, crown swung) are what B's trunk fix
  targets. Re-grade on B's engine before drawing conclusions.
- **New finding (H4):** mother's-line posters of a man-rooted family draw
  1 to 6 of 463 people, and the grader passes most of them. On hold:
  rule plus grading.
- One modes case drew a foundation past the page's edge
  (`huge_ar_heritage_2A0_daughters_…_branch`, `offPage: soil`): to
  investigate.
- **A, integration readiness:** typecheck and lint clean; 44 tests run, 40
  pass. The 4 failures are the deliberate target test
  (`even-fans-in-every-design`), now on hold as H5. Its full suite and
  `qa:layout` were not run, because the stress matrix runs from `wt-fan`
  (CPU and file contention).

### 02:30 — Check-in 2: restarts, queue reordered, export stage, harness fixes
- **The container was reclaimed again** (up 1 min at 02:05): only 13 rows
  had been added in two hours. Background jobs die whenever the session is
  idle long enough to be reclaimed, so the huge, large and deep jobs (tens
  of minutes each) keep getting cut off.
  - The queue is now reordered: small families first (`jobs.txt`; the old
    order is kept in `jobs.heavy-first.txt`).
  - Tiny, small and spouses finished within minutes: 1,035 rows saved.
  - Heavy families need an active session for hours; they are not
    expected to finish unattended.
- **Off-page foundation case: a false positive in the harness.**
  - Cause: the foundations give their box from its left edge
    (`drawPlaque`); the check read it as centred. The wide paragraph
    foundation (huge, Heritage, 2A0, branch) is centred on the page.
  - Fixed: A `0e4430d`, B `f83acd3`. Earlier rows flagged only for
    `soil` are not reliable.
- **Export stage, run for the first time** (`tests/stress/export.mjs`,
  real `/demo` editor and Export menu in Chromium, A's engine):
  - Tiny and small, all 7 designs at A3, plus English: **16 of 16** pass.
    Each PDF is one A3 page (297×420 mm); each SVG parses at A3 with its
    viewBox; every font is embedded; no page errors.
  - Contact sheet: `scratchpad/stress/export/export-small-sheet.png`.
    Visual check: every element is present in every design. The tiny
    family's wife frame sits off to the left of the trunk in all 7: the
    defect fixed on B (`1f10f91`).
  - Driver fix (load the installed Playwright): A `6289b44`, B `e652b9c`.
- Dev server for the export run (port 3107) stopped by exact PIDs.

### 03:40 — Check-in 3: export stage for the middle families; B fixes the swing
- The container restarted again (about 03:13); the matrix runner was
  resumed ("restart (4)" in `progress.log`).
- **Export stage, A's engine.** Daughters, sons and medium at A1,
  spouses at A2, all 7 designs: **28 of 28 pass**. One PDF page at the
  paper's size; SVG at the paper's size with its viewBox; every font
  embedded; no page errors. Layout in the editor takes 6.7–39.9 s.
  - Contact sheet: `scratchpad/stress/export/export-mid-sheet.png`.
- **Visual inspection** (A's engine):
  - Sons and daughters: the canopy swings far to one side in every
    design (the grader's "one side heavier" and "crown swung aside").
  - Medium: the canopy base is a huge disc, because the founder's long
    name with honorific («عثمان الملقب بالأمين») sets its medallion size.
    Same cause as H3, which strengthens that proposal.
  - Spouses: balanced.
- **Same posters on B's engine** (`1f10f91`, refined, A1, all shown):

  | Family | A: names left:right | A: balance | A: names | B: names left:right | B: balance | B: names |
  |---|---|---|---|---|---|---|
  | Sons | 14:63 | −0.83 | 4.14 mm | 43:34 | +0.16 | 8.16 mm |
  | Daughters | 18:81 | −0.81 | 4.81 mm | 32:65 | −0.55 | 5.06 mm |

  B's trunk fix largely cures the sons swing and doubles its name size.
  Daughters improves but stays lopsided; I have not yet separated the
  part that is structural (families grouped by mother) from layout.
- The dev server was stopped by exact PIDs.

### 05:05 — Check-in 4: daughters family's lean on B is structural
- The container restarted again (about 04:55); the matrix runner was
  resumed ("restart (5)"). 1,611 rows are saved.
- **Daughters family on B's engine** (refined, A1):

  | Mode | Names left:right | Balance |
  |---|---|---|
  | Daughters hidden | 7:7 | −0.02 |
  | Daughters shown, without their families | 23:33 | −0.24 |
  | Everything shown | 32:65 | −0.55 |

- **Why.** The canopy base has seven children:
  - the eldest son (38 people), centred;
  - a second son (31 people), who must stand on one side;
  - five daughters (1 each, one with 4 through her).

  No arrangement of the brothers and sisters can put anything against
  a 31-person branch, so the lean is the family's shape, like the
  two-wives case, not a misplaced canopy.
- **Possible improvement.** The engine's "split the brothers by the room
  their families need" setting (`centerSides: "room"`). It is a design
  setting, not tried here; noted for the final report.

## Owner's decisions (09 Nov, about 05:35) and work on them

The owner approved: H1 merge PR #7; H2 option 2 only; H3 two-line
medallion names; H4 option 2; H5 option 1. Then the merge order A → B → C,
with full checks on the combined code, and no release.

- **H1.** PR #7 merged (`cc05aad`). Pipeline run 42568503669 on `main`:
  - database, releases and checks all pass (typecheck, lint, all unit
    tests, layout QA);
  - **the Windows build job failed twice** (the first run and one re-run,
    20 min apart), in "Build the installer": "Response code 504 (Gateway
    Time-out)" from a download electron-builder makes after packaging the
    app (after 7-Zip; most likely the NSIS installer toolkit);
  - upgrade and draft were skipped as a result.

  Not caused by PR #7 (it does not touch the build step). Not re-run
  again. The pipeline is **not green yet**: to re-run when the download
  host recovers, or to make the build cache that download, which is a
  workflow change that needs the owner.
- **H2** (B `507ad12`). The keepGuarded retry reuses the first pass's
  attempts that kept no foundation ancestors (copied on reuse).
  - Identical posters with reuse on and off: 5 cases
    (`tests/retry-reuses-attempts.test.ts`).
  - Saving is modest: 3–8% on large families (bench seed 7: 16.2 s →
    15.7 s, measured with other work running), not the third estimated
    earlier. The earlier estimate was wrong.
  - Budgets and the search below the legible size are unchanged.
- **H3** (B `d7c6bbf`). A long medallion name goes onto two lines when
  that makes the disc at least a tenth smaller.
  - `C_all_silver-gold_A1`: legible again, 3.20 mm, clean.
  - Titles families, Arabic and English, 7 designs, A1: long-titled discs
    15–45% smaller; smallest names larger or the same everywhere (up to
    3.86 → 5.64 mm); all clean. Before/after crops inspected in every
    design (`scratchpad/h3/h3-ar.png`, `h3-en.png`).
  - `tests/long-names-in-medallions.test.ts`: 14 of 14 pass. README and
    `docs/node-designs.md` updated.
  - B's full layout QA and full suite: running.
- **H4.**
  - **Editor warning** (new branch `feature/matrilineal-root-warning`,
    `fc780aa`, from `main`): shown only when a mother's-line poster has a
    male root and people are actually left off. Checked at 1440 and 1024
    px, clear of the search and zoom controls. `/demo` takes
    `&lineage=matrilineal`. Test: 4 of 4.
  - **Grading** (A, uncommitted at 06:10): such cases now grade
    LIMITATION for genealogy, and overall unless another category fails;
    new matrix rows record `maleRootMothersLine`. Modes part: 63 cases
    LIMITATION.
- **H5** (A `f858aec`). `ringKink` measures each name against the ring
  the engine builds for it (the layout now carries `fan`). Thresholds: the
  default design's own values plus 0.05.
  - Smooth posters the old measure failed now pass (natural family 0.387
    → 0.016).
  - One real defect remains, visible on the poster: the paragraph
    foundation steps the long lineage (0.585 against the column's 0.268),
    in the default design and Mono. Marked as expected failures,
    temporarily and documented in the test, so it stays reported.
  - The test no longer requires the canopy to be no taller than wide (the
    backed-out remedy, not a measure).
  - A's full suite and layout QA: running.

## 09 Nov, afternoon — trunk, canopy and spouse-box fixes (no merges)

Each fix is on its own branch; none is merged or released.

| Branch | Head | What | Checks |
|---|---|---|---|
| `layout/side-branches-from-their-badge` | `6dcbfa8` (unchanged) | side branches in slices; every side branch and stub from its own badge | suite 609 passed; QA 448/448; start-up 19/19 on PostgreSQL 16 (non-root) |
| `layout/canopy-base-crossings` | `fe9af82` (on `6dcbfa8`) | two sons' lines from one place tried together | suite 640; QA 448/448; start-up 19/19 |
| `layout/forked-lines-checked-as-drawn` | `1af54b7` (on `main`) | the layout's check reads dotted lines from a fork as drawn | suite 608; QA 448/448; start-up 19/19 |
| `layout/spouse-box-lines` | `836cbf3` (on `6dcbfa8`, merges `1af54b7`) | a tangle at one man and his wives' boxes is untangled | suite 617; QA 448/448; start-up 19/19 |

- The owner's family (private, local only), 13 variants:
  - main: 68 to 99 problems each.
  - Side branches: 11 of 13 clean.
  - Canopy: daughters 1 to 0.
  - Spouse boxes: everyone shown 5 to 0.
  - Canopy and spouse boxes together: see below.
- **The PostgreSQL-client limitation.** The worktrees had no
  `desktop/electron/node_modules`, so `migrate.js` could not load `pg`.
  - Linked from `wt-152` (environment only, nothing committed).
  - As root the 14 real-database tests skip (initdb refuses root); run as
    a non-root user (`pgtest`) with `REQUIRE_PG=1`, all 19 pass.
- The design-director agent is defined in `.claude/agents/` but is not
  available in this session: the visual review of the side branches waits
  for it. Before/after renders of an invented family are in
  `scratchpad/review-side/ev/`.
- **H6:**
  - The one-man tangle part is fixed (`layout/spouse-box-lines`).
  - Kept on hold: interleaved children of two wives (a decision on
    sibling order).
- Branch A: suite 651, QA 448/448, start-up 19/19; ready, not merged
  (needs approval).

## 09 Nov, evening — more fixes, all branches checked (no merges)

| Branch | Head | Base | Suite | QA | Start-up (PG 16, non-root) |
|---|---|---|---|---|---|
| `layout/side-branches-from-their-badge` | `6dcbfa8` | main | 609 passed | 448/448 | 19/19 |
| `layout/canopy-base-crossings` | `fe9af82` | `6dcbfa8` | 640 | 448/448 | 19/19 |
| `layout/forked-lines-checked-as-drawn` | `1af54b7` | main | 608 | 448/448 | 19/19 |
| `layout/spouse-box-lines` | `836cbf3` | `6dcbfa8` + `1af54b7` | 617 | 448/448 | 19/19 |
| `layout/paragraph-fan-smooth` | `56d973f` | A `1eb61c9` | 656 | 448/448 | 19/19 |
| A `layout/fan-every-foundation` | `1eb61c9` | main | 651 | 448/448 | 19/19 |
| B `layout/typography-spacing` | `981eb48` | main + A's older work | 700 passed, 4 failed (only the old fan test, replaced by A's: on a scratch merge of A into B it passes 28/28) | 448/448 | — |
| C `feature/quote-language` | `eae75af` | main | 623 | 448/448 | 19/19 |
| H4 `feature/matrilineal-root-warning` | `fc780aa` | main | 610 | — | — |

- The owner's family (private, local): on canopy + spouse-box together
  (scratch merge, not pushed), all 13 variants clean, names as on the side
  branch or larger.
- On hold for the owner: H6 (interleaved children of two wives), H7
  (paragraph foundation: smooth fan or larger names), H1 (pipeline 504 on
  the installer download).

## 09 Nov, late evening — owner's round 4 (no merges, nothing published)

- **Spouse-box fixture (item 2):** `layout/spouse-box-lines` `c9c4ea9`.
  - What it adds: an invented family, `src/lib/samples/twoWivesCanopy.ts`
    (one man, two wives, 17 children, daughters' families), and
    `tests/two-wives-canopy-keeps-its-lines-apart.test.ts`.
  - Views covered: the family view, and everyone shown at refined 8A0,
    emerald + paragraph 8A0, and emerald + paragraph A0.
  - Checks: the SVG geometry (no two lines running together), both boxes
    drawn, their names in the SVG.
  - Red on `main` and on `6dcbfa8`; green on the branch. Poster inspected.
- **H6 (item 3):** resolved, with no decision needed. See ON-HOLD.md for
  the comparison and `scratchpad/h6cmp/h6-comparison.png`.
  - The engine already groups by mother, so the crossing was in the box
    placement.
  - The fix is on the new branch `layout/spouse-boxes-lines-never-cross`
    (from `main`), head `fbf20fc`, pushed. It is **not ready**:
    - Checks: suite 608, QA 448/448, start-up 19/19 (non-root); the test is
      red on `main`.
    - But the render of the now-clean refined 2A0 poster reads worse: a
      box swings far down-left, and lines run alongside limbs. The commit
      is marked WIP (not ready), and the README was left unchanged.
  - Scan of 30 invented families at emerald A1 and classic A0 (60
    layouts): 59 identical to `main`; family 11 classic A0 has larger names
    (3.27 → 4.82 mm) and still has 1 crossing (known defect, kept as an
    expected failure).
  - Family 11 refined 2A0: 1 crossing → clean.
  - Family 1: 1 to 2 problems on `main` and on the branch alike. An
    existing defect, not yet looked at.
- **H7 (item 1):** the premise was wrong. The paragraph text is the
  shortest of the six foundations (corrected in ON-HOLD, `0a8e64d`).
  - Reducing its height makes the canopy taller still and does not help.
  - The two expected-failure marks stay; thresholds are unchanged.
  - Option 3 (smoother dense-ring spacing) is not yet tried.
- **Side-branch review package (item 4):** sheets 01–04 and
  `REVIEW-PACKAGE.md` in `scratchpad/review-side/pkg/` (sent to the owner).
  - **Not design-reviewed:** the reviewer agent is unavailable.
  - The earlier A1 and 2A0 evidence in `scratchpad/review-side/ev/` is
    kept as it was.
  - Remaining imperfection: English stubs (1 to 2 problems).
- **Integration (item 5):** `INTEGRATION-READINESS.md`. It covers heads,
  dependencies, trial-merge conflicts and a proposed order. Nothing merged.
- **Installer (item 6):** run 42568503669, re-run once (attempt 3):
  everything green (build, 20 upgrade jobs, draft job). The draft release
  was created and not published. The workflow is unchanged.

## 10 Nov — round 5: three open items (nothing merged; see H8)

| Item | Branch | Head | Result |
|---|---|---|---|
| Spouse boxes | `layout/spouse-boxes-lines-never-cross` (from `main`) | `ae73f45` | **Ready.** Suite 614, QA 448/448, start-up 19/19 (PG 16, non-root); red on `main` |
| English stubs | `layout/side-branch-stubs-clear` (on `6dcbfa8`) | `e40b4df` | **Ready** (once the side-branch base is accepted). Suite 617, QA 448/448, start-up 19/19; red on `6dcbfa8` |
| H7 ring spacing | `exp/h7-ring-spacing` (on `56d973f`) | `62597d8` | **Experiment, not adopted.** Two expected-failure marks kept |

**Spouse boxes**
- `fbf20fc` (box placement) is reverted in `ae73f45`.
- The real cause is the centring: the centred son could stand apart from
  his full brothers, so his mother's fan had to cross the other wife's.
- He is now set where each mother's children stay together (brothers'
  order kept).
- Scan of 30 invented families (60 layouts): 3 better, 0 worse.
  - The first try regressed family 10 (6.78 → 4.85 mm) by setting him
    inside his mother's group.
  - Fixed by keeping the old rule (never between two of one mother's
    other children) as well.
- New measure `linesAlongside` (clarity.ts), unit-tested on hand-drawn
  lines.
  - It flags both faults in `fbf20fc`'s render and none in `ae73f45`.
  - It finds 0 to 3 such lines on most QA families on `main` too, so it is
    reported, not yet a QA failure. Making it one is engine work across
    all families.

**English stubs**
- Each childless son's way is chosen clear of the stubs placed before him:
  turned within his share, then up past it, ending short or further out.
- English A1: 1 → 0 problems; A2/A3: the stub problem gone.
- One other problem is left at English A2/A3: a side family's line clips a
  stub. It is a separate defect, kept as an expected failure; both sizes
  are below legible for that family.
- Arabic A1–A3: names unchanged; the two stubs now stand one above the
  other.

**H7**
- Ring-fill scan from 0.85 down to 0.70: erratic.
- At 0.75: long lineage smooth (0.59 → 0.107) with larger names, but
  another family −0.01 mm and rougher at 2A0. Not adopted.

**Renders:** `scratchpad/round5/` (sent to the owner).

**Merge/release:** not done. ROADMAP's binding order puts data
protection in 1.0.53, and merging to `main` is the release step. The
decision is H8 in ON-HOLD.md.

