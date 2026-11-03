# Shajarah as a genealogy platform: audit and plan

Status: proposal for review. Nothing in this document is implemented yet.

## 1. What exists today (audited)

| Area | State | Where |
| --- | --- | --- |
| Data model | One `Member` per person: `name`, `laqab` (honorific / alias), `gender` (M/F/unknown), `birthYear`, `deathYear` (years only), `isDeceased`, `birthOrder`, `generation` (stored, derived), `notes`, `fatherId`, `motherId`. `Marriage` (two spouses, start/end year). `Source`, `Citation` (person ↔ source, event type, page), `Media` (person or source). Tree: lineage (paternal/maternal), root, canopy base, trunk start, poster `settings` (JSON). | `prisma/schema.prisma`, `src/lib/types.ts` |
| Relationships | Biological father and mother only (one each, either may be unknown). Any number of marriages per person. Full/half siblings are derived. No adoptive or step links. | `genealogy.ts`, `relationship.ts` |
| Relationship engine | Complete: blood and in-law relationships in Arabic and English, cousin degrees, half-siblings, co-wives, the path between two people. Checked on all 58,806 pairs of a 243-person family. | `src/lib/relationship.ts` |
| Person panel | Selecting a name (poster or list) opens a side panel: edit form, quick add of parents, children and spouses, merge of duplicates, sources, media, the relationship explorer, poster actions (trace line, branch poster, show a daughter's family, hide). It is an editing panel, not a profile. | `TreeWorkspace.tsx`, `MemberForm.tsx`, `RelationsPanel.tsx`, `MemberAttachments.tsx` |
| Tree navigation | One view: the poster (zoom, pan, find a name, trace a lineage, right-click menu, branch posters). No pedigree, descendant or other chart. | `PosterViewport.tsx`, `TreePoster.tsx` |
| Search | Member list search: name with nasab (3 generations) and laqab, Arabic letters normalised, partial match. Poster search (Ctrl+F) rings every match. No filters. | `TreeWorkspace.tsx` |
| Statistics | Poster footer: total, men, women, generations spanned. No analytics view. | `botanical.ts` (stats), `TreePoster.tsx` |
| Data quality | Duplicate spouses (merge), people not drawn on the poster and why, relationship-clarity checks on the drawing. No record-completeness view. | `merge.ts`, `notDrawn.ts`, `clarity.ts` |
| GEDCOM | Import with preview (off the main thread) and undo; export. Names, sex, birth/death years, parents, marriages, notes, sources, citations, media. Places, full dates and occupations are kept, but only as text in the notes ("Born: 3 MAR 1901, Mecca"). | `gedcom.ts`, `GedcomPanel.tsx` |
| Persistence | PostgreSQL via Prisma; every change in one transaction with an optimistic lock; full undo/redo history; `.shajarah` project files (versioned format). Desktop: embedded PostgreSQL. | `treeService.ts`, `history.ts`, `project.ts` |
| Poster studio | Seven designs, six foundation styles, A-series to 4A0 and custom paper, SVG / PDF / PNG (with DPI) / tiled PDF, relationship-clarity QA (322 posters). | `layout/`, `export/` |
| Desktop | Electron, native menu, narrow bridge, context isolation, embedded database, auto-update. | `desktop/electron` |
| Localisation | Posters are fully Arabic (RTL) or English (LTR), chosen from the names. The editor's interface is English only; Arabic names are entered and shown correctly (`dir="auto"`). No interface translation layer. | throughout |
| Charts | No charting library. All drawing is hand-written SVG with d3-hierarchy for tree structure. | `package.json` |
| Tests | 42 test files (about 475 tests) plus the 322-poster layout QA. | `tests/` |

## 2. Requested capabilities against the codebase

Legend: **exists** works today; **partial** some of it exists; **missing**; **needs data** cannot be done reliably without new fields.

| Capability | State | Note |
| --- | --- | --- |
| Profile: name, gender, living/deceased, notes | exists | in the edit form |
| Profile: English name beside the Arabic | needs data | one `name` field today |
| Profile: full dates, places, residence | needs data | years only; places sit inside notes |
| Profile: biography | partial | `notes` is used for everything; no separate biography |
| Profile: parents, spouses, children | exists | in the edit panel, as editing controls |
| Profile: siblings, grandparents, grandchildren | partial | derivable; not shown |
| Profile: relationship to the reference person | exists | the relationship explorer, any two people |
| Profile: generation number | partial | stored, but wrong for 11 people in the real tree (see generation-numbering.md) |
| Profile: descendant count, branch, lineage | partial | computed by the poster layout; not shown |
| Profile navigation and back | missing | selecting someone replaces the panel; no history |
| Search: Arabic, partial, nasab, aliases (laqab) | exists | |
| Search: English names | needs data | |
| Filters (gender, status, generation, branch, years, incomplete) | missing | all derivable from current data except country |
| Filter by country | needs data | |
| Data completeness, duplicates, conflicts | partial | duplicate spouses only |
| Analytics dashboard | missing | footer counts only |
| Geographic distribution | needs data | no places at all as data |
| Personalisation: poster themes, daughters, spouses | exists | per tree, in `settings` |
| Personalisation: interface dark mode, language | missing | |
| Descendant chart (the poster) | exists | the signature trunk-and-canopy |
| Other chart formats (pedigree, fan, hourglass, bowtie, radial, timeline, group sheet, Ahnentafel, register, map, network, genogram) | missing | |
| Adoptive / step relationships | needs data | |
| Events (beyond birth/death/marriage) | needs data | citations already name event types |

## 3. Data-model changes needed (for approval before any is applied)

All are **additive**: new nullable columns or new tables. No column is removed, renamed or retyped; existing records, project files and GEDCOM files keep working. Each ships as a Prisma migration, which the desktop program applies itself at start.

1. **English name.** `Member.nameEn String?`. The existing `name` stays the primary name in whatever script it was entered. Search, profiles and English posters use `nameEn` when present.
2. **Dates with precision.** For birth, death and marriage: `birthDate String?`, `deathDate String?` storing a partial ISO date (`1901`, `1901-03`, `1901-03-04`), plus a qualifier `birthDateQual` / `deathDateQual` (exact / about / before / after / estimated). The existing year columns are kept and filled from the date, so every current calculation and older project file is unaffected.
3. **Places.** `birthPlace`, `deathPlace`, `residence` (free text), and `residenceCountry` (ISO 3166 code, optional) for the map and the country filter. No coordinates and no addresses: a country, and a place name as the family writes it.
4. **Biography.** `Member.biography String?`, separate from working `notes`.
5. **Relationship types.** `fatherRel` and `motherRel` enums (biological, adoptive, step, foster, unknown), defaulting to biological, beside the existing `fatherId` / `motherId`. This keeps every query that reads `fatherId` working. One biological and one adoptive parent of the same role at once would need a separate parent-link table; I recommend not doing that now (rare, and a much larger change).
6. **Events (later phase).** An `Event` table (type, date, qualifier, place, notes, person, optional marriage), for timelines and family registers; citations can then point at an event.

Compatibility work for each:
- **Project files.** The format version goes up. Older files open unchanged (new fields empty). A newer file opened by an older program loses only the new fields, so the save warns about that.
- **GEDCOM import.** Fills the new fields from BIRT/DEAT/MARR DATE and PLAC, RESI, the NAME variants (ROMN / TRAN) and ADOP/PEDI. What it can't map still goes into notes, as today: nothing is discarded.
- **GEDCOM export.** Writes them back to the same tags.
- **Undo, restore and merge.** Each copies the new fields.
- **Existing data.** No backfill is guessed. Places and dates currently inside notes stay in notes. An optional, previewed "read dates and places from notes" step can come later, and it never runs on its own.

## 4. Generation numbering

Profiles, search filters, analytics and every chart need generation numbers that are right. The model in `docs/generation-numbering.md` (branch `generation-numbering`) is waiting for your approval. It fixes the 11 people now counted as generation 0. It is the first dependency of everything below.

## 5. Architecture

- **One genealogy engine.** A pure `src/lib/family/` module over `TreeDTO`: indexes (children, spouses, siblings), generation levels, branches, descendant counts, completeness checks, filters, statistics. Today's helpers (`genealogy.ts`, `relationship.ts`, `merge.ts`) are reused, not copied. Every view, chart and report reads from it; none keeps its own copy of the family.
- **Views, not new databases.** Each chart format is a renderer taking (engine, start person, options) to a layout (SVG), or to a document (report). The poster engine stays as it is: it becomes "Descendant tree: Shajarah poster", one format among them.
- **Navigation.** The editor gains a top-level switch: Tree (the poster, the default), People (search with filters, then a profile), Records (completeness), Analytics, Charts. The person profile opens as a drawer over any of them. Selection is shared, so a person chosen anywhere is the person in every view.
- **Interface language.** A small dictionary-based translation layer (no new dependency) for the editor, Arabic and English, with RTL layout for Arabic. Introduced with the profile and search work, not as a big-bang rewrite.
- **Charts in analytics.** Hand-drawn SVG in the poster's typography, as the posters are. No charting library is added.
- **Preferences.** Per-tree preferences stay in `FamilyTree.settings`. Per-user interface preferences (language, dark mode) go in browser storage, or in the desktop program's own settings file. This one small store is all that is needed, since there are no user accounts.

## 6. Order of work

Each step lands on its own branch, with tests, and waits for your review. Nothing is merged or released without your approval.

| Step | Contents | Needs |
| --- | --- | --- |
| 0 | Generation numbering (approved model) | your approval of the model |
| 1 | Family engine: indexes, branches, descendant counts, generation levels, completeness and duplicate checks. Tests on the QA families and edge cases (unknown parents, several marriages, daughters' families, half-siblings) | step 0 |
| 2 | Person profile drawer with what the current data supports: identity, family (parents, spouses by marriage, children by mother, siblings full/half, grandparents, grandchildren), genealogy (generation, branch, lineage, descendants, relationship to the reference person), sources, media; navigation with back/forward; the person ringed and centred on the poster. The edit form moves into the profile's Edit tab | step 1 |
| 3 | People search with combined filters (gender, living/deceased, generation, branch, birth/death year range, incomplete record), fast on 10,000 people; a result opens the profile and shows the person on the poster | step 1 |
| 4 | Records completeness: missing information, potential inconsistencies (death before birth, parent younger than child, parents of impossible ages), potential duplicates (similar name, same parents), each labelled as missing / possible issue / confirmed problem, with branch completeness. Never edits anything itself | step 1 |
| 5 | Data-model additions 1–5 (after your approval), with GEDCOM, project-file, undo and merge support; then the profile, search and completeness use them | your approval of §3 |
| 6 | Analytics dashboard (overview, generations, branches, names, timelines where dates are recorded, marriages), reusing the engine | steps 1, 5 |
| 7 | Charts I: pedigree (ancestor) chart, a compact descendant chart (beside the poster), Ahnentafel report (standard numbering), family group sheet | step 1 |
| 8 | Charts II: fan, hourglass, bowtie | step 7 |
| 9 | Interface language (Arabic/English) and dark mode | steps 2–4 |
| 10 | Charts III: timeline, radial tree, map by country | steps 5, 6 |
| 11 | Charts IV: relationship network, family register (book), genogram (opt-in, private by default) | step 6 (events) |

Each chart is offered in the interface only once it works end to end: interactive, exported to PDF/SVG/PNG, Arabic and English, tested on large families.

## 7. What I will not do without your approval

Apply any data-model change; change the poster engine's output (every poster change runs the 322-poster QA); merge, release or touch production data.
