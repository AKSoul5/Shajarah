# Generation numbering — proposed model

Status: proposal, awaiting approval. Nothing here is implemented yet.

## The reference person

- One person is **Generation 1**: the tree's *reference person*.
- By default it is the tree's root (the oldest recorded person on the main
  line). The family can choose another person on the main line instead,
  typically the founder the poster's canopy starts from. When a long
  lineage is recorded above the family (dozens of generations), counting
  from the oldest ancestor makes today's family Generation 80 or more, so
  this choice matters.
- The choice is stored with the tree. Adding a father above the oldest
  ancestor ("grow upward") does **not** move it, so nobody's number changes
  silently. Changing it is an explicit setting.

## The rule

Each person who is related by blood to the reference person has one
*level*: their distance in generations from the reference person's
generation, counted along parent–child links.

1. The reference person is level 1.
2. A child is one level below the parent they are numbered through.
3. **Which parent:** if only one parent is related to the reference person,
   that parent. This is how a daughter's children (whose father is from
   another family, or not recorded) follow their mother. If both parents
   are related, the parent the tree is traced through (the father in a
   paternal tree, the mother in a maternal one). That is also the parent
   the poster draws the child from, so the number always matches the
   drawing.
4. If the two parents would give different numbers (a marriage between
   relatives of different generations), rule 3 decides. The person's page
   says so ("Generation 5 through his father; 6 through his mother"). The
   two numbers are never averaged.
5. A parent is one level above their child. This places the reference
   person's ancestors, and from them the collateral relatives.

A person has **one number wherever they appear**: in the editor, on the
poster, on a branch poster (which keeps the family's numbering instead of
starting again from the branch head), and in exports.

## Who gets which number

| Person | Number |
| --- | --- |
| Descendants of the reference person | 2, 3, 4… by rules 2–3 |
| Children through a daughter (any depth) | from their mother (rule 3), so a daughter's son is the same generation as his cousins through her brothers |
| Brothers and sisters, full or half | the same number as each other: they share at least one numbered parent |
| Cousins (any degree) | from their own parent; first cousins always share a number |
| Children of several marriages | from the parent they share with the family; every wife's children of one father are the same generation |
| Spouses who married in | **no number of their own.** They are not of the line, and they never add a generation. The editor shows them as "wife of a Generation 4 member" |
| Ancestors of the reference person (father, grandfather…) | **no generation number.** They are listed as ancestors, in order ("1 generation before", "2 generations before"), as the foundation already shows them. Never 0 or negative |
| Collateral relatives above Generation 1 (the reference person's uncles, great-uncles: side branches on the trunk) | their level by rule 5. Those at or above the reference person's parents' level are ancestral-level ("1 generation before Generation 1"); their descendants who reach level 1 or below get ordinary numbers (a cousin of the reference person is Generation 1, the cousin's son Generation 2) |
| People with no blood link and not a spouse | no number; the editor lists them as "not connected to the family" |

## Where the numbers appear

- The editor's member list and person page: "Generation 4". For a spouse:
  "wife of a Generation 4 member". For an ancestor: "Ancestor, 3
  generations before Generation 1".
- The poster's generation key (colour by generation): only Generations 1
  and below are numbered. Ancestors are one entry, "Ancestors".
- The member count: "N generations" counts numbered generations only.
- The Timeline Spine foundation's discs: ancestors show their order back
  from Generation 1, not a generation number.

## What changes from today

- Today a daughter's child with no recorded father is stored as generation
  0 (no father on the line, so no parent to count from). In the real tree
  checked, 11 people are affected. Under rule 3 they follow their mother.
- Today the poster and the editor count from different places: the poster
  starts the key at the canopy, the editor at the tree's root. Both will
  count from the reference person.
- Married-in spouses are stored as generation 0 today; they will have no
  number.

## Tests to be added

- Daughters' families: a daughter's child with an outside father, with an
  unrecorded father, and her grandchildren; all one below their mother.
- Multiple marriages: one father, two wives, children of each: all the
  same generation; a wife remarried into the family numbered by neither
  marriage.
- Siblings: full, paternal-half and maternal-half siblings share a number.
- Cousins: first cousins through brothers, through a brother and a sister,
  through two sisters: same number; second cousins likewise.
- Branches through different parents: a child of two related parents of
  different generations takes the traced parent's number, and the other
  number is reported.
- Ancestors and collateral relatives: no zero or negative numbers;
  uncles are ancestral-level; cousins of the reference person are
  Generation 1.
- Stability: adding a father above the oldest ancestor changes no number;
  a branch poster shows the family's numbers; the same person drawn twice
  (a daughter married to a cousin) shows one number.
- Spouses: married-in spouses have no number and do not shift their
  children's numbers.
