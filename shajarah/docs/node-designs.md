# Node designs: audit, geometry contract, designs

Branches:

- `spouse-legend`: spouse nodes and their key entry (Phase 6A).
- `node-designs`: builds on `spouse-legend`; adds the geometry contract, the
  new designs, the lab and the QA.

Neither is merged or released.

## 1. Audit of the original implementation

### Shapes

| Shape | How a person gets it | Sized in | Drawn in |
| --- | --- | --- | --- |
| `leaf` | `nodeShape: "leaf"` (or `auto` on a small canopy), people with no children only | `botanical.ts`, the node factory (blade length and width, rotated box) | `TreePoster.tsx` `PersonNode` |
| `pill` | Fallback: parents in leaf mode, and daughters with "daughters as gold capsules" | node factory | `PersonNode` (default branch) |
| `circle` | `nodeShape: "circle"`; a long name stretches it into a capsule of the same height | node factory | `PersonNode` |
| `oval` | `nodeShape: "oval"` (or `auto` on a large canopy) | node factory (`OVAL_PAD`, `OVAL_H`) | `PersonNode` |
| `medallion` | **By role**: a branch head (a child of the canopy's start with children of their own), and the canopy base | node factory | `Medallion` |

User-selectable: auto, leaf, circle and oval.

Assigned automatically:

- **Medallions**, by role. This is the one place where shape carries
  meaning: a branch head. It predates this work, is explained by the
  poster's structure, and is kept. Its size: `max(2.7 fs, name + 0.9 fs)`
  across; a long name on two lines (`PosterNode.labelLines`,
  `MEDALLION_LINE` apart) when the circle holding that block, corner to
  corner, is at least a tenth smaller.
- **Pills**, by mode.
- **"Daughters as gold capsules"**, by gender. This is an explicit
  ornament option the user turns on.

### Sizing and reservation

- Each node is a box `w × h` centred on `x, y`.
- Relaxation (`relax`) pushes boxes apart with a fixed 3-unit gap.
- The relationship check and the final overlap count use the same boxes.

### Connectors

- Lines run from the parent's centre (or the spouse's holder) to the
  child's centre.
- They are drawn *under* the names, so the name's opaque body hides the
  line's end.
- There are no explicit attachment points. The convention therefore
  requires bodies without deep notches.

### Decoration past the box

- The outline's stroke reaches half its width outside the box.
- Around every parent, a second gold ring sits **0.16 em outside the box
  plus its stroke**.
- **Neither was reserved.** Two parents side by side could have touching
  or overlapping rings while their boxes were clear. This shows on real
  posters, in every design, including the ovals (see the before/after
  crops).

### Existing safeguards

- `clarity.ts` validates relationships: a missing or misattached line, a
  line under an unrelated name, crossings (including sibling lines from
  where they leave the parent), lines running together, false junctions,
  trunk order.
- `layoutQa.ts` and `tests/qa` run 322 posters:
  - fixtures A (balanced), B (complex: multiple marriages, half-siblings,
    daughters married out, an unrecorded father) and C / C-en (stress:
    long Arabic and English names, nine uneven branches, seven generations
    deep);
  - × the four display modes × seven designs × papers (A3, A1, and 2A0 /
    4A0 for C), plus the foundation stage.
  - Each case must not exceed its recorded baseline.
- Names overlapping (by box), near misses under 0.6 mm, and legibility in
  millimetres.

This is the 84-case matrix discussed before (7 themes × 4 modes × 3
fixtures), here on two papers plus extras.

### Weaknesses found

1. Decoration past the box was neither reserved nor checked (above).
2. Shape knowledge was spread across three places, each with its own
   numbers: layout sizing, the renderer's outlines, and the QA's boxes.
3. The legend's spouse symbol was its own simplified drawing, not the
   poster's. It had no ornaments, and was not dashed for daughters'
   husbands.
4. The capsule spouse style differed from a capsule-shaped name only by
   colour.

## 2. The geometry contract (`src/lib/layout/nodeGeometry.ts`)

### One definition per design

Each design is defined once, as the points of its outline for a box
`w × h` at font size `fs`. That one definition is used:

- by the layout, to size the box (`designSize`);
- by the renderer, to draw the outline (`designPath`), the inner rim
  (the outline shrunk) and a parent's ring (the outline grown);
- by the QA, to measure the shape (`outlinePoints`).

The design's spec also says:

- the room beside the text (`padX`, plus `padH` for designs whose ends
  deepen as they grow taller);
- the box height for one line;
- where the name sits (`textDy`);
- for elliptical designs, an inset, so the box is sized for the text
  block's corners to fall inside the ellipse.

### Decoration

- `decorOutset(node)` is how far the drawing reaches past the box: the
  stroke, or a parent's ring.
- On a poster in one of the **new designs**, the layout stores it on
  every name (`pad`). Relaxation and the overlap count keep `w/2 + pad`
  clear, so **what is drawn is what is reserved**: no design can invent
  its own spacing.
- On the **original designs** (leaves, ovals, circles), names are laid
  out exactly as before, and two parents' rings can still touch on a
  dense poster.
  - Reserving their room was tried, at ring gaps from 0.06 to 0.16 of
    the type size, with and without extra clearance (0.04 to 0.1).
  - Every variant moved three borderline test posters: a dominant-branch
    family went to smaller branch names in two designs; the Calligraphic
    Column foundation, when shortened, went to a much smaller poster; and
    the Sultan family's recommended paper went from A0 to 2A0.
  - Extending it to the original shapes is left for decision.

