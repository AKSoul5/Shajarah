# Progress checklist

Kept up to date during the overnight work. Nothing below is merged into
`main` or released; every item is on its own branch for review.

## Released (with approval)

| Version | What | Checks |
| --- | --- | --- |
| 1.0.46 | No crossing lines; daughters' families; desktop menu bar | 456 tests, 322-poster QA, app driven through every menu item |
| 1.0.47 | Eight branch colours per design | 475 tests, 322-poster QA |
| 1.0.48 | Hotfix: the Style menu crashed in 1.0.47 | 483 tests; a new Style-preview test; the installer's own smoke test now opens every header menu (it fails on 1.0.47's code and passes here) |

## Completed on branches (awaiting review, not merged)

| Branch | Tip | What | Tests |
| --- | --- | --- | --- |
| `generation-numbering` | `cf86a13` | Generation numbers from a reference person (the model in `docs/generation-numbering.md`, revision 3): the module, its tests, and the editor (member list, person panel, header count, "Count generations from this person") | 18 new tests; full suite 501 pass |
| `family-engine` | `c0bf940` | `src/lib/family`: kin, siblings by kind, step-relations, lineage, descendants, branches, record findings (missing / possible / confirmed), duplicates, completeness, combined search | 22 new tests (incl. 10,000 people) |
| `person-profile` | `4facc41` | Profile tab beside the poster: identity, family (all relatives clickable), place in the family, record findings; back and forward | 5 new tests; checked in the running editor |
| `people-search` | `c09e089` | Filters on the member list (gender, status, generation, branch, years, incomplete records), combined with the name search | checked in the running editor |
| `records-quality` | `4d1f817` | Records view: completeness by branch and area; what cannot be right, what is worth checking, what is not recorded | checked in the running editor; full suite running |
| `node-preview-lab` | `b9b2acd` | `/lab/nodes`: every design's name boxes side by side (evaluation only) | 3 new tests |
| `a2-poster` | `9d1b32f` | Dense posters: more canopy balances tried, lines from the base's rim untangled (A2 of the real family: 20 problem spots to 1 at full name size) | 475 tests, 322 QA; slower (see below) |
| `privacy-fixtures` | `31f6eb2` | Real family names in two tests and a comment replaced with invented ones | merge and relationship tests pass |
| `legend-review` | `58f42a5` | The poster key's wording (`legend-terminology`), updated to 1.0.48; also fixes the English generation key running off the page | legend tests pass; footer comparison sent |
| `platform-plan` | this file | Audit, plan, schema proposal, milestone 1 plan, this checklist | — |

The platform branches build on each other, in this order:
`generation-numbering` → `family-engine` → `person-profile` →
`people-search` → `records-quality`. `records-quality` holds all of it.

## Awaiting your decision

1. **Which person is Generation 1 by default.** As built, it is the
   person the canopy starts from when one is set (in your tree, the
   founder: Generation 1, with today's family at Generations 2–5), else
   the tree's root. The alternative is to always use the root. In your
   tree the root is the oldest recorded ancestor, so the founder would be
   Generation 82. Any tree can still choose its own Generation 1.
   *Recommended: the canopy's start, as built.*
2. **Adopted children** (once the schema has adoption): numbered in the
   adoptive family, or not (shown as "raised in Generation 5").
   *Recommended: not numbered, as nasab does not pass by adoption; a
   per-tree option can change it.*
3. **The database additions** (`docs/schema-proposal.md`): approve the
   design before any migration is written.
4. **The A2 balance search** (`a2-poster`): it gives better posters for
   dense families but doubles the test suite's time (12 to 26 minutes)
   and makes your tree's A2 poster take about 56 s instead of about
   35 s. Under the clean-first rule you confirmed, your A2 poster is drawn
   clean at 2.9 mm with A1 recommended either way. The optimisation
   options are in the next section.
5. **Releasing the legend change** (`legend-review`), after you have
   looked at the footer comparison.
6. **Git history clean-up** (privacy report): only after your decision.

## Performance findings (A2 layout and editor loading)

- **Your tree on A2** (`a2-poster` branch): the first layout takes 9 s,
  two balance attempts 31 s, and the clean-first fallback 16 s.
  Because the clean-first rule wins whenever no attempt is both clean and
  readable, the balance attempts only help a poster that one of them makes
  fully clean. For yours they cost 31 s and change nothing shown.
- **The test suite's doubling** comes from the same search running on the
  test families' crowded posters (each one a full layout again).
- **Options:**
  - **(a)** Try the balances only when the first layout is within a
    handful of problem spots of clean. This keeps today's 15-spot
    threshold, but measures the time limit from the first layout's own
    duration.
  - **(b)** Remember, per tree and paper, the balance that worked last
    time, and try it first.
  - **(c)** Make a balance attempt cheaper by reusing the first layout's
    name size instead of searching for it again.
  - *Recommended: (a) now, (b) next.* (a) keeps the rim-line fix and
    restores the old timings.
- **Opening your tree in the editor:** about 12 s on this machine before
  the poster appears (2A0, 11 daughters' families). The layout itself has
  not slowed since 1.0.44 on your paper (about 10.5 s). The daughters'
  families cost little time but halve the names' size (7.1 mm to 3.9 mm on
  2A0).
- **Biggest win available:** keep the last layout and show it at once
  when a tree is opened, while the new one is computed in the background.

## Remaining (in order)

- Interface translation layer (Arabic/English) and right-to-left layout of
  the editor.
- Database additions (after approval), then profiles, search and records
  use them (English names, places, full dates, biographies, typed
  relationships, events).
- Analytics dashboard.
- Charts: pedigree, Ahnentafel, family group sheet; fan, hourglass,
  bowtie; timeline, radial, map; network, family register, genogram.
- Poster: generation key from Generation 1 (the model's §6), with the
  322-poster QA.

## Test and build results

| Run | Result |
| --- | --- |
| `hotfix-style-crash` (1.0.48), full suite | 483 passed |
| `generation-numbering`, full suite | 501 passed |
| `a2-poster`, full suite / layout QA | 475 passed / 322 passed |
| `node-preview-lab`, page and its tests | renders all seven designs, no page errors; 3 tests pass |
| `records-quality` (all platform work), full suite | running |
| 1.0.48 installer workflow (Windows) | passed, including the new menu smoke test |
