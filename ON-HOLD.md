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
