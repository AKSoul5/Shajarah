# Generation numbering: proposed model (revision 2)

Status: proposal, awaiting approval. Nothing here is implemented yet.

Revision 2 adds:
- how the reference person is chosen;
- an exact algorithm;
- maternal trees;
- adoptive, step and foster links;
- unknown parents;
- people related by more than one path;
- large trees.

## 1. Principles

1. A generation number says how many parent–child steps a person stands
   from the family's reference generation. It is the same for everyone
   at the same depth, whichever branch they are on.
2. Each person has **one** number, the same wherever they appear (editor,
   profile, poster, branch poster, every chart, every export).
3. Only blood (birth) links count. Marriages never add a generation.
   Adoptive, step and foster links are shown, but they never place
   someone in the line (§5).
4. When a number would be ambiguous or misleading, the person gets no
   number and the reason is shown. A wrong number is never shown.

## 2. The reference person (Generation 1)

- **Who it is.**
  - The tree has one reference person.
  - **Proposed default:** the person the poster's canopy starts from, when
    the tree has one set. That is the family's founder as the family
    presents it. Otherwise, the tree's root.
  - **Why:** a recorded lineage above the family would otherwise push
    today's family to very high numbers. In the real tree checked, counting
    from the oldest recorded ancestor puts the canopy's founder at
    Generation 82.
- **Changing it.**
  - It is stored with the tree and changed only explicitly. Adding a father
    above the oldest ancestor ("grow upward") does not move it.
  - When it is changed, every number changes together, and the editor says
    so before applying it.
- **Different roots.**
  - A tree may record several unrelated families: a wife's own parents and
    grandparents, say, or a second lineage.
  - Their people are numbered only if they are blood relatives of the
    reference person (§3). Otherwise they show as "not related by blood to
    Generation 1", with the family they belong to.

## 3. The algorithm

The input is people and their birth parents (`fatherId`, `motherId`, either
possibly unknown). The output is, for each person, one of:
- a level (an integer);
- *spouse only*;
- *not related by blood*;
- *ambiguous*, with the paths found.

1. **The traced parent.**
   - In a paternal tree it is the father; in a maternal tree, the mother.
     This is the tree's existing lineage setting.
   - It is the parent the poster draws a child from, so the numbers always
     match the drawing.
2. **Anchor.**
   - From the reference person, follow traced parents upward as far as they
     are recorded. That gives the line's oldest person, A.
   - Level(A) = 1 − (steps from A down to the reference person).
3. **Descent.**
   - Visit A's descendants breadth-first, eldest first.
   - A child whose traced parent has a level gets that level + 1.
   - Otherwise, a child whose other parent has a level gets that level + 1.
     This is how a daughter's children, whose father is from another family
     or unknown, follow their mother.
4. **Ascent, for the other side of the family.**
   - Some untraced ancestors of an already-numbered person are still
     unnumbered: the reference person's mother's parents, for instance.
   - Each such parent gets their child's level − 1.
   - Their own descendants are then numbered by step 3, and the process
     repeats until nothing changes.
   - This places the mother's side, and the cousins through it, at the
     right levels.
5. **People reached two ways.**
   - Someone can be reached by two paths, as in a marriage between relatives
     of different generations.
   - The number from the traced parent wins. The other path is kept and
     shown on the profile: "Generation 5 through his father; 6 through his
     mother".
   - A person whose traced parent is unnumbered while both other routes
     disagree is marked *ambiguous*. They get no number, and the profile
     lists both paths.
6. **Spouses.**
   - A person with no blood link who is married to a numbered person is
     *spouse only*: "wife of a Generation 4 member".
   - Their own recorded parents are numbered only through blood links, as
     everyone else is.
7. **Everyone else** is *not related by blood*.

The cost is one pass over people and parent links (linear). Most people get
their number in step 3; step 4 adds the other sides. It runs in well under a
second for 10,000 people; a test measures it.

## 4. The cases asked about

| Case | Result |
| --- | --- |
| Different family roots | The reference person sets Generation 1. Unrelated families in the same tree are labelled, not numbered. |
| Paternal and maternal lineages | The tree's lineage chooses the traced parent (step 1). The other parent is used when the traced one is not related (step 3). |
| Multiple marriages | One father with several wives: all his children are one below him, whichever wife bore them. A woman married into the family twice is *spouse only* both times. Marriages never change a number. |
| Half-siblings | They share a parent, so the same number, whether they share the father (paternal half-siblings) or only the mother (maternal half-siblings, numbered through her). |
| Adoptive and step-parents | Not counted: see §5. |
| Unknown parents | A child with an unknown father and a known mother is numbered through her. A person with no recorded parents is numbered only if a numbered person is recorded as their child (step 4); otherwise *not related by blood* (or *spouse only*). Nobody is given a parent's level by guessing. |
| Large trees, many branches | One linear pass; every branch numbered from the same reference; tested on 10,000 people. |
| Several relationships at once | One number by the traced-parent rule; the other path shown; *ambiguous* (no number) only where no rule decides. |
| The same person drawn twice (a daughter married to a cousin) | One number, wherever she is drawn. |

## 5. Adoptive, step and foster links

These need the typed relationships in the schema proposal. Until then
they simply do not exist in the data.

- **Step-parent.** A spouse of one's parent. It is shown as a relationship
  ("step-son of …") and never counted: the child is numbered through
  their birth parents.
- **Adoptive parent, foster parent, guardian (kafala).**
  - Shown on the profile and charts with its own label and line style.
    A child taken into a family does not take its lineage, and the
    numbering follows that.
  - An adopted child whose birth parents are recorded in the tree is
    numbered through them.
  - Otherwise the child shows as "raised in Generation 5 (adoptive)", with
    no generation number of their own.
  - If you prefer adopted children to be numbered within the family, that
    can be a per-tree option. It is off by default.

## 6. How numbers appear

- **Generations 1 and below:** "Generation 4" / "الجيل الرابع".
- **Above Generation 1** (the reference person's ancestors, and uncles at
  their level):
  - Shown as "3 generations before Generation 1" / "قبل الجيل الأول بثلاثة
    أجيال".
  - Never shown as 0 or a negative number.
- **Poster:**
  - The generation key numbers only Generations 1 and below. Ancestors are
    one entry.
  - Branch posters keep the family's numbers.
- **"N generations" counts:** only Generations 1 and below.

## 7. What changes for existing data

- **Daughters' children with no recorded father.** Today they are stored as
  generation 0: 11 people in the real tree checked. They will follow their
  mother.
- **Spouses who married in.** Today they are stored as generation 0. They
  will be *spouse only*.
- **Stored values.** The `generation` column stays, recomputed by the new
  rule (it is derived data). No other record changes.

## 8. Tests

Each case in §4 gets its own test, on small, hand-built families. On top
of those:
- **Daughters' families:** an outside father, an unknown father, and her
  grandchildren.
- **Multiple marriages:** one father and three wives; a widow remarried
  within the family; a wife married to two brothers in turn.
- **Siblings:** full siblings, paternal half-siblings and maternal
  half-siblings.
- **Cousins:** through brothers, through a brother and a sister, through two
  sisters, and second cousins.
- **People reached two ways:** cousins marrying across generations, and
  the *ambiguous* case.
- **Unknown parents:** at every position.
- **Maternal trees:** a matrilineal tree.
- **Stability:**
  - Growing the tree upward changes no number.
  - Changing the reference person shifts every number by the same amount.
  - Branch posters show the family's numbers.
- **Scale:** 10,000 people under a time limit, and a family with 60 recorded
  generations above the reference person.
