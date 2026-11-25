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

## Next, in order

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
