# On hold: decisions for the owner

Items that need the owner's decision, approval or input. Work on each item
stops at the point described; all other work continues. Nothing here has
been decided on the owner's behalf. An item is removed only when it is
genuinely resolved.

Branch for these notes: `notes/autonomous-progress` (never merged to main
without the owner).

---

## H1. Merge PR #7 (release pipeline: upgrade matrix and red proof)

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** approve, or not, merging PR #7 into `main`
  (https://github.com/AKSoul5/Shajarah/pull/7).
- **Why it needs you:** it changes the release workflow
  (`.github/workflows/shajarah-windows-installer.yml`); the project's rules
  say workflow safety checks change only when the owner asks.
- **What it does:** (1) the upgrade test uses only releases older than the
  build (since 1.0.52 was published, every non-release push to `main` fails
  `upgrade (v1.0.52)` because 1.0.52 cannot update to itself: run
  42501357020); (2) the red proof always runs against v1.0.51 (otherwise the
  1.0.53 release build would fail, because 1.0.52 correctly keeps the family).
- **Recommendation:** merge. Nothing else in the pipeline changes.
- **Blocked by it:** a green `main` pipeline for docs and test commits, and
  the 1.0.53 release build.

---

## H2. Layout speed: stop searching sizes the poster cannot use?

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** whether the layout search may stop earlier when a family
  is too large for its paper, and whether the speed budgets in
  `tests/bench` should be re-set.
- **Why it needs you:** each option changes which poster a too-large
  family gets: a product decision, not a code fix.
- **Evidence (`main` engine; 350-person bench family, seed 7, A1):**

  | Measure | Result |
  |---|---|
  | One layout | 12.0 s of CPU |
  | Bench budget | 2.5 s |
  | `npm run bench` on `main`, while the matrix ran | natural 350: 9.7 s, dense: 4.8 s (fail); large + roundels: 2.3 s (pass) |
  | Whole layouts per poster | 24 (0.15–1 s each) |
  | Where the time goes | label relaxation 31%, clarity check 19%, garbage collection 13% |

  The 24 layouts break down as:
  1. sizes 1, 0.8, 0.53, 0.35 and dense, laid out
     once with the foundation's "keep nearest" setting and **again
     identically without it** (`keepGuarded` retries when the poster is
     not legible): 10 layouts, about 4.5 s;
  2. as the family is not legible on A1 (2.41 mm), a bisection **below the
     legible size** (0.05 … 0.29) with an untangling pass at each size: 14
     layouts, about 6 s. A poster at those sizes is never what the owner
     gets: the app offers a larger paper.

  The stress matrix's 58–216 s are the same layout code with spouses and
  every daughter's family shown (more names, more passes), slowed by four
  jobs sharing four CPUs. Rendering and the harness are not the cause: the
  harness times `computePosterLayout` only.
- **Options:**
  1. When the full-size poster is not legible and the legible size is not
     clean, stop at the best legible layout and offer the larger paper,
     without bisecting below legibility (about half the time saved on
     too-large families; their fallback poster may be less tidy).
  2. Reuse the first pass's attempts in the `keepGuarded` retry when the
     foundation does not change the canopy (about a third saved; no
     poster changes, more code).
  3. Keep the search as it is and re-set the bench budgets to today's
     measured times (no speed gained).
- **Recommendation:** 2 now (no visible change), then 1 after you have
  seen before/after renders of too-large families. Keep the budgets until
  measured on an idle machine.
- **Blocked by it:** improving speed for families too large for their
  paper. Nothing else waits on it.

---

## H3. Branch B makes one layout QA case drop below the legible size

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** accept this one result, or keep B from merging until it
  is fixed.
- **Why it needs you:** the project rule is that a layout change is kept
  only if no family gets worse; the baseline is updated only by you,
  after review.
- **Result.** `qa:layout` on B (`1f10f91`): 447 of 448 pass.
  `C_all_silver-gold_A1` drops from 3.20 mm (legible, on the minimum
  exactly) to 2.95 mm (below the 3.2 mm minimum). No other case got worse.
- **Cause.** Bisected to B's first commit (`1f70b91`); the trunk and frame
  work does not change it. With the old width estimate swapped back in,
  the case is legible again (3.20 mm), so the cause is measuring names at
  their true width.
  - At the legible size, only two faults remain: Nasser's (qa-c-28) lines
    to his children Hamad and Noura (qa-c-29, qa-c-30) pass under his
    brother's long name with honorific, «عبد الملك الملقب بالأمين»
    (qa-c-26). The search then settles just below the minimum.
- **Root cause** (traced further): in this design, first-generation names
  are round medallions. A medallion is a circle as wide as its name
  (`w = h = max(2.7 fs, text + 0.9 fs)`), so the brother's long name with
  its honorific becomes a disc 132 units across, against Nasser's 40.
  Nasser's lines to his children run under that disc. The plain "circle"
  design already avoids this: a long name stretches into a capsule rather
  than a larger circle. Medallions have no such rule.
- **Options:**
  1. Keep B out of `main` and give medallions the same treatment: a long
     name set on two lines, split at the space nearest its middle (the
     engine's `splitInTwo`), so the disc is about half the size. This is
     a visible design change to every long-named medallion in every
     design, so it needs your approval (and the design review the project
     asks for) before I build it.
  2. Accept this one case (update the baseline) for the gains elsewhere:
     titles, frames, and canopy balance (many families 1–5 mm larger).
- **Recommendation:** 1. B stays unmerged meanwhile.
- **Blocked by it:** merging B. Work on B continues.

---

## H4. A mother's-line poster of a family rooted at a man is almost empty

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** what a poster should show when the lineage is set to the
  mother's line (MATRILINEAL) but the family's root is a man.
- **Why it needs you:** it is a genealogy and product rule, not a layout
  fix.
- **Evidence** (stress matrix, huge family, 463 people, A's engine): the
  seven pairwise cases with the mother's line draw 1 to 6 people. One
  laid out again here: 0 names in the canopy, 456 people unplaced. In a
  mother's-line tree a man's children belong to their mother's line, so
  nothing grows from a male root.
  - The app lists the people it did not draw (`unplacedIds`), but the
    poster is nearly blank.
  - The stress grader passed six of the seven for genealogy: the
    not-drawn explainer counts them as outside the line.
- **Options:**
  1. When the mother's line is chosen and the root is a man, start the
     line from his eldest daughter with children (or ask which woman).
  2. Keep the rule, and warn plainly in the editor (and grade such posters
     LIMITATION, not PASS) that the root must be a woman for this setting.
  3. Disallow the mother's line unless the root is a woman.
- **Recommendation:** 2 now (an honest warning and grade, no genealogy
  change); decide 1 or 3 separately.
- **Blocked by it:** the matrilineal rows of the stress grading. Nothing
  else.

---

## H5. Branch A carries a deliberately failing target test

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** what to do with `tests/even-fans-in-every-design.test.ts`
  on `layout/fan-every-foundation` before A can merge.
- **Why it needs you:** it decides what the project tests and whether a
  known defect may be in `main`.
- **Evidence:** A typechecks and lints cleanly; its other tests pass (40
  of 44). The 4 failures are this file: arc spread 1190 against ≤ 1080,
  982 against ≤ 960, 1223 against ≤ 1080, and smoothness 0.54 against
  ≤ 0.29.
  - It was kept as a target when the capped canopy was backed out
    (`27d594d`: it shrank the canopy at A1).
  - Its "fan kink" measure was found misleading on oval rings. Merged as
    it is, it turns the `main` pipeline red.
- **Options:**
  1. Rework the measure (ring-relative instead of absolute), then re-set
     the thresholds from the default design's own values.
  2. Mark the four as known failures (`it.fails`): visible, and green CI.
  3. Drop the file and keep the finding in the notes only.
- **Recommendation:** 1, with 2 in the meantime if A must merge before.
- **Blocked by it:** merging A (and B, which contains A).

---

## H6. Spouses' boxes when one man's children by two wives are interleaved

**ON HOLD — USER INPUT REQUIRED** (the rest of the former H6 is being
fixed: see AUTONOMOUS-PROGRESS.md)

- **Decision:** with spouses' boxes shown, how to order a man's children
  whose mothers alternate by birth (wife A, wife B, wife A).
- **Why it needs you:** it changes the order of brothers and sisters on
  the poster, which today follows birth order (or the order you set).
- **Evidence:** invented family 11 (`twoWives(11)` in
  `tests/brothers-lines-from-one-place-do-not-cross.test.ts`), classic A0
  and refined 2A0 with spouses: one crossing. One wife's son stands
  between the other wife's two sons; each wife's children leave her box,
  so the second wife's line must cross into the first wife's fan,
  wherever the boxes go (old and new engines alike). No box placement
  can remove it.
- **Options:**
  1. When spouses' boxes are shown, group a man's children by mother
     (each group in birth order; the groups in the order of their eldest).
  2. Keep birth order; accept the crossing, and say so in the editor
     ("children of different mothers alternate").
  3. Keep birth order; draw such a man's children from him directly (no
     boxes) when they alternate.
- **Recommendation:** 1, as a setting that is on by default only when
  spouses' boxes are shown; birth order unchanged everywhere else.
- **Blocked by it:** posters with spouses shown where one man's children
  by two wives alternate. Nothing else.

---

## H7. The paragraph foundation: smooth fan or larger names, for a long lineage

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** for a long lineage drawn with the paragraph foundation
  (default design and Mono), which comes first: an even fan or name size.
- **Why it needs you:** each remedy costs readability or changes a
  design. Both are your call, under the rule that readability is not
  lowered.
- **Evidence** (`kalaliFilledTree`, A0, refined):
  - The paragraph text block takes height from the canopy.
  - The normal layout is smooth (ring measure 0.035), but its smallest
    names are 3.27 mm (typical 11.4 mm).
  - The engine therefore takes its "dense" layout: smallest names 4.82 mm
    (typical 16.8 mm), with the inner four generations pushed outward and
    the other ten squeezed to a twentieth of the reach apart. Two crowded
    names step off their rings: 0.585 against the column foundation's
    0.200.
  - This is the defect still marked as a temporary expected failure on
    branch A.
- **Options:**
  1. Keep the larger names and accept the stepped fan for such posters
     (the expected-failure marker stays, documented).
  2. Prefer the smooth fan: names a third smaller (3.27 mm, near the
     legible minimum).
  3. Give the paragraph foundation less height for long lineages
     (condensed text, or a smaller type size in the paragraph), so the
     normal layout's names grow; a design change to that foundation.
- **Recommendation:** 3, trying a smaller paragraph type size first, kept
  only if the names grow and the paragraph stays legible.
- **Blocked by it:** the two expected-failure cases in
  `tests/even-fans-in-every-design.test.ts`. Nothing else.
