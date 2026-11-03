# Milestone 1: generation numbering and the family engine

Status: plan, awaiting approval of the generation model
(`docs/generation-numbering.md`).

Milestone 1 is the foundation for profiles, search, completeness,
analytics and every chart. It needs **no database change**. It works on
the data as it is today; the schema additions come in a later milestone.

## 1a. Generation numbering (branch `generation-numbering`)

| Step | Work | Files |
| --- | --- | --- |
| 1 | The algorithm of the model, as a pure function: levels, *spouse only*, *not related*, *ambiguous*, the alternative path | `src/lib/family/generations.ts` (new) |
| 2 | The reference person, stored in tree settings (`referenceId`), with the default of the model (canopy base, else root). Grow-upward leaves it alone | `src/lib/types.ts`, `validation.ts`, `treeService.ts` |
| 3 | The stored `generation` column recomputed with the new rule (`computeGenerations` becomes a thin wrapper); everything reading it keeps working | `genealogy.ts` |
| 4 | Display: "Generation n" / "n generations before Generation 1" / "wife of a Generation n member"; the member list, person panel and member count | `src/lib/family/labels.ts` (new), `TreeWorkspace.tsx` |
| 5 | Poster key and footer counts from the same numbers. Poster geometry untouched; the 322-poster QA must stay identical except the key's labels | `botanical.ts` (stats only), `TreePoster.tsx` (key only) |
| 6 | Tests for every case of the model's §8 | `tests/generations-model.test.ts` (new) |

**Done when:**
- every test passes, including the existing generation tests (updated only
  where the model deliberately differs);
- the layout QA is unchanged in geometry;
- your real tree shows its 11 daughters' children at the right generation
  (checked read-only).

## 1b. Family engine (branch `family-engine`, from 1a)

A pure module over the existing `TreeDTO`. It reuses the existing helpers
(`relationship.ts`, `genealogy.ts`, `merge.ts`) instead of copying them.

| Part | Gives |
| --- | --- |
| Index | children by parent; spouses (with marriage years); full, paternal-half and maternal-half siblings; derived step-relations (spouse of a parent); built once per tree version |
| Kin | parents, grandparents, grandchildren, siblings, cousins (by degree), uncles/aunts, nephews/nieces, each with how they are related (reusing the relationship engine for the wording) |
| Lineage | the ancestral line (traced parent), the nasab, the path to the reference person |
| Branches | which main branch someone belongs to: the reference person's child they descend from. A daughter's family belongs to her branch. A person descended from two branches is listed in both, with the primary one through the traced parent |
| Counts | descendants (by blood, distinct people, no double counting through cousin marriages), generations below, living/deceased where recorded |
| Completeness | per person, per field: recorded / missing / not applicable (no death date for someone living). Potential issues, labelled as such: death before birth, a parent younger than 12 at a child's birth, a child born after a parent's death (by more than a year for fathers), a recorded marriage year before a spouse's birth. Potential duplicates: same normalised name and same parents, or the same name, same father and birth years within 2. Nothing is changed automatically |
| Filters | combinable predicates (gender, status, generation range, branch, birth/death year range, incomplete fields) over the index, for search and analytics |

**Speed:** the index for 10,000 people builds in under 200 ms, and a filtered
search over them returns in under 50 ms. Both are measured in the tests.

**Tests:**
- profile accuracy (every kin list on hand-built families);
- branches (including daughters' families and two-branch descendants);
- descendant counts (no double counting);
- completeness and issue rules (each rule, and its false-positive guard);
- duplicate detection;
- filters, individually and combined;
- the speed figures;
- agreement with the relationship engine on the 243-person family.

## Then (milestone 2, separate branches, after review)

1. Person profile drawer, built on 1b.
2. Search with filters.
3. Records completeness.

Each comes with its own design for review before the interface is built.