### Checks

- `drawnOutline(node)` is the whole drawn extent on the page.
- `outlinesOverlap` is shape-accurate, so an oval's empty corners count
  for nothing.
- The QA reports `decor-overlap`: drawn shapes touching.

### Unchanged

- Line routing, the relationship check, connector meaning, medallions,
  leaves and spouse frames.

## 3. The designs

The **original four**, unchanged:

- Leaves.
- Ovals.
- Circular badges.
- Auto.

The **new seven**, all drawn from one outline:

| Design | Silhouette | Notes |
| --- | --- | --- |
| Soft rectangle (`rect`) | Editorial plaque, gently rounded corners | The plainest; reads well at small sizes |
| Classic cartouche (`cartouche`) | Plaque with quarter-circle corners cut in | Deliberately unlike the spouse's *manuscript* cartouche (pointed, convex ends), so a spouse stays distinct from a person |
| Octagonal seal (`octagon`) | Plaque with square-cut corners | |
| Heraldic shield (`shield`) | Flat chief, straight sides, a point below | The name sits a little high. The point keeps one height, so a second line lengthens the sides rather than running into the point |
| Hexagon (`hexagon`) | Pointed at both ends | The points deepen with height, so the box widens with it |
| Cameo (`cameo`) | Tall oval with an inner frame of fine beads | |
| Scalloped medallion (`scallop`) | Oval with a ring of shallow scallops | Valleys are shallow, so no line shows through |

### From the brief's list of twelve

| Candidate | Outcome |
| --- | --- |
| Botanical leaf | Already exists (`leaf`) |
| Classic cartouche | Done, as the notched cartouche |
| Arch-shaped plaque | Not done: too close to the shield and the rectangle at poster sizes; a later candidate |
| Elongated capsule | Already exists as the capsule (`circle` with long names, and `pill`) |
| Lozenge | Not done: its corners leave little room for a long name, and its side points read as connector arrows |
| Quatrefoil | Not done: deep lobes, so lines would show through the notches |

**Your preferred initial eight** are all present: oval, soft rectangle,
cartouche, octagonal seal, shield, hexagon, cameo, scalloped medallion.

### Genealogical meaning

- A node design is decoration only. Every person on a poster gets the
  chosen design, whatever their gender, branch, descendants or place.
  A test checks this.
- The exceptions are the existing structural ones, which are kept:
  - medallions for branch heads and the canopy base;
  - spouse frames;
  - the "has descendants" ring, explained in the key;
  - leaves, which are for people without children (as before);
  - gold capsules for daughters, an ornament the user switches on.

## 4. Theme compatibility (suggestions only)

| Poster design | Suggested node designs |
| --- | --- |
| Refined Heritage | soft rectangle, cameo, oval, cartouche |
| Imperial Gold | shield, octagonal seal, scalloped medallion, cameo |
| Ancestral Manuscript | cartouche, oval, cameo |
| Platinum | soft rectangle, hexagon, octagonal seal, circular badges |
| Botanical Classic | leaves, oval, scalloped medallion |
| Emerald Dynasty | cartouche, octagonal seal, shield, oval |
| Modern Archive | soft rectangle, hexagon, octagonal seal, oval |

- Each poster design keeps its own default node design, so existing
  posters do not change their look.
- Colours, rims and finishes come from the poster design's existing
  tokens. There is no per-theme geometry.

## 5. The Node Design Lab (`/lab/nodes`)

- Shows every node design within a chosen poster design, in Arabic or
  English, with or without a second line (years).
- Each name is lifted from a poster laid out and drawn by the production
  layout engine and renderer: ordinary and long names, with descendants
  and without.
- The poster design's own and suggested designs are marked.
- The Style menu links to it ("compare").

## 6. Tests and QA

### `tests/node-designs.test.ts`

Each design is checked for:

- an outline inside its box;
- the name and a second line inside the outline, for short and long,
  Arabic and English names;
- a parent's ring within the reserved outset;
- the same design for every person (decoration only);
- on the complex family with everything shown: no defect, no touching
  shapes, and the spouse frame intact;
- drawing without error in each poster design that suggests it.

It also checks shape-accurate overlap.

### `tests/spouse-nodes.test.ts` (Phase 6A)

- A spouse comes only from a recorded marriage or shared children.
- All three wives are drawn as the husband's.
- No person is drawn as a spouse.
- A cousin who is also a wife is drawn as each, in each place.
- The key's spouse frame equals the poster's across:
  - 7 designs × 3 spouse styles, and
  - 4 node shapes in one design.
- The key's spouse entry is dashed for daughters' husbands, absent when
  no spouse is drawn, and follows the display mode and style.
- Arabic and English wording follows the genders drawn.
- In black ink, each style keeps a cue that is not colour.

### `tests/qa/layout-qa-designs.test.ts`

Each new design is drawn:

- on fixtures A, B and C × the four modes (Botanical Classic, A2); and
- on fixture B with everything shown, in all seven poster designs.

That is 133 cases, each required to have **zero** defects and zero
touching shapes.

### Existing posters

- The 322 cases are re-run against their baselines, because reserving
  the ring changes every layout slightly.

Results are in `docs/PROGRESS.md`.
