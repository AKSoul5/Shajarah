# Shajarah (شجرة)

A family-tree poster generator and genealogy editor. Enter a family and
Shajarah grows it into an ornamental, botanical nasab poster (foundation,
trunk, canopy), printable from A3 to 1024A0, in Arabic or English. The
editor handles members, marriages, sources, media, GEDCOM and nasab
import, and how two people are related. It ships as a Windows desktop app.

The genealogy is the primary element. Every design decision serves the
reader's ability to find a name and trace who descends from whom.

`README.md` is the specification. Read the section for the area you are
touching before changing it: it records why things are the way they are,
usually with measurements. Some README sections lag the code; when they
disagree, the code and recent commits win, and the README is fixed in the
same change.

## Where things are

- Repository `AKSoul5/Shajarah`, branch `main`. The app is everything
  under `shajarah/`; the root holds a short README, this file, `.claude/`
  and `.github/workflows/`. Paths below are relative to `shajarah/`.
- Any push to `main` that touches `shajarah/**` runs the full release
  pipeline. Keep docs about working on the project (this file, agents,
  design briefs) at the repository root, outside `shajarah/`.
- Stack: Next.js 14 (App Router, TypeScript), Tailwind, SVG rendering,
  d3-hierarchy / d3-zoom, Prisma 5 + PostgreSQL, jsPDF, Vitest.
- Desktop: `desktop/electron/` packages the app with its own embedded
  PostgreSQL 16 (families kept in `%APPDATA%\Shajarah`), a native menu bar
  and a self-updater fed by GitHub releases.

| Area | Files |
| --- | --- |
| Layout engine (pure, deterministic) | `src/lib/layout/botanical.ts` (core), `clarity.ts`, `branches.ts`, `shape.ts`, `geometry.ts`, `soil/` (foundation styles) |
| Poster rendering | `src/components/poster/TreePoster.tsx`, `ornaments.ts`, `PosterViewport.tsx`, `ExportMenu.tsx`; key in `src/lib/legend.ts` |
| Name-box designs | `docs/node-designs.md` (geometry contract), `/lab/nodes` page, `src/lib/samples/nodeLab.ts` |
| Designs and colour | `src/lib/theme.ts` (`THEME_PRESETS`, `PRESET_PALETTES`, `LINEAGE_COLORS`), `src/lib/layout/palette.ts` |
| Export | `src/lib/export/exportPoster.ts`, `src/lib/paper.ts` |
| Editor | `src/components/editor/` (`TreeWorkspace.tsx` and panels); layout runs in `layout.worker.ts` |
| Genealogy rules | `src/lib/genealogy.ts`, `relationship.ts`, `nasab.ts`, `gedcom.ts`, `merge.ts` |
| Data and API | `prisma/schema.prisma`, `src/lib/data/treeService.ts`, `src/app/api/`, `src/lib/validation.ts` (zod, shared by API and UI) |
| Undo, restore, imports | `src/lib/history.ts`, `restore.ts`, `imports.ts` |
| Test and QA families | `src/lib/samples/`, `src/lib/qa/` (fixtures A balanced, B complex, C stress, C-en English; cousin and complex fixtures) |

## Commands (run in `shajarah/`)

```bash
npm install          # also copies fonts and generates the Prisma client
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm test             # unit, layout, clarity and genealogy tests (~620; 13-18 min)
npm run qa:layout    # layout QA: 448 cases, 6-9 min; report in qa-report/index.html
npm run bench        # speed budgets, run alone
```

For a quick loop, run the test files you touched (`npx vitest run tests/<file>`)
and leave the full suite for before committing.

npm 11 skips dependencies' install scripts unless approved. Approve them
for `@embedded-postgres/*` and Prisma (`npm install-scripts approve <pkg>`,
also in `desktop/electron/`): without them the embedded PostgreSQL cannot
run `initdb`, so the start-up safety tests fail and a locally built
desktop app cannot create its database. CI uses Node 22's npm 10.

`qa:layout` and `bench` set variables the Unix way (`QA_LAYOUT=1 …`,
`BENCH=1 …`); in PowerShell set `$env:QA_LAYOUT=1` etc. and run the
commands from `tests/qa/README.md` instead. The QA report needs Playwright
with Chromium.

See real output without a database at `/demo?sample=<name>` (`small`,
`marriages`, `names`, `kalali`, `kalali-realistic`, `kalali-filled`,
`abdullah`, `natural350`, `sultan`, `hypo`, `huge`, `dense`, `multi`),
with `&poster=A1`, `&soil=<style>`, `&focus=<id or name>`,
`&shape=auto|leaf|circle|oval`, `&colors=1`. Name boxes of every design:
`/lab/nodes`.

## Rules that must not break

