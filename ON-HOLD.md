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
