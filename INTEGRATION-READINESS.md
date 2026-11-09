# Integration readiness (09 Nov, late evening)

Nothing has been merged, tagged, published or released. Every branch is
still on its own and pushed to `AKSoul5/Shajarah`, and none was rewritten.
`main` is at `cc05aad`.

## Branches

The suite, QA and start-up figures were taken on each branch's own head
(start-up is PostgreSQL 16, run as a non-root user with `REQUIRE_PG=1`).

| Branch | HEAD | Parent / depends on | Ahead / behind main | Suite | QA (448) | Start-up | Visual QA | Unresolved |
|---|---|---|---|---|---|---|---|---|
| A `layout/fan-every-foundation` | `1eb61c9` | main at `45fb31a` | 9 / 3 | 651 passed | 448/448 | 19/19 | fan renders (all foundations) checked | the 2 paragraph expected-failure marks (H7) |
| `layout/paragraph-fan-smooth` | `56d973f` | A `1eb61c9` | 10 / 3 | 656 | 448/448 | 19/19 | before/after at A1, A0, 2A0 | H7, same 2 marks |
| B `layout/typography-spacing` | `981eb48` | main `45fb31a` + A's older work (`600d9a0`) | 13 / 3 | 700 passed, 4 failed: B's old copy of the fan test, which A replaces (on a scratch merge of A into B, 28/28) | 448/448 | not run on B alone | renders reviewed by me only | H3 (one QA case on the legible edge); needs A merged first |
| C `feature/quote-language` | `eae75af` | main `45fb31a` | 2 / 3 | 623 | 448/448 | 19/19 | Arabic and English quotation renders | — |
| `layout/side-branches-from-their-badge` | `6dcbfa8` | main `cc05aad` | 1 / 0 | 609 | 448/448 | 19/19 | before/after package; **no formal design review** | English stubs: one stub's line touches the next stub's medallion (en A1: 1 issue; A2/A3: 2) |
| `layout/canopy-base-crossings` | `fe9af82` | `6dcbfa8` | 2 / 0 | 640 | 448/448 | 19/19 | the owner's family (local only) | — |
| `layout/forked-lines-checked-as-drawn` | `1af54b7` | main `cc05aad` | 1 / 0 | 608 | 448/448 | 19/19 | daughters' families | — |
| `layout/spouse-box-lines` | `c9c4ea9` | `6dcbfa8` + merge of `1af54b7` | 6 / 0 | 617 at `836cbf3`; `c9c4ea9` adds only a fixture and its test (4/4; red on main) | 448/448 at `836cbf3` | 19/19 | fixture poster before/after, everyone shown | H6 (now reduced to a box-placement defect, see ON-HOLD) |
| `spouse-align` | `7456785` | 1.0.51 (`94bcf71`) | 2 / 18 | tested on 1.0.51 only | not run on the current main | — | 1.0.51 renders | must be re-tested on the current main; ROADMAP schedules it for 1.0.58 |
| H4 `feature/matrilineal-root-warning` | `fc780aa` | main `cc05aad` | 1 / 0 | 610 | — (editor only) | — | editor notice not yet screenshotted at 1440/1024 | — |

## Conflicts (trial merges with `git merge-tree`; nothing written)

| Pair | Result |
|---|---|
| A + paragraph-fan-smooth | clean (paragraph is on A) |
| A + B | 1 hunk in `botanical.ts` (constants `MEDALLION_LINE` / `FAN_SAMPLES`); trivial |
| B + paragraph-fan-smooth | 1 hunk in `botanical.ts`, the same constants |
| C + A | clean |
| C + B | 3 hunks (`TreePoster.tsx`, `botanical.ts`); known, small |
| H4 + B | 1 hunk in `demo/page.tsx` (the `searchParams` type); trivial |
| side + canopy | clean (canopy is on side) |
| forked + spouse-box-lines | clean (spouse contains `1af54b7`) |
| canopy + spouse-box-lines | 1 hunk, `README.md` only (two new paragraphs in one place); keep both |
| canopy + B | 1 hunk in `botanical.ts`: two new passes after validation (canopy: sons' lines tried together; B: re-place spouse boxes on a clean drawing). Both must stay, in order, with QA re-run |
| spouse-box-lines + B | 1 hunk: a comment both reworded (B carries its own variant of the forked-line wording); keep spouse's |
| side + B | clean |
| spouse-align + main / spouse / canopy / A | textually clean; behaviour untested on current code |

## Proposed order (each step: full suite, QA 448, start-up as non-root, renders, then the owner's approval)

1. **`layout/forked-lines-checked-as-drawn`** (`1af54b7`). Smallest, from main, no dependencies.
2. **`layout/side-branches-from-their-badge`** (`6dcbfa8`). From main. It waits on the design review, or on the owner accepting the review package without one.
3. **`layout/canopy-base-crossings`** (`fe9af82`). Fast-forwards over step 2.
4. **`layout/spouse-box-lines`** (`c9c4ea9`). Resolve the README hunk by keeping both paragraphs. The owner's family was clean in all 13 variants on exactly this combination (scratch merge).
5. **`layout/spouse-boxes-lines-never-cross`**, if the scan accepts it (see AUTONOMOUS-PROGRESS.md).
6. **A** (`1eb61c9`), then **`layout/paragraph-fan-smooth`** (`56d973f`). Bring main in first (3 commits behind).
7. **B** (`981eb48`), after A: its 4 old fan-test failures disappear only with A's test. Resolve the constants hunk, the comment hunk, and the canopy/B ordering hunk (canopy's pass, then B's), then re-run QA.
8. **C** (`eae75af`). Resolve its 3 hunks with B.
9. **H4** (`fc780aa`). One trivial hunk.
10. **`spouse-align`** last. Re-test on the integrated code; it is planned for 1.0.58.

Steps 1 to 5 are independent of A, B and C, and could go out as their own
release. Each step is an ordinary merge commit: no rebase, no force-push.
