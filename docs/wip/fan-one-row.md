# WIP: one row per ring, and a symmetric fan (G84–G86)

Owner's decision (25 Nov 2026): **one row per generation's ring is a must;
symmetry as close as the family allows.** Everything here is behind the
`FAN_ONE_ROW` switch (an environment variable, off by default): with it off
the layout is exactly 1.0.61's (checked: the private 340-person family at
2A0 with spouses shown replays to the same poster, 1 problem, 4.63 mm).

## What is wrong (measured on the private 340-person family, 2A0)

- **Two staggered rows on one ring.** The ring packing (botanical.ts, "4b.
  Ring packing") leaves 13 overlapping pairs on the 3rd generation from the
  canopy base: its last pass gives neighbours only `RING_STEP` (0.3) of the
  room they need. The relaxation's last clean-up (`relax`, "Final clean-up")
  then separates them freely, which at the top of the fan means every other
  name ±15 units in or out of its ring. Spouses shown or not.
- **Lopsided outer fans.** Partition slices nest: a slice on the first ring
  runs out to the edge even where its branch ends (13 childless sons of the
  canopy base on the left), so the outer rings crowd into the right half:
  4th generation 11°–94°, 3rd −5°–121°, 2nd 0°–154° (spouses off).

## What was tried (full layout searches unless noted)

| Attempt | Spouses off | Spouses on |
|---|---|---|
| 1.0.61 as released | 0 problems, 4.63 mm | 1 problem, 4.63 mm |
| Names snapped back onto their rings only | 1, **2.54 mm** | 1, **2.00 mm** |
| One row, each ring packed freely (least squares, `packRing`) | 34, 3.26 mm | 22, 4.38 mm |
| …plus full symmetric pull | 72, 3.20 mm | 70, 3.20 mm |
| Slices by each branch's most crowded ring (floor / alone) | 1, **2.54 mm** | 2–4, 3.20–3.26 mm |
| Children round their own fathers, one row, symmetric pull 0.3 | 45, 4.38 mm | 34, 4.38 mm |
| …the same, lines re-bent at any count (replay) | 24 | 27 |
| Whole families packed as units | 13, **2.00 mm** | 20, **2.00 mm** |
| …plus 2 rounds of fathers moved over their families | 24, 3.20 mm | 25, 3.20 mm |
| Wider `sideBias` (replays) | 16–51 | 31–40 |

(The legible minimum at 2A0 is 3.2 mm.)

## Where the problems sit

Almost all of them (spouses shown) are the families shown through three
daughters on the 2nd ring: the line from each daughter to her husband's box
runs across the lines of the family beside her and under the names of the
2nd ring. Moved to stand in one row, the children went one way and their
parents did not follow, so the lines slant across neighbours.

## Two thresholds that hid the line problems

`check()` re-bends troubled lines only for a drawing with at most 30
problems, and the untangling gives up above 15 (`REFINE_MAX`,
`UNTANGLE_MAX`, switches here). Every one-row attempt started above both,
so neither ran: re-bending at any count took one attempt from 34 to 27.

## Session 2 (25 Nov 2026): lines first, names frozen

Owner's brief: exhaust line optimisation with every name and spouse's box
fixed before moving any name; measure positioning separately; no guessing.

### Method

- **Stand-in family** (`fan-probe/standin.ts`, invented names; the private
  family is not available outside the owner's machine): `naturalFamily`
  grown to 260, 12 more childless sons of the founder, three daughters
  (one each under three of his sons) with husbands, children and
  grandchildren shown through them, and a recorded wife for about a quarter
  of the men. 332-339 people; released at 2A0, spouses shown: 0 problems at
  3.5-4.25 mm (the private family: 1 at 4.63 mm). Seeds 5, 7, 11, 23, 31, 42.
  (A first version with a wife for every man was far denser: released
  1.7 mm. Its numbers below are marked "dense".)
- **Frozen positions** (`LINES_FROZEN`): after the names are placed, no
  untangling, no spouse-box re-placement, no crossing-clearing moves; only
  lines are drawn. A layout is searched once, its recipe saved, then
  replayed under each line setting; a hash of every name's and box's
  position is checked equal across settings (`fan-probe/replay.ts`).
- **Line search** (`LINE_SEARCH`, used only with `LINES_FROZEN`): 1 the
  released re-bending repeated until it stops helping; 3 adds a wide family
  of shapes (S-bends, 4 × 4 × 12 arrive/follow/bow), lines turning steadily
  from a chosen direction, and **the partner-to-spouse-box lines, which the
  released re-bending never touches** (they have no `lineSpec`); 4 adds
  pairs: each troubled line bent together with each line it conflicts with,
  the best 14 shapes of each. Every round is kept only if the clarity check
  itself counts fewer problems, so the search never does worse than the
  released drawing.
- **Diagnosis** (`fan-probe/diag.ts`): each crossing classed by the angular
  order of its two lines' ends round the canopy base. Two lines between the
  same two rings whose ends are in opposite orders must cross if lines grow
  outward ("forced"); otherwise a better line can avoid it.

### Results, names and boxes frozen (one row, 2A0, spouses shown)

| Stand-in | Released re-bending (≤ 30) | Any count, repeated | Wide shapes + box lines | + pairs | Forced by positions |
|---|---|---|---|---|---|
| 7 | 5 | 3 | 2 | **2** | 0 |
| 42 | 18 | 18 | 15 | **14** | 9 |
| 31 | 23 | 23 | 20 | **20** | 13 |
| dense 23 | 13 | 13 | 6 | **3** | 2-3 |
| dense 42 | 22 | 22 | 20 | **19** | 12 |
| dense 31 | 52 | 45 | 43 | **40** | 31 |

Lines stay direct: mean length over straight 1.009-1.015, longest line
unchanged. Lifting the thresholds alone (`REFINE_MAX`) did almost nothing:
the released re-bending's candidate shapes, not the threshold, were the
limit, and it could not bend the lines to spouses' boxes at all.

**Conclusion of phase 1:** line optimisation alone clears a poster whose
names stand in a consistent order (stand-in 7, nearly; dense 23), and
removes a quarter to a third of the problems elsewhere. What remains is
forced: the two lines' ends are in opposite orders round the canopy.

### Why the order breaks: the rings are too short

Measured in the one-row packing (`FAN_DEBUG`), the room a ring's names need
(their widths across the ray plus line corridors) against its arc:

| Stand-in | Ring 2 | 3 | 4 | 5 | 6 | 7 | One-row problems |
|---|---|---|---|---|---|---|---|
| 23 | 0.53 | 0.87 | 0.90 | 0.79 | 0.49 | 0.26 | 0 (3.26 mm) |
| 5 | 0.47 | 0.90 | 0.84 | 0.81 | 0.54 | 0.32 | 0 (3.20 mm) |
| 7 | 0.78 | **1.11** | **1.03** | 0.96 | 0.50 | 0.13 | 5 |
| 42 | 0.89 | **1.48** | **1.35** | **1.12** | 0.81 | 0.41 | 18 |
| 31 | 0.83 | **1.43** | **1.61** | **1.10** | 0.69 | 0.08 | 23 |
| 11 | 0.93 | **1.20** | **1.31** | **1.19** | 0.76 | 0.28 | 0, but 2.62 mm |

Problems appear exactly where a ring is over-full at the legible size. The
group packing then compresses the families' starts (`packRing` scales a
ring that does not fit), so families overlap; the relaxation separates the
names in mixed order (`fan-probe/ringorder.ts`: rings 3 and 4 of stand-in 31
have 23 and 13 families split; the released placement has none). Mixed
order is what forces the crossings. The problems sit at the two ends of the
fan, low left and right, where the page's sides pull the rings in.

### Positioning experiments (measured alone, line search off)

- `FAN_KEEP_ORDER`: after the relaxation, each ring set in one row again in
  its order before it. No change: the order was already broken before the
  relaxation, by the over-full packing.
- `FAN_RING_ROOM`: a crowded ring moves out and the rings outside it only as
  far as their least gap (not all by the same step). Nothing moves: the
  outermost ring already stands at the canopy's edge (t 1.00, cap 0.975) and
  the rings are already closer than the least gap with spouses' room
  (0.15 apart, least 0.21). The canopy has no radial room to give.
- Families moved as units along a ring (session 1's harmony rounds) cannot
  help a ring whose names need 1.1-1.6 × its length.

**Conclusion of phase 2 so far:** on these families the one-row canopy is
out of room at 3.2 mm on 2A0, not out of good lines or good order. Within
the present canopy, no arrangement of names on their rings fits them in one
row. The levers left are a design decision, not tuning:

1. More room for the middle generations: rings 3-4 further out and the
   sparse outer rings (fill 0.1-0.8) closer to them, which needs a gap
   between rings smaller than today's least (names and spouses' boxes
   facing each other across it).
2. A larger canopy on the page: the canopy already spans the page's width;
   the room left is the band under the title and the trunk's length.
3. Names below 3.2 mm, or a larger paper (what the released engine does:
   it keeps rings in two staggered rows and stays clean at 4.6 mm).
4. Two rows on an over-full ring only, families kept whole and in order
   (the released behaviour, made orderly).

### Option 2 tested on the owner's family (25 Nov 2026, owner's choice)

The owner supplied his family's file for this test. It was used only in a
scratch folder outside the repository; nothing from it is committed. Figures
only below.

On the real family the canopy uses ~30% of the page's height (the 34-name
trunk and its side families take more than half). With circle rings, each
ring's half-width is capped by the room above the canopy base (~800 units)
instead of the page's half-width (960). Only ring 2 overflows (1.18).

