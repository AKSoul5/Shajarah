# Complex families, cousin marriages and parentage: audit and changes

Branches:

- `cousin-marriages`: the poster side.
- `cousin-editing`: the editor side.
- `integration`: both together.

None is merged or released.

## 1. Audit: the data model already holds the family network

| Need | In Shajarah today |
| --- | --- |
| One canonical person | Yes: each `Member` is one record with a stable id. A marriage and a child's parents point at ids, never copies. |
| Unlimited marriages per person, successive or concurrent | Yes: `Marriage` is its own record (two spouse ids, start and end year). Any number per person. |
| Children linked to their actual parents, independently of marriages | Yes: `fatherId` and `motherId` on the child. A marriage never makes anyone a parent. |
| Half-siblings vs full siblings | Yes, from the recorded parents. The relationship engine names them (أخ لأم، أخ لأب، شقيق). |
| Unknown parent | Yes: an empty `fatherId` or `motherId`. Nothing is inferred. |
| Twins and triplets | Yes: the same birth year, each with their own birth order. |
| Marriage status (divorced, widowed) | Partly: the end year is recorded; the reason is not. *Needs the database additions.* |
| Notes and sources on a marriage | No. *Needs the database additions* (`Citation.eventId`, a marriage `Event`). |
| Adoptive, step, legal, guardian; disputed parentage | No: only one father and one mother per child. *Needs the database additions* (`ParentLink`). |

The last three are in `docs/schema-proposal.md`, which is **awaiting your
approval**. No migration has been written.

## 2. A daughter married several times, her children's fathers left out

When a family's husbands were left out to keep a poster readable, the
data model never required it. The difficulty was the earlier layout:
before 1.0.46, lines from a daughter's dotted family could cross and
tangle.

On today's code, a daughter of the line with five husbands, and children
by each, lays out cleanly. The `five-marriages` fixture checks this:

- each husband stands in his own frame beside her, with exactly his
  children;
- no defects in any view;
- clean in all seven designs.

The costs are smaller names on a dense poster (more names share the
space) and a slower layout on large papers.

**The fathers can be recorded again.** A husband can also be hidden on
the poster without deleting anything (below).

## 3. Changes

### Cousin marriages (`cousin-marriages`)

- **Fixed:** the children of a cousin marriage were drawn as outsiders
  on their mother's dotted line when her family was shown. They now stay
  in their father's line.
- A spouse who is also drawn in their own branch is drawn beside their
  partner as a **marked reference**: the same person, a ring in the
  frame, and a key entry "يظهر أيضًا في فرعه / Also shown in their own
  branch".
- A cousin marriage with no children yet is shown once, from the
  husband's side.

### Which parent's branch (the selected branch decides)

| View | The children of a couple |
| --- | --- |
| The father's branch (branch poster) | Under him, with their mother beside him. |
| The mother's branch (branch poster, her family shown) | Under her, with their father beside her. |
| Both branches together (the whole tree) | Once, in the father's line. The mother is drawn in her own branch and marked beside him. |

- Switching branches never changes a record.
- **Fixed:** the father's branch lost the couple's children when the
  mother's family was shown through her. That is a setting of the whole
  tree, so it stays on when the branch changes.

### Hiding a marriage on the poster (`hiddenSpouses`)

- "Hide on poster / Show on poster" beside each spouse in a person's
  relations.
- The spouse's frame is left off. The children of that marriage stay,
  parting from an **open bead**. A **filled bead** means the other parent
  is not recorded.
- The key explains both, in Arabic and English.
- Nothing is deleted.

### Duplicates (`cousin-editing`)

- Typing a new spouse, parent or child who is already recorded offers the
  existing people, with their nasab, to link instead. Names alone never
  decide.
- Deleting a person who is still linked lists what is linked.
- Merging two records already keeps children, marriages, photos, sources
  and settings.

## 4. Fixtures and tests

### Cousin fixtures (`src/lib/qa/cousinFixtures.ts`)

- first cousins;
- second cousins;
- cousins with five children;
- a daughter who is a wife in her cousin's branch after an earlier
  marriage;
- three cousin marriages;
- double cousins (several ancestral paths);
- their child (related twice);
- a large family with eight marriages between branches.

### Complex fixtures (`src/lib/qa/complexFixtures.ts`)

- five marriages with children by each;
- wives without children;
- widowed and remarried;
- divorced and remarried;
- a blended family with step-children;
- twins and triplets;
- children with one parent or none recorded.

### Tests

`cousin-marriages.test.ts` (53) and `complex-families.test.ts` (27) check:

- the records: one record per person; links to existing people;
  parentage; marriage counts; half and full siblings; step-children
  never the step-parent's; shared ancestors and pedigree collapse;
  generations;
- the poster, in every view: every person drawn once; children drawn
  from the right parent and frame; spouse frames; marked references;
  hidden marriages and beads; key entries in Arabic and English; no
  defect in any view; clean in all seven designs;
- branch views: father's, mother's, both, and switching never changing a
  record.

## 5. Not done (awaiting the database additions)

- Adoptive, step, legal and guardian parents.
- Disputed parentage.
- Marriage status and reason.
- Notes and sources on a marriage.

The design is in `docs/schema-proposal.md` (`ParentLink`, `Event`,
`Citation.eventId`). It is additive and keeps every existing record.
