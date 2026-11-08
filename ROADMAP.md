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

## Status (8 Nov 2026)

| | |
|---|---|
| **Released** | **1.0.52**: the start-up never deletes, overwrites, moves or renames an existing database folder or password file; a recovery window replaces it. Upgrades from 1.0.32–1.0.51 and the live update were verified |
| **In review** | Branch `ci/skip-published-draft`. When the version is already published, the draft step ends green with a notice instead of failing, so docs-only pushes to `main` stay green |
| **Next** | **1.0.53: data protection** (S2) |
| **Waiting, unmerged** | Branches `wives-lines` and `spouse-align` (poster). They were tested on 1.0.51 and are scheduled for 1.0.58, not 1.0.53 |

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
| 1.0.53 (S2) | Data protection | D1 backup format; D2 pre-migration backup; D3 verification, with export and folder copy when it fails; D4 retention (10 verified, plus at least 3 dated project backups); D5 restore into a new folder; D6 migration lint and runner v2 (one transaction, checksums); D7 `SchemaMeta`; D8 downgrade and support-floor checks; Q4 historical matrix | **Next** |
| 1.0.54 (S3) | Relationship integrity | I1 one validator after every change; I2 add-a-parent loop check (C3); I7 `ChangeRecord` (structured repair and correction records, never person notes); I3 parent-correction workflow (C2); I4 loop resolution; I5 undo that can't get stuck; I6 open with repair; I8 relationship history | Planned |
| 1.0.55 (S4) | GEDCOM identity | G1 family namespace and person and union ids (additive migration); G2 export with `REFN`+`TYPE` and `_UID`, no invented marriages, no `DIV` for an ended marriage; G3 import of Shajarah's own files by id; G4 external matches as confirmed suggestions only, never an automatic merge; G5 interoperability notes | Planned |
| 1.0.56 (S5) | Silent data loss | L1–L4 (H9–H12) | Planned |
| 1.0.57 (S6) | Recovery Centre | C1 two tiers (start-up window and in-app page); C2 health, integrity, backups, restore points, GEDCOM validation, project repair, explanations; C3 optional external backup location | Planned |
| 1.0.58 | Inclusion and counts | One inclusion rule for daughters' families (H3); four counts that add up (H4); notice on exports; line-tracing through spouse frames (H5); the `wives-lines` and `spouse-align` branches | Planned |
| 1.1.0 | Integration | Merge the `integration` branch (Generation-1 key, Arabic interface, profiles) | Planned |
| 1.2 → 2.0 | Product | Shared geometry contract; fidelity (vector PDF, real text measurement, fonts); records (schema phase 1, after approval); the botanical renderer | Planned |

## Defect register

Ids are referenced by the plan and by commit messages. The evidence behind
each was collected on 1.0.51 (strategy and safety reports, kept privately
because they contain real families).

| Id | Defect | Fixed in |
|---|---|---|
| C1 | A GEDCOM export re-imported into the same family duplicates people when a stored name reads back differently (for example, an honorific moved to the laqab). There is no persistent identity, so the whole line below that person is duplicated | 1.0.55 |
| C2 | Changing a recorded parent's gender is accepted. The tree then fails its own validator: undo is refused, and project files saved afterwards cannot be reopened | 1.0.54 |
| C3 | Through the API, adding a parent whose father is the child or one of the child's descendants creates a loop. Undo and project-open then refuse the tree | 1.0.54 |
| C4 | The release workflow published without running any tests | **1.0.52 / S0** |
| C5 | Desktop migrations at every start with no backup and no checksum check; the update test never upgraded an old version's database | 1.0.53 (backup, checksums) · S0 (upgrade test) |
| M5 | The first start deleted the database folder when `PG_VERSION` was missing | **1.0.52** |
| M1–M4, M6–M8 | Migration risks: no backup; half-applied upgrades; edited migrations unnoticed; older app on a newer database; beta PostgreSQL with no major-upgrade path; update installed on quit | 1.0.53 (M6 later) |
| H1 | The line check and QA verify `edges`, not the drawn `branches`; a wrong drawn line can pass every check | 1.2 |
| H2 | Spouse frames can be placed off the page | 1.2 |
| H3 | Whether a daughter's family is shown depends on how the child was entered | 1.0.58 |
| H4 | The footer counts recorded people, not the people drawn | 1.0.58 |
| H5 | "Trace their line" breaks at spouse frames | 1.0.58 |
| H6 | A missing father moves a daughter's child into the paternal line | Owner's decision needed |
| H7 | One person can have up to three different generation numbers | 1.1.0 |
| H8 | GEDCOM loses or invents data (`DIV` for every marriage end, marriages invented for co-parents, life events dropped) | 1.0.55, then 1.4 |
| H9–H12 | Over-long imported values; merges failing on long notes; mixed Hijri and Gregorian years; hidden marriages reappearing after project open | 1.0.56 |

## Open decisions (owner)

Full wording and recommendations are in the plan, §10. Needed soonest:

- **U1** (before 1.0.54): a parent's recorded role (father or mother) is kept separately from their gender, and a mismatch is a notice, not an error.
- **U3** (applies to every release): every release waits for the whole pipeline.
- **U7, U8** (before 1.0.53): disk budget for 10 cold copies; frequency of dated project backups.
- **U9** (before 1.0.55): opening a project beside its original keeps ids, or makes an independent copy.
- **U13** (for new installs): keep the database in `%LOCALAPPDATA%` rather than the roaming profile.
- **U2, U4–U6, U10–U12, U14, U15:** see the plan.

Still open for product work: the daughter-family inclusion rule, the
missing-father rule (H6), how to show co-parents without a marriage, generation
authority, and font licences.
