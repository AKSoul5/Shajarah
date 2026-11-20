# Shajarah roadmap

The single place for what is being built next, and why. Every session, in the
cloud or on the desktop, starts here and updates it in the same change that
moves the work on. A plan that exists only in a conversation does not count.

- **Detailed plan** (tasks, ownership, tests, rollback):
  [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md). It was
  approved by the owner on 8 Nov 2026 and governs where anything else
  disagrees.
- **Rules for working here:** [`CLAUDE.md`](CLAUDE.md).
- **What is published:**
  [GitHub releases](https://github.com/AKSoul5/Shajarah/releases). Every
  release goes through the draft-only pipeline. A person publishes, and
  nothing is merged or published without the owner's approval.

## Status (14 Nov 2026)

| | |
|---|---|
| **Released** | **1.0.54** (19 Nov): the centred son's mother stands straight above her husband; limbs grow gradually from behind each name. **1.0.53**: side branches from their own badge. **1.0.52**: the start-up never deletes, overwrites, moves or renames an existing database folder or password file |
| **Drafted** | **1.0.55: poster fixes and speed** (owner's decision of 19 Nov). Childless sons beside the trunk are ordinary names; the editor lays out both placements of the centred son's mother at once. Everything after it moves one version later |
| **Drafted** | **1.0.56: names on very large papers** (19 Nov). A family whose names were set at a twentieth of their size on a very large paper (daughters hidden, 1024A0) is laid out in proportion. Everything after it moves one version later |
| **Drafted** | **1.0.57: cleaner side families** (20 Nov). The untangling sees dotted lines through a daughter as drawn, and moves side families' names. Everything after it moves one version later |
| **Drafted** | **1.0.58: posters come back at once** (20 Nov). A family's poster is made again from its last recipe in a fraction of a second (0.4 s against 104 s); export waits for a finished poster. Everything after it moves one version later |
| **In release** | **1.0.59: side families apart** (20 Nov). Where a poster is left with problems, it is laid out again with room between neighbouring side families' fans, and kept when cleaner. Everything after it moves one version later |
| **Next** | **1.0.60: data protection** (S2) |
| **Waiting, unmerged** | Branches `wives-lines` and `spouse-align` (poster). They were tested on 1.0.51 and are scheduled for 1.0.65 |

## Order of work (binding)

**Safety comes first.** Data protection, recovery and relationship integrity
come before any product or botanical work. Each release:
- is independently testable;
- changes at most one schema item, additively, behind a verified backup;
- passes the release pipeline;
- is published only by the owner.

| Release | Theme | Contents (plan task ids) | Status |
|---|---|---|---|
| S0 | Release pipeline | Q1 checks, database, Windows build, historical upgrades, draft only, live verification after publishing (Q2–Q5 partly) | **Done** |
| 1.0.52 (S1) | Emergency | E1 classification, pointer file and new-folder set-up; E2 recovery window; E3 repair on a copy; E4 emergency export | **Released** |
| 1.0.53 | Poster fixes | Side branches from their own badge; childless sons' lines clear the next badge (English A1 clean); wives' boxes by their own children (QA 30 invented families: 3 better, none worse). Brought forward by the owner on 10 Nov, ahead of data protection | **Released** |
| 1.0.54 | Poster fixes | The centred son's mother upright above her husband, her branch straight up; limbs no wider than the names they join, widening gradually; the trunk's top hidden under the canopy base's oval (layout QA: 448 clean, 3 posters with larger names, none smaller). Brought forward by the owner on 19 Nov, ahead of data protection | **Released** |
| 1.0.55 | Poster fixes and speed | Childless sons beside the trunk as ordinary son names, 0.9 of their brothers' (invented crowded trunk: smallest names +16% at A1, +11% at A0; one Refined A1 poster 4.95 to 4.59 mm, accepted); the editor lays out both placements of the mother in two workers (3.38 to 2.57 s on a family needing both). Layout QA: 448 clean, unchanged | **Drafted** |
| 1.0.56 | Names on very large papers | Where neither the full nor the legible size is clean, the sizes between are tried (a private 340-person family on 1024A0 with daughters hidden: names 7.7 to 150 mm, clean). Layout QA unchanged | **Drafted** |
| 1.0.57 | Cleaner side families | Untangling checks forked dotted lines as drawn (a score of false problems made it give up); side families' names can be moved (private 340-person family: daughters hidden A2 clean, as saved A2 3 to 2 problems). Layout QA: one larger, none worse, same time | **Drafted** |
| 1.0.58 | Posters come back at once | Each poster's recipe replayed in one attempt (340-person family A0: 0.4 s against 104 s, the same poster); shown at once, the search runs behind it; export waits for a finished poster. Layout QA unchanged | **Drafted** |
| 1.0.59 | Side families apart | A poster left with problems is laid out again with room between the fans of side families whose badges are close, kept only when cleaner, as legible, names no smaller (private 340-person family: wives and daughters hidden 4A0 1 problem to clean, as saved A0 2 to 1). Layout QA: 448 clean, unchanged | **In release** |
| 1.0.60 (S2) | Data protection | D1 backup format; D2 pre-migration backup; D3 verification, with export and folder copy when it fails; D4 retention (10 independent recovery points, migration-aware; 3 daily and 4 weekly project backups; configuration-aware free-space check); D5 restore into a new folder; D6 migration lint and runner v2 (one transaction, checksums); D7 `SchemaMeta`; D8 downgrade and support-floor checks; D9 daily backup on the first start of each day; D10 failure explanations; Q4 historical matrix; **Windows release gate W-1 to W-9** (plan §7) | **Next** |
| 1.0.61 (S3) | Relationship integrity | I1 one validator after every change; I2 add-a-parent loop check (C3); I7 `ChangeRecord` (structured repair and correction records, never person notes); I3 parent-correction workflow (C2); I4 loop resolution; I5 undo that can't get stuck; I6 open with repair; I8 relationship history; I9 Open Project keeps citation and media order (H13) | Planned |
| 1.0.62 (S4) | GEDCOM identity | G1 family namespace and person and union ids (additive migration); G2 export with `REFN`+`TYPE` and `_UID`, no invented marriages, no `DIV` for an ended marriage; G3 import of Shajarah's own files by id; G4 external matches as confirmed suggestions only, never an automatic merge; G5 interoperability notes | Planned |
| 1.0.63 (S5) | Silent data loss | L1–L4 (H9–H12) | Planned |
| 1.0.64 (S6) | Recovery Centre | C1 two tiers (start-up window and in-app page); C2 health, integrity, backups, restore points, GEDCOM validation, project repair, explanations; C3 optional external backup location | Planned |
| 1.0.65 | Inclusion and counts | One inclusion rule for daughters' families (H3); four counts that add up (H4); notice on exports; line-tracing through spouse frames (H5); the `wives-lines` and `spouse-align` branches | Planned |
| 1.1.0 | Integration | Merge the `integration` branch (Generation-1 key, Arabic interface, profiles) | Planned |
| 1.2 → 2.0 | Product | Shared geometry contract; fidelity (vector PDF, real text measurement, fonts); records (schema phase 1, after approval); the botanical renderer | Planned |

## Defect register

Ids are referenced by the plan and by commit messages. The evidence behind
each was collected on 1.0.51 (strategy and safety reports, kept privately
because they contain real families).

| Id | Defect | Fixed in |
|---|---|---|
| C1 | A GEDCOM export re-imported into the same family duplicates people when a stored name reads back differently (for example, an honorific moved to the laqab). There is no persistent identity, so the whole line below that person is duplicated | 1.0.62 |
| C2 | Changing a recorded parent's gender is accepted. The tree then fails its own validator: undo is refused, and project files saved afterwards cannot be reopened | 1.0.61 |
| C3 | Through the API, adding a parent whose father is the child or one of the child's descendants creates a loop. Undo and project-open then refuse the tree | 1.0.61 |
| C4 | The release workflow published without running any tests | **1.0.52 / S0** |
| C5 | Desktop migrations at every start with no backup and no checksum check; the update test never upgraded an old version's database | 1.0.60 (backup, checksums) · S0 (upgrade test) |
| M5 | The first start deleted the database folder when `PG_VERSION` was missing | **1.0.52** |
| M1–M4, M6–M8 | Migration risks: no backup; half-applied upgrades; edited migrations unnoticed; older app on a newer database; beta PostgreSQL with no major-upgrade path; update installed on quit | 1.0.60 (M6 later) |
| H1 | The line check and QA verify `edges`, not the drawn `branches`; a wrong drawn line can pass every check | 1.2 |
| H2 | Spouse frames can be placed off the page | 1.2 |
| H3 | Whether a daughter's family is shown depends on how the child was entered | 1.0.65 |
| H4 | The footer counts recorded people, not the people drawn | 1.0.65 |
| H5 | "Trace their line" breaks at spouse frames | 1.0.65 |
| H6 | A missing father moves a daughter's child into the paternal line | Owner's decision needed |
| H7 | One person can have up to three different generation numbers | 1.1.0 |
| H8 | GEDCOM loses or invents data (`DIV` for every marriage end, marriages invented for co-parents, life events dropped) | 1.0.62, then 1.4 |
| H9–H12 | Over-long imported values; merges failing on long notes; mixed Hijri and Gregorian years; hidden marriages reappearing after project open | 1.0.63 |
| H13 | Open Project can reorder citations across sources: restored rows share one creation time, and the tree is loaded in creation-time order. Media are exposed to the same tie. Found while validating photo-free project backups | 1.0.61 |

## Decided (owner)

- **U7, update recovery points** (8 Nov 2026, revised the same day). Before every version change and schema migration, the app keeps **10 independent recovery points**. Each holds:
  - only the WAL needed to start, compressed with zstd, with a verified full-copy fallback;
  - project files without photos, which are restored from the same folder.

  Retention is migration-aware, and protected points are never deleted. An existing point is reused only when contents, schema, migration history and PostgreSQL compatibility all match. The free-space check reads the actual PostgreSQL configuration (replication slots, archiving, `wal_keep_size`, the migration's own WAL), never treats `max_wal_size` as a ceiling, and never changes a setting. It refuses, and explains why, when it can't establish a safe requirement. Nothing is ever deleted to make room. See plan §5.6.
- **U8, dated project backups** (8 Nov 2026): one on the **first start of each day, before the editor opens**, skipped when nothing changed. Keep the **3 most recent daily** and **4 weekly**, the weekly ones kept independently of daily cleanup. Never deleted: the live database, the newest backup of each kind, or a backup pinned for recovery. Creation and cleanup are safe against interrupted shutdowns. See plan §5.6.
- **Every backup failure is explained** (8 Nov 2026): what failed, whether the database is safe, which recovery point is available, and what to do next.
- **Windows is a release gate for 1.0.60** (8 Nov 2026): criteria W-1 to W-9 in plan §7 must pass on the installed app.
- **External backup location** (8 Nov 2026): its own free-space check on its own drive (U6, C3).

## Open decisions (owner)

Full wording and recommendations are in the plan, §10. Needed soonest:

- **U1** (before 1.0.61): a parent's recorded role (father or mother) is kept separately from their gender, and a mismatch is a notice, not an error.
- **U3** (applies to every release): every release waits for the whole pipeline.
- **U9** (before 1.0.62): opening a project beside its original keeps ids, or makes an independent copy.
- **U13** (for new installs): keep the database in `%LOCALAPPDATA%` rather than the roaming profile.
- **U2, U4–U6, U10–U12, U14, U15:** see the plan.

Still open for product work: the daughter-family inclusion rule, the
missing-father rule (H6), how to show co-parents without a marriage, generation
authority, and font licences.
| **Drafted** | **1.0.57: cleaner side families** (20 Nov). The untangling sees dotted lines through a daughter as drawn, and moves side families' names. Everything after it moves one version later |