- `CANOPY_WIDE` (test A): the rings' ovals as wide as the page's margins,
  height unchanged. Every ring then fits (ring 2: 1.18 -> 0.96). Measured
  alone (fresh search, line search off): **no gain**, 46 -> 50 problems
  spouses off, 31 -> 37 on. Families are hardly mixed on this poster (3 splits
  on one ring), so overflow is not its main cause.
- Line search alone (names frozen, present canopy): 26 -> 13 (spouses off),
  29 -> 16 (on).
- Both: **8 and 9 problems** at 3.20 mm, none forced by order; almost all in
  the daughters' families, on lines to and from their husbands' boxes, and in
  a bundle of long lines sweeping to the far left of the fan.

Matrix, owner's family, classic design, fresh searches (wide + line search
applied to the chosen layout):

| Paper | Spouses | Daughters' families | Released | Wide + lines |
|---|---|---|---|---|
| 2A0 | off | off | 0 · 6.40 mm | 1 · 4.84 mm |
| 2A0 | off | on | 0 · 4.63 mm | 8 · 3.20 mm |
| 2A0 | on | off | 2 · 4.76 mm | 6 · 4.76 mm |
| 2A0 | on | on | 1 · 4.63 mm | 9 · 3.20 mm |
| A0 | off | off | 0 · 4.70 mm | 0 · 3.20 mm |
| A0 | off | on | 6 · 3.58 mm | 12 · 3.26 mm |
| A0 | on | off | 2 · 3.26 mm | 5 · 3.31 mm |
| A0 | on | on | 0 · 3.26 mm | 21 · 3.89 mm |

