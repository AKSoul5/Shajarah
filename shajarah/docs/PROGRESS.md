# Progress checklist

Nothing below is merged into `main` or released, except where it says so.
Every item is on its own branch for review.

## Released (with approval)

| Version | What | Checks |
| --- | --- | --- |
| 1.0.46 | No crossing lines; daughters' families; desktop menu bar | 456 tests; 322-poster QA; the app driven through every menu item |
| 1.0.47 | Eight branch colours per design | 475 tests; 322-poster QA |
| 1.0.48 | Hotfix: the Style menu crashed in 1.0.47 | 483 tests; the installer's smoke test now opens every header menu; passed on Windows |
| 1.0.49 | The poster key (`legend-review`): accurate wording; every colour explained; generation chips | 501 tests; 322-poster QA; the Windows installer run passed (with its smoke test); release assets published |
| **1.0.50** | **Posters** (`a2-poster`, `spouse-legend`, `node-designs`, `cousin-marriages`): seven new name designs; spouses in the key; cousin marriages and complex families; faster dense posters | 600 tests; 448-poster QA; production build; the Windows installer run passed (with its smoke test); release assets published (`v1.0.50`) |

## The genealogy platform (branches, in the order they build on each other)

Each branch contains the ones above it.

| Branch | Tip | What | Tests |
| --- | --- | --- | --- |
| `generation-numbering` … `family-register` | `e59f9ce` | Generation numbers, the family engine, profiles, search and filters, the Records view, Analytics, Charts (pedigree, Ahnentafel, group sheets, fan, hourglass, bowtie, timeline, radial), and the family register | full suite 551 pass; production build passes |
| `translate-menus` | `9883c94` | Interface in Arabic, second pass: header, View menu, undo and redo, find, a name's menu, the Style menu (with every design's and foundation's name), the export menu, the member form and the relations. **Fixed:** "Add a child…" and "How are they related to…" did nothing when the person panel opened on its Profile tab | full suite 553 pass; checked in the running editor, Arabic and English |
| `cousin-editing` | `ea8d912` | Adding a relative who is already recorded: the people it may be are offered with their nasab, to link instead of recording twice. Deleting a linked person says what is linked. "Hide on poster" beside each spouse (nothing deleted) | 3 new; checked in the running editor |
| `integration` | `2b983ac` | Everything above together (the editor chain and the poster chain), for trying 1.1.0; now with the four rows below | full suite 685 pass and QA 448 pass (at `2b983ac`); production build pass (at `db12a05`) |
| `instant-layout` | `3fbbce4` | **A tree opens with its poster at once**: the last layout is kept on this computer (IndexedDB) with a fingerprint of everything it depends on; no layout runs when nothing changed, otherwise the last poster shows while the new one is laid out | 3 new; measured 8.9 s → 0.5 s on a 243-person tree |
| `translate-panels` | `dc68ef7` | Interface in Arabic, third pass: the person panel (relationship, details, poster tiers), photos and sources, the not-on-the-poster panel, the notices over the poster, zoom, the Files panel, pasting a nasab | full suite 676 pass; checked in the running editor in Arabic |
| `translate-rest` | `db12a05` | Interface in Arabic, last pass: the Sources page; the start page (its text moved to a client part, with the language switch); the GEDCOM and family-outline readers' warnings | 5 new; full suite 681 pass; both pages checked in the running app in Arabic |
| `generation-key` | `2b983ac` | The poster key numbers generations as the editor does once the family has chosen its Generation 1 ("−2" for older ones); otherwise as before. Colours unchanged | 4 new; full suite 685 pass; QA 448 pass |

## Posters (branches on 1.0.49, in order)

