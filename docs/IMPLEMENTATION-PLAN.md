# Shajarah: binding implementation plan, version 2

*Approved by the owner on 8 Nov 2026.*

**Status:** S0 (the release pipeline) and S1 (1.0.52, the start-up fix) are **done and released**. Next is S2 (1.0.53). The overview, the defect register and the open decisions are in [`/ROADMAP.md`](../ROADMAP.md); this file is the detailed plan behind it. Where it says "you", it means the owner.

The investigation reports this plan cites (`SHAJARAH-SAFETY-INVESTIGATION.md`, `SHAJARAH-STRATEGY.md`) contain details of real families and are kept outside the repository. Everything needed to carry out the plan is in this file and in `ROADMAP.md`.

**Binding inputs:**

- the decisions recorded in `SHAJARAH-SAFETY-INVESTIGATION.md` (approved);
- your eight refinements of 8 Nov (R1–R8 below).

Where this plan and earlier documents disagree, **this plan governs**.

**Evidence labels:**

- **[L]** I reproduced it or checked it in the code.
- **[C]** read in the code but not run.
- **[H]** a hypothesis that a named task must verify.



---

## 0. Binding requirements

| # | Requirement (yours) | Where it is implemented |
|---|---|---|
| R1 | The new start-up never deletes **or overwrites** an existing database folder or password file. The original folder is preserved, and there is a recovery path | §2 (E1–E4) |
| R2 | An explicit parent-correction workflow. Gender is not parentage, children are never moved silently, and historical relationships are never discarded | I3, I8 |
| R3 | **No repair information in ordinary person notes.** Structured, reviewable repair records that keep the original relationship and the confirmed correction | I7 (the `ChangeRecord` model, §5.3) |
| R4 | Persistent, **globally unique** identifiers with a family namespace. Person ids, union/marriage ids and GEDCOM record pointers are kept distinct. External matches are suggestions requiring confirmation | G1–G5 (§6) |
| R5 | Every migration operation is verified to support the transaction strategy, and operations that cannot be rolled back transactionally are handled explicitly | D6, D7 (§5.2) |
| R6 | If backup verification fails, an export/retrieval option. Failures are explained, and the user is never left without an accessible recovery path | D3, E4 (§5.4) |
| R7 | Moving GitHub's "latest" label is distinct from rolling back an installation a user has already performed | §8 |
| R8 | Every critical defect has a regression test that reproduces the original failure and proves the fix. Real upgrades are tested from supported historical releases, not only fresh installs | §7, Q4, Q5 |

The earlier decisions still stand, unchanged:

- drafts until you approve publication;
- keep 10 verified pre-migration backups plus at least 3 dated project backups;
- always ask which relationship to remove in a loop;
- never merge automatically;
- the oldest supported upgrade is found by testing;
- safety before all product and botanical work.

---

## 1. New facts established for this revision [L]

1. **Every existing migration is transactional.**
   - The 4 migrations contain 41 statements: `CREATE TABLE`, `CREATE TYPE` (an enum, created whole), `CREATE [UNIQUE] INDEX` (not `CONCURRENTLY`), `ALTER TABLE … ADD COLUMN` (nullable) and `ADD CONSTRAINT`.
   - On a throwaway database in the sandbox's PostgreSQL 16:
     - all 4 ran in **one** transaction and committed (7 tables);
     - the same run plus an injected error rolled back **completely** (0 tables, 0 types);
     - the 4th migration, applied in a transaction to a database at the 3-migration state that held data, kept every row and parent link.
2. **Every historical release has the same database schema.**
   - All tagged releases from **1.0.7 to 1.0.51** have the same 4 migrations, project format 1, the same embedded PostgreSQL (`16.14.0-beta.17`), **and the deleting start-up code**.
   - **Only 1.0.32–1.0.51 still have tags on GitHub** (19 tags). Whether their installer assets can still be downloaded is to be checked by Q4 [H].
3. **The embedded PostgreSQL ships only `initdb`, `pg_ctl` and `postgres`.** There is no `pg_dump`, `pg_restore`, `pg_controldata` or `pg_upgrade` (checked in the published Linux package; the Windows package is [H], checked in Q2). Consequences:
   - backups are **cold copies plus project files made by the app**, never `pg_dump`;
   - folder checks read files, not `pg_controldata`;
   - a future major PostgreSQL upgrade needs a logical export made by the app.
4. **Measured in v1, unchanged:**
   - a cluster missing only `PG_VERSION` keeps all its data, and starts again once the file is restored;
   - `initdb` writes `PG_VERSION` within 50 ms;
   - the live database is in the roaming profile (`%APPDATA%\Shajarah\database`).

---

## 2. Emergency: protecting the database at start-up (release S1 = 1.0.52)

### 2.1 Principle: never delete, overwrite, move or rename an existing folder

Version 1 proposed *renaming* an incomplete folder. That is withdrawn, because renaming changes where the original lives.

Instead, the app chooses **which** folder to use through a small **pointer file** of its own, and creates every new database in a **new** folder.