**Verdict:** worse than released in every cell but none; not a default
candidate. The one-row fan still costs name size (4.63 -> 3.20 mm at 2A0
with everything shown) and leaves 5-21 problems. The wider canopy helps
only together with the line search, and only on 2A0.

### Switches (all off by default; off, the output equals `main`, checked)

`FAN_ONE_ROW`, `LINES_FROZEN`, `LINE_SEARCH` (0-4), `REFINE_MAX`,
`UNTANGLE_MAX`, `FAN_KEEP_ORDER`, `FAN_RING_ROOM`, `CANOPY_WIDE`, `HARMONY_ROUNDS`,
`HARMONY_PULL`, `SYM_BLEND`, `FAN_DEBUG` (prints each ring's fill).
Probe scripts: `fan-probe/` (run from `shajarah/` with
`npx tsx --tsconfig tsconfig.json ../docs/wip/fan-probe/<script>.ts`; they
need a `node_modules` link beside them).

## Next (as planned in session 1; superseded in part by session 2)

1. A design brief (design-director) for the canopy laid out ring by ring:
   order from the partition; each ring placed in one row, families as
   units round their fathers, fathers over their families (a few rounds),
   symmetric where the order allows.
2. Holders (spouses' boxes) placed on the spouse ring in the same order as
   the families, between a partner and her children's middle.
3. Lines drawn for that placement: each family fanning straight out from
   its father (`polarCurve` is already in the file), re-bending allowed at
   any count.
4. Then the matrix: this family spouses off/on, daughters off/on, A0 and 2A0,
   three designs; and the 448-case layout QA, no family worse.

Probe scripts for the private family stay outside the repository.