| Branch | Tip | What | Tests |
| --- | --- | --- | --- |
| `spouse-legend` | `4cdd4ab` | Spouses (Phase 6A): the key draws the poster's own spouse frame (shape, fill, rule, ornaments, dashed for daughters' husbands); the capsule spouse gets a cue beyond colour | 9 new: identity from records only; multiple wives; multi-role people; key equals poster across 7 designs × 3 styles × 4 node shapes; mode and style changes; Arabic and English |
| `node-designs` | `7d57b1f` | **Geometry contract** (`nodeGeometry.ts`): one definition per design, shared by the layout, the renderer and the QA, which reports drawn shapes that touch. **Seven new designs:** soft rectangle, classic cartouche, octagonal seal, heraldic shield, hexagon, cameo, scalloped medallion (now a fine engraved rosette); on their posters every name's ring and stroke is kept clear. **Node Design Lab** (`/lab/nodes`); the Style menu lists every design, suggested ones first. Contact sheets at A2 and A1 (300 dpi), with PDF exports. Report: `docs/node-designs.md` | node-design tests 8 new; QA 448 (322 + 133 design cases) pass |
| `cousin-marriages` | `c85562e` | Cousin marriages, complex families, the branch deciding a child's place, a marriage hidden on the poster (`docs/complex-families.md`). **Fixed:** children of a cousin marriage were drawn as outsiders on the mother's dotted line when her family was shown; they now stay in their father's line. A spouse also drawn in their own branch is marked (ring, plus a key entry). A childless cousin marriage is shown once. Eight cousin fixtures, seven complex-family fixtures; pedigree-collapse helper. **Fixed:** a branch poster lost the couple's children when the mother's family was shown | 53 + 27 new; the children test fails without the fix |

## Other branches (awaiting review)

| Branch | Tip | What |
| --- | --- | --- |
| `a2-poster` | `c031b84` | Dense posters faster (a large real family's A2: about 15 s, was about 35 s); 475 tests and 322-poster QA pass |
| `privacy-fixtures` | `31f6eb2` | Real family names in tests replaced with invented ones |
| `platform-plan` | this file | Plans, the schema proposal, this checklist |

## Decisions (recorded 2026-11-03)

1. **Releases, in a controlled order.**
   - **1.0.50 (approved):** `a2-poster`, `spouse-legend`, `node-designs`
     and `cousin-marriages`, on top of 1.0.49. **Released** (`1961357`).
   - **1.1.0 (not yet):** `integration`, only after 1.0.50 has been tried
     and the integrated build reviewed. Before it is released, the
     production build is run again on the exact final `integration`
     commit (the last build passed at `db12a05`; `2b983ac` and anything
     after it still need it).
   - Nothing else is merged into `main` or published.
2. **Rings on the original shapes** (leaves, ovals, circles): left as they
   are. Names' legibility is not given up to keep every pair of rings
   apart.
3. **A daughter's husbands left out of the records:** restored later, by
   hand, after a backup of the data and a check of all five marriages and
   each one's children. No real family details in this repository.
4. **Children of a cousin marriage (confirmed):** under their father in
   his branch, under their mother in hers, and once only in the whole
   tree. Their recorded parents never change.
5. **Database additions:** the proposal is written up for review
   (`docs/schema-proposal.md`): adoptive, step and guardian parents,
   disputed parentage, marriage status and sources. No migration until it
   has been reviewed.
6. **Generation 1: true lineage numbering.** The family sets its own
   Generation 1; older generations are numbered before it (−1, −2, …),
   descendants after it (1, 2, …). Generation 1 is never redefined by
   whoever is the oldest on one poster. Generation colours stay as they
   are.

Still open: adopted children's numbering, the genogram and the
relationship network, Git history clean-up.

## Remaining

- **Database additions** (after approval), then English names, places
  (map, residence filter), full and Hijri dates, biographies, typed
  relationships and events everywhere.
- ~~Interface translation~~ (done: `translate-rest`). Still English: error
  messages sent by the server itself, and the window title.
- **Poster:** the generation key counts from the family's Generation 1 on every poster (decision 6); `generation-key` did it for a chosen Generation 1 only, the default follows.
- ~~Loading: show the last layout at once~~ (done: `instant-layout`).
- **Known limitations:**
  - On the complex test family, the shield and octagon come out at a
    smaller overall scale on A1 than on A2. This is how the clean-first
    search settles there; the names are still legible.
  - Rings of two original-shape names can touch on dense posters (see
    decision 2).
