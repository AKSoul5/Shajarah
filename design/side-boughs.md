# Side families become boughs with their own small crowns

Design brief, 2026-11-17. Branch `poster/side-boughs`. Implementation by the
main agent; critique of real renders by the design director afterwards.

## 1. Purpose

A brother of a trunk ancestor and his descendants are part of the family,
not a footnote. Today they hang off the trunk as drooping fans, and their
names print smaller than the canopy's: on the owner's family (103 side
names) 3.51 mm smallest / 4.29 mm typical at 2A0 against 4.58 mm in the
canopy, and 3.20 / 3.22 against 3.44 mm at A0. The reader should see each
side family as a **bough of the same tree**: a limb leaving its ancestor's
badge and carrying a small crown of its own, with names printed at, or
very near, the canopy's size.

## 2. What exists and must be respected

- README "The three tiers", **Side branches** (lines 606–644) and
  `botanical.ts` "Offshoots: stubs …" / "Side branch: a small canopy"
  (about lines 2327–2569).
- **Spurs and ports stay exactly as they are** (commit 6dcbfa8, e40b4df):
  each limb leaves from under its own badge's rounded end, level, at the
  badge's height, no wider than 0.62 of a badge, turning only past the
  trunk's edge; two sons of one badge keep `portShift` order. The bough
  starts at today's `port.to`, with today's `stemDir` (level).
- **Never above the canopy base** (README 609–612): a fan that rose into the
  crown's lowest names tangled with the base's wife and daughters. The
  ceiling stays `origin.y + baseMedallionR + 1.5 f`.
- **Higher badge, higher slice** (`sideShare`, README 615–620): families
  from neighbouring badges once interleaved and crossed (93 problems on a
  340-person family). The order survives; only its shape changes.
- **Childless sons' medallions** (stubs) keep today's placement rules and
  their clearance of each other's lines (`tests/childless-sons-lines-clear-each-others-names.test.ts`).
- The trunk, its badges, flare, roots, foundation, generation bands and
  vertical margins are untouched. The trunk's drawing must be byte-for-byte
  the same SVG path as today.

## 3. The design

### What a bough is

1. **Where it leaves the trunk:** at today's port, level, today's width.
   Nothing on the bark changes.
2. **The limb:** one tapered ribbon (today's `shaded`, pipe-model width
   `widthOf(leaves)`), leaving level and easing in one smooth S (a single
   cubic, no kink, turning at most 35° from the horizontal) to its **crown
   base**: the bough head's medallion, placed out in the free room. Upper
   boughs may rise slightly, lower ones sink slightly, so that limbs that
   left the bark 1 badge apart spread to their terraces (below) without ever
   changing order. The limb runs *under* its own crown, never through
   another's.
3. **The crown:** a small fan **opening upward** round the bough head, like
   the main canopy in miniature, instead of today's fan opening outward and
   down from the trunk's edge. Its rings are centred on the bough head, not
   on the port. Shape: a shallow dome, **width : height between 2 : 1 and
   3 : 1** (Arabic names are wide; the room is a wide band), i.e. elliptical
   rings with vertical radius 0.4–0.5 of the horizontal. Sweep from about
   10° above the outward horizontal to about 10° above the inward
   horizontal, tilted 10–20° outward so the inward end stays clear of the
   trunk (`trunkClear`) and of the bough nested inside it.
4. **Its size:** a crown is sized by its names, never padded to look big.
   It stays clearly subordinate: its width at most 0.45 of the main
   canopy's names' width; its head medallion as today's side heads (7.32 mm
   at A0, about 0.6 of the canopy base's 12.52 mm).
5. **Where its names sit:** generation *d* of the bough on ring *d*,
   children in their parent's sector, each ring long enough for its names
   side by side (today's `need`, applied to the ellipse's arc). Names upright,
   ovals unrotated, in today's lineage colour of that side family.
6. **Name size:** the bough head counts as a canopy son (depth 1), so the
   `fontFor` depth penalty and leaf factor are the canopy's, generation for
   generation. Target: every side name at the canopy's size for that depth.
   If a crown cannot fit at that size, step down in 2% steps, never below
   today's side size for that family and never touching the canopy's `f`.
7. **The wash:** where the design draws a canopy wash (the pale field behind
   the crown), a bough crown gets the same fill and opacity on its own
   rounded hull (names + 1.5 f). If it would touch the main wash or another
   bough's, it is drawn without one. No other ornament.

### Terraces: how several boughs share a side

Think of the tiers of a cedar. On each side, the free room (from the
ceiling above to `groundY − 0.03 W − f` below, from `trunkClear` to the
margin) is divided into **horizontal terraces**, one per bough, the
higher badge's terrace higher, heights shared by names (today's
`sideShare`, now as vertical bands instead of angular slices). Each crown
stands on its own limb and stays below the limb of the terrace above it
(clearance 1 f). Because terraces are ordered like the badges and each limb
runs along its terrace's floor, **no limb can cross another limb or another
crown**. Crowns may be wider than tall and reach towards the margin: that
is what carries the names across the page.

Where a side has a childless son's medallion, it keeps its place and slot
in the order; crowns treat it (plus 1 f) as an obstacle.

A family with **no** side families never enters this code: its layout,
SVG and timings are identical to today's.

### Fallback ("never worse")

Lay out the boughs; keep them only if the poster is clean (`clarity.ts`
zero issues, no overlaps), every side name is at least today's size for
that family, canopy names unchanged, and the smallest legible paper is no
larger. Otherwise lay out that side as today. One family's terraces must
not degrade the other side.

### In each design