Genealogy (`treeService.ts`, tested):
- No loops: nobody becomes their own ancestor. This is the intent, but not
  yet enforced on every API path (defect C3, fixed in 1.0.54).
- Parents and spouses are in the same tree; no duplicate marriages.
- Today a father must be male and a mother female. This is current
  behaviour, not a principle: an approved change for 1.0.54 keeps a
  parent's role separate from their gender. Do not defend the old check.
- `generation` is recomputed in a transaction when parentage changes.
- Tiers are two pointers (`trunkStartId`, `crownBaseId`), never per-member flags.
- In a cousin marriage the children stay in their father's line; a spouse
  drawn twice is marked as such.
- Every mutation returns the full tree; every change honours `If-Match`
  (409 on conflict).

Poster:
- `clarity.ts` and the QA suite define a clean poster: every connection
  present and attached, no line under an unrelated name, **no line crossing
  another**, no lines running together, no false junctions, no overlapping
  names. Passing is necessary, not sufficient: renders are still inspected
  at print scale.
- Names never drop below the legible minimum. A family too large for a
  paper is offered the smallest paper that is actually readable.
- A change to layout or design is kept only if no family gets worse.
  `tests/qa/layout-baseline.json` fails the run on any new defect; update
  it (`QA_UPDATE=1`) only after reviewing the report, and say so in the commit.
- Each design takes every colour from its own palette (`PRESET_PALETTES`).
  Text at least 4.5:1 against what it sits on; rules, rims, branches and
  lineage colours at least 3:1 against the paper (`tests/palettes.test.ts`).
- Frames stay in the margin the layout keeps for them: no design moves a name.
- Selection, highlights and tooltips live in the `data-ui` layer; exports
  remove it. No export is ever saved blank.

Arabic and English:
- Names in Amiri; titles in Aref Ruqaa, or Noto Kufi Arabic for Platinum
  and Modern Archive. All bundled and embedded in exports.
- Arabic is never tilted; ovals and circles never rotate.
- No middle dots (·) in Arabic text: they read as the digit zero.
- Reading order follows the language (right to left in Arabic, left to
  right in English), including foundation columns and root order.
- Kinship wording follows the Arabic distinctions (عمّ / خال, لأبيه / لأمّه),
  formal and between two named people, nothing inferred.
- No emoji in the app; icons are drawn line icons.

## How to work here

1. **Understand before changing.** Never redesign, replace or remove a
   working feature without first stating what it does and why (README and
   `git log -- <file>`), what you propose, and what measurably improves.
   Ask before going ahead.
2. **Test first for behaviour.** Genealogy and layout rules get a test in
   `tests/`, one file per behaviour, named after it. Relationship and
   GEDCOM logic suit property-based tests (fast-check).
3. **Verify before saying it is done.** `typecheck`, `lint` and `npm test`
   pass; for layout or design work `qa:layout` passes against the baseline.
   Then open the change in `/demo` and look at it: screenshots of the
   affected families at A1 and 2A0 at least, the editor at 1440 and 1024 px.
   "It compiles" is not done.
4. **Design review for visual work.** Use the `design-director` agent before
   building a new screen, poster feature or design (a brief) and after (a
   critique of real renders). Fix what it finds or say why not.
5. **Keep the README true** for anything user-visible, in its plain style,
   with the measurements that justify it.
6. **Experiments stay out of releases.** Work in progress goes on a branch
   (commits marked `WIP`); experiment switches never ship.

## Releases

- Each user-facing change bumps `desktop/electron/package.json` `version`
  (patch).
- `shajarah-windows-installer.yml` runs every check (typecheck, lint, tests
  with the start-up safety tests on real embedded PostgreSQL, layout QA,
  migrations over the previous release's schema, installer smoke test,
  upgrades from every earlier release whose installer is still on GitHub,
  1.0.32 onwards) and only then creates a **draft**
  release. A person publishes it on GitHub; `shajarah-release-verify.yml`
  then updates the previous release through the live feed and withdraws the
  new one if that fails.
- Never publish a release, delete one, or change these workflows' safety
  checks without being asked.
- The family database is never deleted or recreated at start-up.

## Privacy

Real families are private. Never read, copy, commit or send anywhere a
user's own data: the database in `%APPDATA%\Shajarah`, `.shajarah` project
files, or `.ged` files outside the repo. Test, sample and example families
use invented, neutral names (the Al-Kalali chain in `samples/kalali.ts` is
the one published lineage). Use them for tests, screenshots and anything
sent to an external service (Figma, Canva, SonarQube, the web). `.env` is
never committed.

## Commits

Match the existing history:
- Subject: what changed for the user, in plain words ("A centred son keeps
  his place among his brothers"), not code terms. Releases:
  "Shajarah 1.0.x: <the main changes>".
- Body: short bullets, each a user-visible change and how it was found or
  measured; then the test file; then `Desktop <version>.` when bumped.