```
%APPDATA%\Shajarah\database\
   cluster\                 ← the legacy folder (every install up to 1.0.51): never moved, renamed or deleted
   password                 ← the legacy password: never overwritten
   clusters\<id>\           ← every cluster created from 1.0.52 on (staging, then complete)
   clusters\<id>.password   ← its own password, written once (temporary file, then rename)
   active.json              ← { activeCluster: "cluster" | "clusters/<id>", history: [...] }, replaced atomically
```

**The only files the app ever replaces** are its own pointer, its own markers and logs, and its own temporary files. A lint test (E1-T8) enforces this.

### 2.2 Start-up classification (read-only)

At start-up the app reads the active folder (the legacy `cluster` if there is no pointer yet), **without changing anything**. It recognises these classes:

| Class | Recognised by | Action |
|---|---|---|
| **None** | No pointer, no `cluster` folder | Create `clusters\<new>` (staging); `initdb`; configure; write `shajarah-cluster.json`; switch the pointer to it |
| **Ready** | `PG_VERSION` (a known version) and `global/pg_control`, then a successful start | Normal start. Record a "ready" entry in the pointer history. Nothing in the cluster is changed except by PostgreSQL itself |
| **Marker missing** | Not empty, no `PG_VERSION`, `global/pg_control` present (its size and magic number checked by reading the file) | **No initialisation.** Recovery window: "Your family database is present but its version marker is missing." Recovery path in §2.3 |
| **Incomplete** | Not empty, no `global/pg_control` | **No initialisation in it, and nothing moved.** Recovery window explains. If **no** family data can exist in it (no `base/` subfolder beyond the templates [H: rule to be proven in E1 tests]), offer "Start a new, empty database" (a new folder; the pointer switches; the old folder stays where it is) |
| **Fails to start** | `pg_ctl` reports an error | Recovery window with the log excerpt. Never retried in a way that changes files |
| **Password missing** | The active folder exists but its password file does not | Recovery window. **No new password is written for an existing cluster.** Recovery path in §2.3 |

### 2.3 Recovery paths (all keep the original untouched)

- **E2. Recovery window.** It runs in Electron's main process and needs no server and no database. It shows:
  - the class and a plain explanation (Arabic and English);
  - "Open data folder", "Save a diagnostic report" (file listing, sizes, logs; **no family data** unless you choose otherwise);
  - the actions below.
- **E3. Repair on a copy** (for "Marker missing" and "Password missing"):
  1. copy the original folder **file by file** to `clusters\<id>-repair`, and verify every file's hash against the original;
  2. in the **copy only**: write `PG_VERSION` ("16", checked against the `pg_control` version field), or set up local login for the copy so the password can be reset [H: method proven in E3 tests];
  3. start the copy and check that the tables and family counts are readable;
  4. **only after you confirm** what it found ("3 families, 120 + 45 people"), switch the pointer to the copy.
  
  The original folder stays exactly as it was, so you can always go back.
- **E4. Emergency export.** A read-only exporter in the main process, using the `pg` client directly with **no Next.js server**. It reads a started cluster (the original or a repaired copy) and writes one `.shajarah` project file per family to a folder you choose. It understands **schema version 4** (all historical releases, fact 2). Later schema versions add their own readers. Opening its output with the app's own `readProjectFile` and validator is part of its tests.

### 2.4 Rollback compatibility for S1

- A 1.0.52 install that has created no new cluster (the normal upgrade case) keeps using the legacy `cluster` folder. **Reinstalling 1.0.51 works** (E1-T7).
- If 1.0.52 switched the pointer (a new install, or a confirmed repair), 1.0.51 ignores the pointer and looks only at `cluster\`. It would then start from the legacy folder:
  - after a repair, that is the unrepaired original. 1.0.51 would **delete it** if its marker is missing, because that is the defect.
  - So the release notes and the recovery window must say: **do not reinstall 1.0.51 or older after a repair.**

---

## 3. Releases and dependency graph (binding)

**IDs:**

- **S0** = pipeline (workflow only)
- **S1 = 1.0.52** emergency
- **S2 = 1.0.53** data protection and migration runner v2
- **S3 = 1.0.54** relationship integrity and change records
- **S4 = 1.0.55** GEDCOM identity
- **S5 = 1.0.56** silent data loss
- **S6 = 1.0.57** Recovery Centre
- **Track P** follows, unchanged in order (1.0.58 inclusion and counts plus the poster branches → 1.1.0 integration → 1.2 geometry → 1.3 fidelity → 1.4 records → 2.0 botanical).

**Schema changes:** one per release, each additive, each through the S2 runner after a verified backup.

| Release | Schema change |
|---|---|
| S2 | `SchemaMeta` |
| S3 | `ChangeRecord` |
| S4 | `uid` columns and `FamilyTree.namespace` |

```
S0: Q1 ─► Q2 ─► Q3 ─► Q5(regression harness)
            │
S1:         ├─► E1 ─► E2 ─► E3
            │        └────► E4        (E1..E4 ─► S1 gate: Q4a matrix from 1.0.32–1.0.51)
            │