No new colours. Limbs, rims, washes and name boxes come from each design's
`PRESET_PALETTES` exactly as today's side branches do. Modern Archive stays
black ink and gets no wash; Platinum and Imperial Gold keep their satin rims
on the bough heads. Each design's character is unchanged; only geometry
moves.

## 4. Rough sketch: the owner's tree with boughs (positions only)

Page fractions on A0 (width W, height H), from today's render.

- Unchanged: title and two corner verse roundels at the top; the main
  canopy filling 0.24–0.52 H, names 0.23–0.85 W, its pale oval wash; the
  canopy base's medallion at about (0.50 W, 0.54 H); the trunk of 16 badges
  from 0.56 H down to the ground at about 0.785 H; foundation text
  0.80–0.85 H; key and counts below.
- Today's side families: drooping fans below the canopy base, names
  0.13–0.47 W on the left and 0.53–0.87 W on the right, 0.57–0.75 H, about
  five families a side, almost all from the top six badges, one small one
  from a low badge on the right, plus two childless sons' medallions.
- With boughs: on each side a stack of about five flat, shallow crowns,
  like the plates of a cedar, between 0.56 H and 0.76 H. The topmost on
  each side sits just under the canopy's lowest names, the lowest just
  above the ground line, never into the foundation text. Each limb leaves
  its badge level exactly as now, then eases out and slightly up (top
  badges) or down (lower badges) to its crown's head, out at 0.25–0.35 W
  from the centre. Each crown spreads from about 0.06 W beside the trunk's
  edge out to the page margin (about 0.08 W from the paper edge), its names
  in two or three shallow rings above its limb. The low-badge family on the
  right gets the lowest right terrace, its limb running level under the
  others. Seen from across the room: a tall canopy on a trunk, with five
  tiers of small crowns stepping down each side, the whole silhouette a
  broad cedar rather than a lollipop with a fringe.

## 5. Acceptance checks

Measured by the main agent, reported with numbers, renders at print scale.

1. **Side names:** smallest and typical side name at least today's (2A0:
   3.51 / 4.29 mm; A0: 3.20 / 3.22 mm) and typical at least 0.95 of the
   canopy's typical (2A0 ≥ 4.35 mm, A0 ≥ 3.27 mm); target equal.
2. **Canopy unchanged:** canopy typical and smallest names, trunk badges
   and base medallion sizes equal to today on every family and paper.
3. **Width:** the bounding box of all drawn names spans at least 0.80 W on
   the owner's family at A0 and 2A0 (today about 0.74 W), and on `hypo`.
4. **Clean:** zero clarity issues, zero overlaps, zero line crossings on
   the owner's family at A0, 2A0, 1024A0 and `hypo` at A1 and 2A0, all
   seven designs; every name drawn; no name or limb above the ceiling, below
   `groundY − 0.03 W`, inside the foundation text box or outside the margin.
5. **Paper:** the smallest clean, legible paper for the owner's family stays
   A0; for every QA family it does not go up.
6. **No side families, no change:** `kalali-filled`, `small`, `marriages`,
   `names`, `natural350`, `sultan` produce byte-identical poster SVG at A1
   and 2A0 (and `/lab/nodes` identical).
7. **Trunk:** trunk path, badges, spurs and ports byte-identical to today
   on every family with side families.
8. **QA:** `npm run qa:layout` no new defect against
   `tests/qa/layout-baseline.json`; `tests/side-branches*.test.ts` and the
   childless-sons test pass unchanged; a new test
   `tests/side-families-grow-as-boughs.test.ts` asserts checks 1, 3 (on a
   fixture), 4 and the terrace order (higher badge's crown base higher).
9. **Arabic and English:** upright text, reading order mirrored (the
   eldest's side right in Arabic, left in English) as today.
10. **Speed:** layout time on the owner's family within 10% of today
    (12.3–12.9 s).

## 6. Risks to watch

- **The canopy's underside:** the topmost terraces sit right under the
  canopy's lowest names and its wives' and daughters' dotted lines. Keep
  today's ceiling; do not try to grow crowns up beside the canopy in this
  change.
- **The foundation text and roots:** the lowest terrace is pressed onto the
  ground line; the ground clamp (0.03 W) moves names upward into a knot if
  the terrace is too short. Give the lowest terrace at least two ring
  heights or use the fallback.
- **Page edges and frame:** crowns reaching the margin meet the frame's
  corner ornaments and leaf sprigs in some designs; names must keep today's
  `margin` and must not touch an ornament.
- **Thin terraces:** a long trunk with many side families (`hypo`, a
  340-person family) gives terraces too thin for a dome; fall back rather
  than squash names below today's size.
- **Lopsided families:** all boughs on one side leave the other side empty;
  the 0.80 W check then cannot be met and is waived, but nothing else is.
- **Lines under names:** a crown's inward end near the trunk sits above
  lower limbs' spurs; check the clarity "line under an unrelated name" rule
  there specifically.

## 7. Visual references (in words)

1. **Cedar of Lebanon, mature tree:** horizontal limbs in tiers, each
   carrying a flat, wide plate of foliage on its upper side; plates stacked
   with clear sky between them. This is the terrace model.
2. **Seventeenth-century engraved genealogical "arbor" plates:** a central
   stem of ancestors, collateral lines leaving it as separate limbs, each
   ending in its own small cluster of named roundels; fine line, no
   shading, the side clusters smaller than the crown but drawn the same way.
3. **The old espalier pear on a garden wall:** level arms leaving a single
   upright stem in strict order, never crossing, each arm's growth standing
   up from it. Order and calm, the opposite of a weeping fringe.

## 8. Out of scope

The trunk's shape and drawing, the canopy, generation bands, vertical
margins, the foundation and its styles, the key, the designs' palettes,
childless sons' medallion rules, and the papers offered.
