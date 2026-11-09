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

**NO DECISION NEEDED; the crossing itself is still open** (09 Nov, late
evening). The earlier
diagnosis was wrong, and the sibling order is unchanged.

- **What was wrong in the diagnosis:** the engine already draws a man's
  children grouped by mother when spouses' boxes are shown ("half-siblings
  stay together"; each group in birth order). Forcing the grouping
  explicitly gives the identical poster, one crossing included. See
  `scratchpad/h6cmp/h6-comparison.png`:
  1. birth order with spouses' boxes;
  2. grouped by mother with spouses' boxes;
  3. birth order without boxes (clean, names 8.42 mm).
  Panels 1 and 2 are the same drawing.
- **Cause:** the crossing is in where the two boxes are placed. Both are
  placed in one pass, and each was checked only against the lines drawn
  last time, where the other box had been.
- **Fix attempt, NOT READY:** branch `layout/spouse-boxes-lines-never-cross`
  (`fbf20fc`, from `main`). Checks pass, but the render is worse (see
  below). The crossing is therefore still open, as an engineering defect,
  not a decision for you.
  Each box is now also checked against the lines of the box placed with it.
  - Family 11, refined 2A0: 1 crossing → clean (names 5.16 → 4.13 mm; the
    old poster was never clean at any size).
  - Family 11, classic A0: still 1 crossing, but now away from the names
    (names 3.27 → 4.82 mm). Kept as a known defect in the branch's test,
    not hidden.
  - 30 invented families of this make, at emerald A1 and classic A0 (60
    layouts): 59 are identical to `main`. The 60th is family 11 on classic
    A0, with larger names as above. No family is worse. Family 1 has 1 to 2
    problems on `main` and on the fix alike: a separate, existing defect,
    not yet investigated.
- **Render inspected:** the clean refined 2A0 poster is worse to read than
  the old one with its crossing:
  - one wife's box swings far down and left of the canopy base;
  - her limb runs out sideways along the canopy's lower edge;
  - two thin lines run alongside thick limbs, which the check does not
    flag.

  Next: keep the box near its own children's side, and look at the
  "running alongside" gap in the check.
- **Sibling order:** unchanged, chronological. Nothing was changed without you.
- **Separate finding:** with spouses' boxes shown, this family's names are
  much smaller than without them (3.27 mm against 8.42 mm on classic A0).
  The boxes and their lines crowd the canopy base. Not a decision yet;
  recorded for the next round.

---

## H7. The paragraph foundation: smooth fan or larger names, for a long lineage

**ON HOLD — USER INPUT REQUIRED** (corrected 09 Nov evening: the earlier
statement that the paragraph text takes height from the canopy was wrong)

- **Decision:** for a long lineage drawn with the paragraph foundation
  (default design and Mono), which comes first: an even fan or name size.
- **Finding:**
  - The paragraph foundation takes the least height of all six (its text
    110 units high on the long lineage at A0, against 465 to 521 for the
    others). The canopy gets the rest and grows taller than wide.
  - On a tall canopy the engine's larger-names ("dense") layout pushes the
    crowded inner generations outward and squeezes the outer ten together.
    Two names step off their rings (0.585, against 0.200 for the column).
  - Making the text smaller would make the canopy taller still, so
    reducing the text's height cannot help. What helps is the opposite:
    the foundation keeping a little more height.
- **Measured** (paragraph kept six type sizes taller; refined and Mono
  alike):

  | Family | A1 | A0 | 2A0 |
  |---|---|---|---|
  | Long lineage | 0.592 → 0.088; names 3.44 → 3.20 mm | 0.585 → 0.041; 4.82 → 4.23 mm | 0.576 → 0.040; 6.52 → 5.82 mm |
  | No lineage under the trunk, balanced family | unchanged | unchanged | unchanged |
  | English stress family | 6.3 both (see below) | 0.617 → 5.542, worse; 4.48 → 3.78 mm | 0.715 → 6.230, worse |

  So the extra height is not a general cure: it helps only long lineages,
  costs them 7–12% of name size, and makes the English stress family
  worse.
- **Options:**
  1. Keep the larger names and the stepped fan (the expected-failure marks
     stay, documented).
  2. Keep the foundation taller only for long lineages (trunk longer than
     the canopy is deep): smooth fan, names 7–12% smaller, still legible.
  3. Look for a layout of the dense rings that is smooth at the larger
     size (engineering, no promise of success).
- **Recommendation:** 3 first (I can do it without your decision); 2 if
  it fails.
- **Blocked by it:** the two expected-failure cases in
  `tests/even-fans-in-every-design.test.ts`.
- **Separate finding (being investigated, not a decision):** the English
  stress family's ring measure is 6.2–6.3 at A1 with every foundation
  setting, far above anything else measured. It may be a fault in the
  measure (a ring whose median distance is near zero) rather than in the
  poster.