S2:         ├─► D1 ─► D2 ─► D3 ─► D4 ─► D5
            │                     │
            │   D6 (lint + runner v2) ─► D7 (SchemaMeta migration) ─► D8 (downgrade/floor)
            │   (D3 uses E4 for its retrieval path)              Q4b matrix
            │
S3:         ├─► I1 ─► I2 ──────────────┐
            │    └─► I7 (ChangeRecord, needs D7) ─► I3 ─► I4 ─► I5 ─► I6 ─► I8
            │
S4:         ├─► G1 (uid + namespace migration, needs D7) ─► G2 ─► G3 ─► G4 ─► G5
            │
S5:         ├─► L1 L2 L3 L4 (need I1)
            │
S6:         └─► C1 (needs D5, E4, I6, G4) ─► C2 ─► C3
```

**What can run in parallel:**

- E1–E4 with I1–I2: different owners and files. I1–I2 only *refuse* bad changes and need no schema change, so they can ship in S1 **if you choose** (decision U14). Otherwise they go in S3.
- D1–D5 with D6.
- G2's format work before G1.

---

## 4. Tasks, owners and file boundaries

### 4.1 Ownership

Each file has **one** owner during the safety track. A change to another owner's file needs that owner's review.

| Agent | Owns exclusively | Must not modify |
|---|---|---|
| **Agent 3: storage and recovery** | `desktop/electron/postgres.js`, `migrate.js`; new `desktop/electron/{cluster,pointer,backup,recovery,export,migrations-lint}.js` and `recovery.html`; `main.js` **start-up section only** (`start()`, the start-up error path); `prisma/schema.prisma` and new migrations (**each one needs your approval**); `src/lib/project.ts`; new `src/lib/backup/*`; the Recovery Centre (`src/app/recovery/*`, `src/components/recovery/*`) | genealogy rules, GEDCOM, workflows, layout |
| **Agent 1: relationships and GEDCOM** | `src/lib/restore.ts`, `genealogy.ts` (parent checks), `validation.ts` (invariants), `merge.ts`, `gedcom.ts`, `outline.ts`, `nasab.ts`; the rule code in `repository.ts` and `treeService.ts`; new `src/lib/integrity/*` (validator, correction planner, loop planner, change records); the correction, loop and repair dialogs; `MemberForm.tsx` (the gender-change confirmation only) | desktop start-up, workflows, schema files (it asks Agent 3 for schema changes) |
| **Agent 5: pipeline and tests** | `.github/workflows/*` (**after your approval**); the `tests/` harness and fixtures; `tests/qa/*`; `src/lib/qa/*`; `main.js` **smoke-test and update-test sections only**; new `desktop/electron/scripts/ci-*`; `tests/regression/*` and `tests/upgrade/*` | product code, apart from test seams agreed with the owner |
| **Agent 4: export checks** | `exportPoster.ts`, `copy-fonts.mjs`; the export smoke function it supplies to Agent 5 | everything else in the safety track |
| **Agent 2** | not active until Track P | everything |
| **Lead** | integration order, release checklists, reconciliation reports | product code |

### 4.2 Tasks

Each task lists its owner, what it depends on, and its tests. The defect ids C1–C5, H2–H12 and M1–M8 come from the strategy and the investigation.

**S0: pipeline (Agent 5)**

| ID | Task | Depends on | Tests |
|---|---|---|---|
| Q1 | The workflow from investigation §D2: checks → database → desktop → **draft** → your approval gate → publish → live update check. Development-branch trigger removed; one release at a time; `main` protected | your approval of the workflow file | Each class of failing test stops the run before a draft exists; a cancelled run publishes nothing; a draft is invisible to an installed 1.0.51 |
| Q2 | Test seams: `SHAJARAH_USER_DATA`, `--recovery-test`, a local update feed; confirm the Windows PostgreSQL package's tool list (fact 3) | Q1 | The live profile is never used in CI |
| Q3 | Fixtures: anonymised structural copies of the owner's real families (the real files are never committed); legacy-damaged databases created **by the old app itself** (a parent-gender conflict and a loop made through 1.0.51's accepted paths); damaged folders for every §2.2 class; damaged project files | — | An automatic check that no real name appears in any fixture |
| Q4 | **Historical upgrade matrix.** For every release whose installer can be obtained (1.0.32–1.0.51 expected [H]): install it, create data **with that version's own API and UI**, quit, install the candidate, launch, then compare family checksums and project exports. **Q4a** runs for S1, and **Q4b** onwards for every later release. The oldest passing release sets the support floor | Q1, Q2, Q3 | A matrix table in every release's evidence pack. Any regression blocks the release |
| Q5 | **Regression harness (R8).** Each critical-defect test is first committed **alone** and must fail on the unfixed code (the CI records this "red proof" as an artifact). Only then is the fix committed, and the test must pass. The pipeline refuses a fix pull request that has no recorded red proof for its listed defects | Q1 | The harness rejects a test that passes on unfixed code |

**S1: emergency (Agent 3)**

| ID | Task | Depends on | Tests |
|---|---|---|---|
| E1 | §2.1–2.2: pointer, classification, new-folder set-up, passwords written once, never overwritten | Q2 | E1-T1 to T8 (§7) |
| E2 | Recovery window (§2.3) | E1 | Every class shows the right explanation; it opens when the server cannot start |
| E3 | Repair on a copy (§2.3) | E1, E2 | The original's hash tree is unchanged; the pointer switches only after confirmation |
| E4 | Emergency export without the server (§2.3) | E1 | Exports of every Q3 database open in the app and pass the validator; counts are equal |

**S2: data protection and migration (Agent 3, with tests by Agent 5)**

| ID | Task | Depends on |
|---|---|---|
| D1 | Backup folder `%APPDATA%\Shajarah\backups\` (outside `database\`): one folder per backup, with a `manifest.json` (kind, time, app and schema versions, the source cluster, file hashes, family counts and checksums), project files, and a cold copy for pre-migration backups | E1 |
| D2 | Pre-migration backup: clean stop → copy → hashes → start → project exports (through E4's reader, so it works on any schema) | D1, E4 |
| D3 | Verification before migrating (re-hash; project files re-read and validated; counts equal). **On failure (R6):** no migration; the recovery window explains which check failed; offers **"Export my families now"** (E4), **"Copy my database folder to…"** (a verified file copy) and "Save a diagnostic report"; the app keeps running **on the current schema without migrating** [H: a new app on an old schema must be tested, or the window offers to reinstall the previous version (§8)] | D2 |
| D4 | Retention: 10 most recent **verified** pre-migration backups; at least 3 dated project backups (frequency, U8). Pruning touches only backups the app created and verified, never the newest of each kind | D2 |
| D5 | Restore: choose a backup → its cold copy is copied into a **new** `clusters\<id>` folder → start → verify → the pointer switches after you confirm. The current folder stays in place (no move) | D3 |
| D6 | **Migration safety lint and runner v2** (§5.2) | Q1 |
| D7 | `SchemaMeta` migration (app version, schema version, migration manifest hash) through runner v2 | D3, D6 |
| D8 | Detection of a database ahead of the app, and of one below the support floor (Q4) | D7, Q4 |

**S3: relationship integrity and change records (Agent 1; schema by Agent 3)**

| ID | Task | Depends on |
|---|---|---|
| I1 | One validator returning **all** problems, run after every change in both versions (demo and database); a change that adds a problem is refused | Q5 |
| I2 | Loop check on add-a-parent (C3) | I1 |
| I7 | **`ChangeRecord`** (§5.3): a structured, reviewable record of every correction and repair, holding the original relationship and the confirmed change. Never written into person notes | D7, I1 |
| I3 | **Parent-correction workflow (R2).** A gender change of a recorded parent asks first and lists the affected children. Gender and the parental role are separate: a gender change **never** changes a relationship by itself. "Correct relationships…" opens a per-child choice (keep / move to the other slot if it is free / end the link with a reason), all confirmed together, each producing a `ChangeRecord`. Nothing moves without an explicit choice | I1, I7, U1 |
| I4 | Loop resolution: lists the links in the loop and the consequences of removing each one (who leaves the line, whose generation changes, what the poster loses); you choose; a `ChangeRecord` is kept | I1, I7 |
| I5 | Undo that cannot get stuck (allowed when no new problem is added) | I1 |
| I6 | Open with repair: a damaged project file opens into a preview; repairs happen only through I3/I4 choices; it opens as a new family carrying its `ChangeRecord`s; the original file is unchanged | I3, I4 |
| I8 | **Relationship history:** an ended or corrected relationship stays visible ("recorded as father until 8 Nov 2026; corrected because …") in the person's panel and in the Centre, and can be reverted from its `ChangeRecord` | I7 |

**S4: GEDCOM identity (Agent 1; schema by Agent 3)**: G1–G5, defined in §6.

**S5: silent data loss**: L1–L4, unchanged from v1 (over-long imports, merged notes, `hiddenSpouses`, the calendar marker). Each needs a red-proof regression test.

**S6: Family Data Protection and Recovery Centre (Agent 3; checks by Agent 1)**

| ID | Task |
|---|---|
| C1 | Tier 1 (start-up window: E2–E4, D3, D5, D8) and tier 2 (an in-app page) share one problem catalogue: code, explanation in Arabic and English, severity, possible actions |
| C2 | Tier 2 sections: database health; relationship integrity (I1 results, I3/I4 actions); backup history; verify now (including a trial restore into a temporary folder); restore points; GEDCOM file validation before import; project-file repair (I6); change records (review and revert); plain explanations |
| C3 | Optional external backup location (version 1, §6, if approved) |

---

## 5. Data migration and recovery procedures

### 5.1 Start-up sequence, from S2 on (each step reads before it writes)

1. **Classify** the active folder (§2.2). Anything except "Ready" opens the recovery window.
2. **Start** PostgreSQL. Read `SchemaMeta` (absent means schema version 4, a historical release).
3. **Check versions** (D8):
   - a database ahead of the app is refused, with the right message;
   - one below the floor is refused, with instructions.
4. **If migrations are pending:**
   1. take the pre-migration backup (D2);
   2. verify it (D3). If verification fails, §5.4 applies.
5. **Migrate** with runner v2 (§5.2).
6. **Run the integrity validator** on every family. It **reports only**: no automatic repair.
7. **Start the server.**

### 5.2 Migration safety (R5)

**Lint at build time** (`migrations-lint.js`, D6). Every statement is classified against a written allow-list. The build fails on an unclassified statement.

| Class | Examples | Handling |
|---|---|---|
| **Transactional, safe** | `CREATE TABLE/TYPE/INDEX`, `ALTER TABLE ADD COLUMN` (nullable, or with a constant default), `ADD CONSTRAINT`, `INSERT/UPDATE` backfills | Run inside **the single transaction** with every pending migration. A failure rolls everything back, as proven in fact 1 |
| **Transactional, data-destroying** | `DROP COLUMN/TABLE`, narrowing a type, `DELETE` | Allowed only in a migration you approve explicitly, **two releases after** the code stopped using the data (expand/contract), and only after a verified backup |
| **Cannot run in a transaction** | `CREATE/DROP INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `VACUUM`, `CREATE/DROP DATABASE`, `ALTER SYSTEM` | **Not allowed in a normal migration.** If one is ever needed, it is a separately named **isolated step**: written to be idempotent (`IF NOT EXISTS`), run after the transactional batch, recorded on its own, with the backup kept until it succeeds. On failure, the recovery window offers to retry or to restore |
| **Transactional but not usable in the same transaction** | `ALTER TYPE … ADD VALUE` (PostgreSQL 12+) | Its own transaction, before any migration that uses the value. The lint enforces the order |
| **Outside the database's rollback** | sequence increments (harmless); files; the Prisma client generated for the new schema | No file operations in migrations. The app version and the schema version are checked together (D8) |

**Runner v2:**

- Pending migrations run in **one** transaction.
- `_prisma_migrations` checksums are compared, and an applied migration whose checksum differs refuses to start.
- `SchemaMeta` is written in the same transaction.
- An "isolated step" record is kept for each isolated step.

Its tests are D-T1 to D-T6 (§7).

### 5.3 Change records (R3): the `ChangeRecord` model

Added in S3 through runner v2: an additive table, approved by you before it is written.

| Field | Content |
|---|---|
| `id`, `familyId` | A UUID, and the family it belongs to |
| `kind` | `parent-correction`, `loop-resolution`, `import-repair`, `project-repair`, `merge`, `restore` |
| `problem` | Typed code and parameters (validator output), for example `ROLE_GENDER_MISMATCH {parent, children}` |
| `original` | JSON snapshot of **every affected relationship before** the change (ids, uids, roles, years) |
| `change` | JSON of the confirmed change, per relationship (kept / moved / ended, plus reason) |
| `explanation` | The text you were shown when you confirmed |
| `confirmedAt`, `appVersion` | When, and by which version |
| `status` | `applied` or `reverted` (`revertedBy` links the reverting record) |

**Rules:**

- **Records are append-only. Nothing is written into person notes.**
- Records travel in project files (an optional `changeRecords` array; format 1 readers ignore it [C: `readProjectFile` keeps unknown fields]).
- They appear in the Centre and in the person's panel (I8).
- Undo of a change also reverts its record.

### 5.4 When backup verification fails (R6)

1. **Nothing is migrated, and nothing is changed.**
2. The window names the failure in plain words, for example "One family's backup copy did not match the database (a family: 120 people in the database, 119 in the copy)", and gives the technical detail in the diagnostic report.
3. **Always available:**
   - **Export my families now** (E4) to a folder you choose;
   - **Copy the whole database folder to…** (a verified file copy);
   - **Try the backup again**;
   - **Continue without updating the database**, where the S2 tests show this version can run on the old schema [H]. Otherwise the window offers **reinstalling the previous version** (§8.2), without data loss.
4. The app never enters a state where the families can't be retrieved:
   - E4 works without the server;
   - the copy works without PostgreSQL;
   - the original folder is never altered.

### 5.5 Restore procedure (D5)

1. Choose a backup in the Centre or the recovery window.
2. Its manifest is checked.
3. The cold copy is copied into a **new** `clusters\<id>` folder, and its hashes are verified.
4. The new cluster is started, and its family counts are shown to you.
5. **Only after you confirm**, the pointer switches.
6. The previous folder stays where it was, and is listed for later deletion with your confirmation (U5).

---

## 6. GEDCOM identity (R4)

### 6.1 Three kinds of identifier, never confused

| Kind | Form | Scope | Persistence |
|---|---|---|---|
| **Family namespace** | UUID (`FamilyTree.namespace`) | One family tree, globally unique | Created with the family; kept by project save and open (U9 governs copies) |
| **Person id** | UUID (`Member.uid`) | Globally unique; always used together with the namespace | Never changes. Backfilled for existing people in G1 (`gen_random_uuid()`, transactional) |
| **Union id** | UUID (`Marriage.uid`) for recorded marriages. For a **co-parent pair without a marriage record**, a deterministic UUIDv5 of (namespace, both person uids), so it stays stable without inventing a marriage | Globally unique | As for person ids |
| **GEDCOM pointer** (`@I12@`, `@F3@`) | Generated per file | **That file only** | **Never** stored or used as identity |
| **Database row id** (cuid) | Internal | One database | Changes on project open (`withNewIds`); never exported as identity |

### 6.2 GEDCOM encoding

- **5.5.1, which is what Shajarah exports:**
  - on INDI and FAM records: `1 REFN urn:shajarah:<namespace>:person:<uid>` (or `:union:`) with `2 TYPE SHAJARAH` (standard tags);
  - plus `1 _UID <uid>` (the de-facto tag many programs keep);
  - a header `1 _SHAJARAH_FAMILY <namespace>`;
  - FAM records for co-parents carry no MARR (no invented marriage).
- **7.0, later:** the standard `UID`, `EXID`, and the same values.

### 6.3 Matching

- **Same namespace** (Shajarah's own file):
  - match by person/union id;
  - then **verify** gender and name similarity;
  - any disagreement is listed for you, not applied.
- **No or another namespace** (other programs, or another family):
  - scored name and position matching, repeated until stable;
  - **only suggestions**, each with the size of the subtree affected;
  - nothing is linked or merged without your confirmation;
  - honorific splitting shown as a suggestion.

### 6.4 Interoperability limits (written up in G5)

- Some programs drop `_UID` or `REFN` on export. Matching then falls back to suggestions.
- Some keep `REFN` but not its `TYPE`. The URN form makes the value recognisable on its own.
- Programs that merge or split people create new ids, which are treated as new.

At least two other programs' import/export behaviour is to be tested in G5 [H].

### 6.5 Tasks

| ID | Task | Depends on |
|---|---|---|
| G1 | Migration: `namespace` and `uid` columns, a unique constraint on (`familyId`, `uid`), backfill | D7, your approval |
| G2 | Export as in §6.2, with no `DIV` for an ended marriage | G1 |
| G3 | Import of Shajarah's own files by id | G2 |
| G4 | External suggestions | G3 |
| G5 | Interoperability document | G4 |

---

## 7. Acceptance tests by release

Every release also passes the whole Q1 pipeline and the Q4 historical matrix.

**R8 rule:** every test marked **(RED)** must be shown failing on 1.0.51 code before its fix lands (Q5).

### S0: pipeline

| Test | Proves |
|---|---|
| S0-T1 | A deliberately failing unit, layout-QA, GEDCOM, project, database and desktop test each stop the run, and no draft is created |
| S0-T2 | Cancelling during any job publishes nothing |
| S0-T3 | A draft is invisible to an installed 1.0.51's update check |
| S0-T4 | Publishing without your approval is impossible (the environment gate) |
| S0-T5 | Q5 rejects a "regression test" that passes on unfixed code |

### S1: 1.0.52 emergency

Every test fingerprints the whole data folder before and after.

| Test | Proves |
|---|---|
| **E1-T1 (RED)** | **A legacy cluster with a family and `PG_VERSION` removed: 1.0.51 deletes it (shown red); 1.0.52 changes nothing and opens the recovery window** |
| **E1-T2 (RED)** | **The same with the password file present: 1.0.51 overwrites the password (red); 1.0.52 leaves it byte-identical** |
| E1-T3 | A fresh install creates `clusters\<id>` and the pointer; no staging folder is left |
| E1-T4 | An upgrade from each of 1.0.32–1.0.51 (Q4a) with data created by that version: starts on the legacy folder; family checksums unchanged; the folder byte-identical apart from PostgreSQL's own files |
| **E1-T5 (RED)** | **An interrupted first set-up (folder with `PG_VERSION`, no `pg_control`): 1.0.51 fails at every start (red); 1.0.52 explains, keeps the folder, and offers a new empty database in a new folder** |
| E1-T6 | Password missing with a cluster present: no new password; recovery window |
| E1-T7 | Reinstalling 1.0.51 after an ordinary 1.0.52 upgrade still opens the families |
| E1-T8 | Lint: no delete, truncate or rename call in `desktop/electron` touches a path outside the app's own temporary, pointer and log files |
| E3-T1 | Repair on a copy: the original's fingerprint is unchanged; the copy starts and shows the right counts; the pointer switches only after confirmation |
| E4-T1 | The emergency export from every Q3 database: every file opens in the app, passes the validator, and has equal counts |

### S2: 1.0.53 data protection and migration

| Test | Proves |
|---|---|
| **D-T1 (RED)** | **A failure injected in the 2nd of 2 pending migrations: 1.0.51's runner leaves the 1st applied (red); runner v2 leaves the database unchanged** |
| **D-T2 (RED)** | **A tampered applied-migration checksum: 1.0.51 starts anyway (red); v2 refuses, with the right message** |
| **D-T3 (RED)** | **Older app on a newer database: 1.0.51 starts silently (red); from 1.0.53 on, start is refused** |
| D-T4 | Lint: every statement of the 4 existing migrations and of `SchemaMeta` is classified transactional; a `CONCURRENTLY`, `VACUUM` or `ADD VALUE` fixture is refused or isolated as §5.2 says |
| D-T5 | Each isolated-step fixture: idempotent re-run; failure leaves the backup and shows the recovery window |
| D-T6 | Upgrades from every Q4 release, with old-version data: the backup is created and verified, the migration is applied, families are identical |
| D-T7 | Each verification failure (corrupted byte, missing project file, count mismatch) blocks the migration, and **E4 export and the folder copy both work from that state** |
| D-T8 | Retention with 15 backups, including failed ones: exactly 10 verified pre-migration backups and at least 3 dated project backups remain |
| D-T9 | Restore round trip: identical checksums; the previous folder untouched; the pointer switches only after confirmation |

### S3: 1.0.54 relationship integrity

| Test | Proves |
|---|---|
| **I-T1 (RED)** | **Parent-gender change, then another edit, then undo: 1.0.51 refuses every undo and the project file won't open (red); 1.0.54 asks first, records the choice, undo works and the file opens** |
| **I-T2 (RED)** | **Add-a-parent loop through the API: accepted on 1.0.51 (red); refused on 1.0.54, in the demo and the database** |
| I-T3 | 10,000 random edits on both versions: the validator never reports a new problem |
| I-T4 | Correction workflow: no child moves without a recorded choice; every choice creates a `ChangeRecord` with the original relationship; nothing is written into person notes (checked) |
| I-T5 | Loop resolution: each link can be chosen; the consequence text matches the result; cancel changes nothing |
| I-T6 | Databases damaged by 1.0.51 itself (Q3): the upgrade starts, the health check lists the problems, **nothing is repaired automatically** |
| I-T7 | Damaged project files open only through explicit repair choices; the original file's hash is unchanged |
| I-T8 | Revert of a `ChangeRecord` restores the original relationship exactly |
| I-T9 | Project files with `changeRecords` still open in 1.0.53 (format 1) |

### S4: 1.0.55 GEDCOM identity

| Test | Proves |
|---|---|
| **G-T1 (RED)** | **Self round trip of both families' anonymised structures: 1.0.51 creates 189 people and 9 marriages for the first family (red); 1.0.55 creates 0 and 0** |
| **G-T2 (RED)** | **Co-parents without a marriage: 1.0.51 invents a marriage (red); 1.0.55 does not** |
| **G-T3 (RED)** | **Marriage end: 1.0.51 exports it as `DIV` (red); 1.0.55 exports it as an end event** |
| G-T4 | The investigation's §A5 cases: external files produce suggestions only; nothing is linked without confirmation |
| G-T5 | Namespaces, person and union ids survive project save and open, and GEDCOM out and in; GEDCOM pointers are never stored |
| G-T6 | Backfill on upgrades from every Q4 release |

### S5: 1.0.56

Each of H9, H10, H11 and H12 has a **(RED)** test.

### S6: 1.0.57

| Test | Proves |
|---|---|
| C-T1 | Every problem code has an explanation in both languages and a fixture |
| C-T2 | Tier 1 works with the database folder unreadable (in a test profile) |
| C-T3 | No action in the Centre changes data without confirmation |

---

## 8. Release rollback (R7)

### 8.1 Feed rollback: what GitHub can undo

| Action | Effect | What it does **not** do |
|---|---|---|
| Delete or reject a **draft** | Nothing was ever offered | — |
| Re-mark the previous release as **latest**, and turn the bad one back into a draft or prerelease | Installed copies **that have not yet updated** stop being offered the bad version | **It does not roll back anyone who already updated.** electron-updater does not downgrade (`allowDowngrade` stays off, U11) |

### 8.2 Installation rollback: what a user's machine needs

**Normal remedy: a forward fix.** A new, higher version (for example 1.0.53 replacing a bad 1.0.52) is published through the same pipeline. Every updated copy then receives it.

**Manual reinstall** of the previous version, when the forward fix is not yet available:

- The NSIS installer can install an older version over a newer one.
- **This is allowed only where the release notes say the older version is compatible with the newer data.**
- Compatibility is proven per release by the "down and up again" tests: E1-T7, I-T9 and the S2/S4 checks below.

**Data rollback**, for releases that changed the schema:

- restore the pre-migration backup (D5) **before** reinstalling the older version;
- or rely on the older version tolerating the additive change, where tested.

**Per release:**

| Release | Feed rollback | Installation rollback | Data rollback |
|---|---|---|---|
| S1 1.0.52 | Re-mark 1.0.51 | Reinstall 1.0.51 is compatible (E1-T7), **but brings the deletion defect back**, and is unsafe after a repair (§2.4). Prefer a forward fix | None needed (no schema change) |
| S2 1.0.53 | Re-mark 1.0.52 | Reinstall 1.0.52 on the newer database is tested; the extra `SchemaMeta` table is ignored [H: proven by test] | Restore the pre-migration backup (D5) if needed |
| S3 1.0.54 | Re-mark 1.0.53 | Reinstall 1.0.53: `ChangeRecord` ignored [H]. Trees with a role/gender difference that you accepted (U1) **would again block undo and project-open on 1.0.53** | Restore the pre-migration backup |
| S4 1.0.55 | Re-mark 1.0.54 | `uid` columns ignored by 1.0.54 [H] | Restore the backup |
| S5, S6 | Re-mark the previous | Compatible (no schema change) | — |

**Communication:** every published release has a "how to go back" section with exactly these three levels.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Until 1.0.52 is installed, every start of ≤1.0.51 can still delete a database whose marker is missing | S1 first. Advise regular project-file saves (they are outside `database\`) |
| A user who rolls back to ≤1.0.51 regains the defect | Release notes and the recovery window warn; forward fixes only |
| Classifying a folder as "Incomplete" when it actually holds data | The "new empty database" offer appears only when the E1 tests prove no family data can exist, and the old folder is always kept |
| The Windows PostgreSQL package differs from the Linux one | Checked in Q2 before E1 depends on it |
| Installers for 1.0.32–1.0.51 may no longer be downloadable; 1.0.7–1.0.30 have no tags on GitHub | Q4 records what can be obtained. The support floor is the oldest *tested* release. Users below it get guided steps (E4 export, then import) |
| A new app on an old schema (when the migration is skipped) may not run | Tested in S2. If it cannot, the recovery window offers export or a reinstall instead |
| Relaxing the parent role/gender rule (U1) makes such trees unopenable in older versions | Documented in rollback; such trees occur only after your explicit confirmation |
| Cold copies take disk space (10 × an estimated 50–150 MB [H]) | Measured in S2; the size is shown in the Centre |
| Roaming-profile sync of a live database | U13 |
| External programs strip identifiers | Suggestion-only fallback; G5 documents it |

---

## 10. Unresolved decisions

| # | Decision | Recommendation |
|---|---|---|
| U1 | Confirm the reading of R2: a recorded parental **role** is kept independent of **gender**. A gender change **may keep** the relationships as recorded, and the validator treats a role/gender difference as a reviewable notice, not an error | Yes |
| U3 | S1 waits for the whole S0 pipeline, including the 448 layout-QA cases | Yes |
| U4 | Offer "repair on a copy" (E3) in S1 | Yes, only on a copy and only after confirmation |
| U5 | Deleting old or abandoned folders and backups: only after your confirmation in the Centre | Yes |
| U6 | External backup location: allow cloud folders; encrypt external backups by default | Allow, with the privacy warning; encryption on |
| U7 | Disk budget for 10 cold copies | Accept after measuring in S2 |
| U8 | Dated project backups | Daily on the first start of a day; keep 3 daily and 4 weekly |
| U9 | Opening a project file **beside** its original: keep namespace and ids (a second appearance of the same family), or offer "Open as an independent copy" with new ones | Ask each time; default to an independent copy if the namespace already exists |
| U10 | Scope: desktop only for S1–S6, or also a web/server deployment | Desktop only, unless one is in use |
| U11 | No downgrade through the updater | Confirm |
| U12 | Code signing | Before wider distribution |
| U13 | New installs keep the database in `%LOCALAPPDATA%`; existing ones are offered a verified copy there through the pointer | Yes; offered, never automatic |
| U14 | Ship I1–I2 (refusing the two bad changes, no schema change) already in S1 | Yes, if S1 stays small; otherwise S3 |
| U15 | Support floor for users below it (older than the oldest tested release): E4 export plus a guided reinstall | Yes |

**Still open from the strategy's §10** (needed for Track P only):

- daughter-family inclusion;
- the missing-father rule;
- spouse frames for co-parents with no marriage record;
- generation authority;
- the integration merge order;
- font licences;
- history clean-up.

---

## 11. Requirements before the next release (1.0.52) can be considered safe

All of these must be true, with evidence attached to the draft:

1. **S0 is in force:** checks before the draft; draft only; your approval gate; development-branch trigger removed; `main` protected.
2. **E1:** no code path deletes, overwrites, moves or renames an existing database folder or password file. Lint E1-T8 passes.
3. **E1-T1, E1-T2 and E1-T5** have recorded red proofs on 1.0.51 and pass on 1.0.52.
4. **E1-T3 to T7, E3-T1 and E4-T1** pass on Linux **and** Windows.
5. **Q4a historical matrix:** every obtainable release from 1.0.32 to 1.0.51 upgrades to 1.0.52 with data **created by that release**, with identical family checksums.
6. **Recovery path:** for every §2.2 class there is a working recovery window, and E4 export works from that state.
7. **Down and up again:** reinstalling 1.0.51 after an ordinary upgrade works (E1-T7). The release notes state the §2.4 and §8 limits.
8. **No schema change** in 1.0.52 (checked: the migrations folder is identical to 1.0.51's).
9. **Updater:** the local-feed update test from 1.0.51 passes before the draft; the live check after your approval passes before the release is declared complete.
10. **Your sign-off:** on a **copy** of the owner's own data folder, 1.0.52 starts, shows your families unchanged, and the recovery window works in a simulated damaged copy.
