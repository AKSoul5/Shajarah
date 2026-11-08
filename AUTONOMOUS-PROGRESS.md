# Autonomous progress record

Kept up to date while the owner is away. Decisions awaiting the owner:
[ON-HOLD.md](ON-HOLD.md). Nothing is merged into `main` and nothing is
published without the owner.

## Workstreams and branches

| Workstream | Branch (worktree) | HEAD |
|---|---|---|
| A. Stress test + spouse-frame page fix | `layout/fan-every-foundation` (`/home/user/wt-fan`) | `aa98dc0` |
| B. Typography and spacing | `layout/typography-spacing` (`/home/user/wt-typo`), branched from A at `600d9a0` | `404c9ab` |
| C. Quotation language | `feature/quote-language` (`/home/user/wt-quote`), from `main` | `eb789fe` |
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
