# Progress checklist

Kept up to date during the overnight work. Nothing below is merged into
`main` or released except where it says so; every item is on its own
branch for review.

## Released (with approval)

| Version | What | Checks |
| --- | --- | --- |
| 1.0.46 | No crossing lines; daughters' families; desktop menu bar | 456 tests, 322-poster QA, the app driven through every menu item |
| 1.0.47 | Eight branch colours per design | 475 tests, 322-poster QA |
| 1.0.48 | Hotfix: the Style menu crashed in 1.0.47 | 483 tests; a new Style-preview test; the installer's smoke test now opens every header menu. It fails on 1.0.47's code and passes here; it passed on Windows before 1.0.48 was published. |

## The genealogy platform (branches, in the order they build on each other)

Each branch contains the ones above it. `family-register` holds all of it.

| Branch | Tip | What | Tests |
| --- | --- | --- | --- |
| `generation-numbering` | `cf86a13` | Generation numbers from a reference person (model in `docs/generation-numbering.md`, revision 3): module, tests, editor display, "Count generations from this person" | 18 new; full suite 501 pass |
| `family-engine` | `c0bf940` | `src/lib/family`: kin, siblings by kind, step-relations, lineage, descendants, branches, record findings (missing / possible / confirmed), duplicates, completeness, combined search | 22 new (incl. 10,000 people) |
| `person-profile` | `4facc41` | Profile tab: identity, family (every relative a link), place in the family, record findings; back and forward | 5 new; checked in the running editor |
| `people-search` | `c09e089` | Filters on the member list (gender, status, generation, branch, years, incomplete records), combined with the name search | checked in the running editor |
| `records-quality` | `4d1f817` | Records view: completeness by branch and area; what cannot be right, what is worth checking, what is not recorded | full suite 528 pass |
| `interface-language` | `a39d20a` | Arabic/English interface, right to left in Arabic, remembered per person (first pass: the new screens, header, list) | 4 new; checked in the running editor |
| `family-analytics` | `54325b2` | Analytics view: overview, generations, branches, years by decade with coverage, ages, names, marriages | 7 new |
| `charts-ancestors` | `a2e72b1` | Charts view: ancestors (pedigree), Ahnentafel (standard numbering, pedigree collapse), family group sheets; SVG download, print / PDF | 8 new |
| `charts-fan-hourglass` | `a6fd4cb` | Fan, hourglass and bowtie charts | 2 new |
| `charts-timeline-radial` | `9f252d3` | Family timeline (recorded years only, says how many are undated), radial descendant tree | 1 new |
| `family-register` | `e59f9ce` | Family register (Register-style genealogical book with notes and sources) | 1 new; full suite running |

## Other branches (awaiting review, not merged)

| Branch | Tip | What | Tests |
| --- | --- | --- | --- |
| `a2-poster` | `c031b84` | Dense posters: lines from the base's rim untangled; canopy balances tried only near clean, within a bounded time. Your tree's A2: about 15 s (was about 35 s in 1.0.47), the same clean poster | 475 pass in 13 min 15 s (was 26 min); 322-poster QA pass |
| `node-preview-lab` | `b9b2acd` | `/lab/nodes`: every design's name boxes side by side (evaluation only) | 3 new; full suite to rerun (an earlier run was interrupted) |
| `privacy-fixtures` | `31f6eb2` | Real family names in two tests and a comment replaced with invented ones | merge and relationship tests pass |
| `legend-review` | `58f42a5` | The poster key's wording, updated to 1.0.48; also fixes the English generation key running off the page | legend tests pass; footer comparison sent |
| `platform-plan` | this file | Audit, plan, schema proposal, milestone 1 plan, this checklist | — |

## Awaiting your decision

1. **Which person is Generation 1 by default.**
   - As built: the person the canopy starts from when one is set; else the
     tree's root. In your tree that is the founder: Generation 1, with
     today's family at Generations 2–5.
   - The alternative is always the root. Your tree's root is the oldest
     recorded ancestor, so the founder would be Generation 82.
   - Any tree can still choose its own Generation 1.
   - *Recommended: as built.*
2. **Adopted children** (once the schema has adoption): numbered in the
   adoptive family, or shown as "raised in Generation 5" without a number.
   *Recommended: not numbered, as nasab does not pass by adoption.*
3. **The database additions** (`docs/schema-proposal.md`): approve the
   design before any migration is written. These are needed for English
   names, places, full and Hijri dates, biographies, typed relationships
   and events. Without them there is no map, no residence filter and no
   adoption.
4. **Merging and releasing.** Which branches to merge, in what order, and
   when to publish. *Suggested:*
   - **First,** `a2-poster` (the performance fix) and `legend-review`, as
     1.0.49.
   - **Then** the platform branches together (`family-register` contains
     all of them) after you have tried them, as 1.1.0.
5. **The genogram and the relationship network.**
   - **Genogram:** it needs health and relationship-quality information,
     which Shajarah does not record. It would add sensitive personal
     data, so it needs your decision.
   - **Relationship network:** a force-directed graph, which would need a
     new library (d3-force) or a hand-written layout.
   - *Recommended: defer both.*
6. **Git history clean-up** (the privacy report): only after your
   decision.

## Performance (A2 layout and editor loading)

- **Done on `a2-poster`:**
  - The wider balance search is withdrawn: it doubled the suite's time and
    changed nothing shown under the clean-first rule.
  - Balances are tried only within 15 problem spots of clean.
  - The time limit is now relative to the first layout, at most one
    minute.
  - The trunk-top line fix stays.
- **Result:**
  - The suite takes 13 min 15 s.
  - Your A2 poster takes about 15 s.
- **Opening your tree in the editor:** about 12 s on this machine (2A0).
  The layout itself has not slowed since 1.0.44 on that paper.
  - *Next win:* keep the last layout and show it at once when a tree
    opens, while the new one is computed.
  - The daughters' families cost little time, but halve the names' size
    on 2A0 (7.1 mm to 3.9 mm).

## Remaining

- **Database additions** (after approval), then use them everywhere:
  English names in search and posters, places (the geographic map and the
  residence filter), full and Hijri dates in the timeline, biographies in
  profiles and the register, typed relationships in profiles and charts,
  and events.
- **Interface translation, later passes:** the Style, View and Export
  menus, the forms, the notices and the start page.
- **Poster:** a generation key counted from Generation 1 (the model's §6),
  checked against the 322-poster QA.
- **Loading:** show the last layout at once.
- **Deferred:** genogram and relationship network (decision 5).

## Test and build results

| Run | Result |
| --- | --- |
| `hotfix-style-crash` (1.0.48), full suite | 483 passed |
| `generation-numbering`, full suite | 501 passed |
| `records-quality`, full suite | 528 passed |
| `a2-poster`, full suite / layout QA | 475 passed in 13 min 15 s / 322 passed |
| `family-register` (everything), full suite | running |
| New screens in the running editor | profile, search and filters, Records, Analytics, every chart format: no page errors; Arabic and English checked |
| 1.0.48 installer workflow (Windows) | passed, including the new menu smoke test |
