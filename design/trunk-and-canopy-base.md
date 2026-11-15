# Brief: the trunk and the base of the canopy

Branch `poster/trunk-canopy-base`. Written 2026-11-15, before implementation.
The work is a prototype: commits marked WIP, judged by before/after images,
one full `qa:layout` run before merging. There are three steps, done in
order, and the owner approves each one before the next starts.

## Purpose

The reader stands in front of the poster, finds the founder at the foot of
the canopy and follows one straight stem up into the family. Today three
things get in the way:
1. The names are set on several unrelated scales.
2. The stem leans to reach a wife.
3. The trunk looks sawn off under thin limbs.

When all three are fixed, the trunk, the founder, his wives and the canopy
should read as one tree and one type scale, and the canopy's names should
carry the poster.

## What exists, and the decisions involved

- **Name sizes** (`botanical.ts`):
  - Canopy names: `fontFor`, ×1.15 for medallions, then down 6% per generation to 0.72.
  - The canopy base: `f*1.3`. Its space is `baseRFor`, which also sets the radius of the first ring.
  - Trunk names: `trunkFontFor`, capped by `budget.fit × canopyTypicalFor` (the median).
  - Side-branch heads: `0.8 × trunkFont`.
  - Spouse cartouches: `0.9 ×` her smallest child.
  - Legible minimum: `minTextMm`, 3.2 mm by default.
- **README, "The trunk in proportion"**: trunk names at most 1.15× the canopy's
  typical name (`TRUNK_TO_CANOPY`). That step only runs when the first layout
  is already clean (`isClean(best.layout)`), and it is kept only when it is
  `better`. When it fails, nothing caps the trunk. This gate is the probable
  reason the 340-person family is at 2.8×. **Confirm this on that family
  before changing anything.**
- **README, "One solid trunk"**: all badges are one width and rest inside the
  bark. The trunk is the widest badge plus a margin of wood. It flares under
  the canopy base's medallion: the collar is `max(1.3·trunkWidth, 1.9·oval rx)`,
  with a dome hidden under the oval.
- **README, side branches**: each side branch leaves its own badge level,
  turns only past the bark's edge, and is at most 0.62 of a badge wide.
- **README, "Spouses on the branch"**: a man's wives sit at one distance from
  him, each on the side of her own children. The centred son stands among his
  full brothers (1.0.53, `ae73f45`). Where the children fan out sideways from
  a large name, the wife goes beyond the edge of his name.
- **The main limbs**: they start at the base's centre under the oval,
  `limbShare = clamp(1.05/limbs, 0.14, 0.4)` of the trunk's width (`baseHolder`).

### Measured before (whole tree, no focus, spouses shown)

| Family, paper | Typical canopy name | Trunk ÷ typical | Base ÷ typical | Spouses | Trunk width |
|---|---|---|---|---|---|
| Owner's 340-person family, 2A0 (owner's figures) | 4.6 mm (4.9 at depth 1, 3.5 smallest) | 12.9 mm, **2.80×** (16 names); side-branch heads 10.3 mm, 2.24× | 17.7 mm, **3.85×** | 3.9–4.4 mm | 72.4 mm, the same from ground to top |
| natural350, A0 / 2A0 | 3.7 / 3.7 mm | no trunk | **4.27× / 6.03×** | – | 31.8 / 44.9 mm |
| kalali-filled, A0 / 2A0 | 5.3 / 6.6 mm | 1.15× (5 names) | **2.75× / 1.83×** | – | 34.2 / 42.8 mm |
| kalali-realistic, A0 / 2A0 | 6.9 / 9.6 mm | 1.15× | **2.54× / 2.60×** | – | 44.4 / 61.7 mm |
| nouri, A0 / 2A0 | 12.9 / 17.5 mm | no trunk | 2.20× / 2.30× | 10.5–15.7 mm; the base's two wives at −69° and +72° from vertical | 56.9 / 80.4 mm |
| multi, A0 / 2A0 | 6.6 / 9.3 mm | – | 1.30× | 3 wives at −47°, +3°, +53° | 17.1 / 24.2 mm |

No public sample has all three faults together: a long trunk with side
branches, plus a canopy base whose wife bore the centred branch.

**The owner's own family is the main test case** (owner's instruction,
15 Nov): images and numbers are made from it locally, whole tree and as
saved, and it is never committed, quoted or sent anywhere, nor are images of
it. Proposed, not yet agreed: an invented fixture of the same shape (about
340 people, a 16-name trunk with side branches, a canopy base whose wife bore
the centred branch) in `src/lib/qa/`, so tests in the repository can cover it.

## Step 1: one scale for names

**What the reader sees.** The canopy's names set the scale. Every other name
is a measured step above them, never a jump. The founder is clearly the
largest name, but at most about twice a canopy name, not four to six times.

**The rule.**
- Choose the canopy's typical name first, as the median of the canopy's
  nodes. Then cap the other names against it:
  - trunk names: at most 1.3×, aiming for 1.15× where it fits;
  - side-branch heads: at most 1.3×, and keep them at or below the trunk's names;
  - the canopy base: at most 1.8×.
- Nothing goes below the legible minimum.
- These caps are part of sizing, not an optional retry. They must apply when
  the first layout is not clean, too.
- The ring radius must not shrink along with the base oval. Decide
  explicitly:
  - Either the first ring comes from its own demand, with the base's space
    as a lower bound;
  - or the base keeps its space and only its oval and type get smaller.
- A wife of the canopy base heads a family. Her cartouche should be at least
  1.0× the typical name. Today it is 0.9× her smallest child, which gives
  3.9 mm against 4.6 mm. Other spouses: no smaller than today. Raising them
  needs the owner's agreement, so show it as a separate image.

**Acceptance.**
- On the owner's family at A0 and 2A0, and on natural350, kalali-filled,
  kalali-realistic, nouri and hypo at A0 and 2A0:
  - trunk ÷ typical ≤ 1.30;
  - side-branch head ÷ typical ≤ 1.30;
  - base ÷ typical between 1.30 and 1.80;
  - the base is the largest name on the poster;
  - no name below `minTextMm`.
- The typical canopy name is never smaller than before, in any family or
  paper. On the owner's family at 2A0 it should grow, because the trunk gets
  shorter: 16 rows at 6.0 mm instead of 12.9 mm free about 190 mm of height.
- `qa:layout`: no new defects against `layout-baseline.json`.

**Risks to watch.**
- The trunk's names at A0: at 1.3 × about 3.5 mm they are near the minimum.
  Check them at print size.
- Side-branch heads becoming the same size as canopy names, so the side
  families stop reading as branches of the trunk.
- A long founder's name (with its laqab line) no longer fitting the smaller
  oval.
- The first ring crowding the oval.

## Step 2: the stem rises straight through the centred wife

**What the reader sees.** The stem goes from the founder, through the
cartouche of the wife who bore the centred branch, to that branch, on one
straight vertical. The other wives stand to either side at the same
distance, each beside her own children.

**The rule.**
- The centred wife is the wife holder whose children include the centred
  branch's head (`centerIds`).
- Her direction is the unit vector from the base to the centred son. It is
  not the plain mean of her children (`h.dir`), where small children outvote
  the large branch.
- Her distance is measured along that line. The `reach` / `along` limit
  comes from the centred son only, not from her nearest child: a daughter
  off to the side projects almost to zero, which is what pulls the box back
  into the oval.
- This applies to the canopy base's own spouses, which take the fallback
  `spot(h, order, …, true, false)` path. Use the same direction there.
- Her other children fan out from her cartouche. The other wives keep their
  order around her, as `inOrder` requires.
- If no spot on the stem is clear, try ±4° before anything wider. Report it;
  do not hide it.

**Acceptance (the owner's family, nouri, multi; A0 and 2A0; Arabic and English):**
- the angle from vertical of the base-to-wife line is ≤ 3°;
- the bend between base-to-wife and wife-to-son is ≤ 5°;
- the centred son stays within 1% of the width of the trunk's axis
  (`tests/center.test.ts`);
- the other wives are equidistant, within 5%;
- 0 crossings and no new QA defects.

The "before" figure is the angle the owner's family gives today: record it.

**Risks to watch.**
- Her cartouche squeezed between the oval and the first ring, or touching
  the centred son's limb.
- Her other children's lines bunching into a fan that runs along the stem,
  which `linesAlongside` reports.
- The other wives pushed so far round that their lines run under
  side-branch names.

## Step 3: the trunk divides into the limbs

**What the reader sees.** One tree.
- The trunk is wide at the ground and narrows as it rises.
- Above the founder's oval it parts into the main limbs, whose outer edges
  continue the trunk's edges.
- The oval hangs on the wood below the fork, like a plaque. It no longer
  caps a stump.
- Each limb is bark-coloured where it leaves the trunk, then turns into its
  lineage colour.

**The geometry.**
- Ground width: as today, on step 1's smaller type. The foundation's joint
  (`trunkSpread`, `trunkTaper`) is unchanged.
- Width just below the fork: the sum of the main limbs' own starting widths,
  without the `limbShare` inflation, clamped to 0.55–0.85 of the ground width.
- Constraint: at every badge's row, the bark is at least the badge's width
  plus 0.8 × the trunk's font. This keeps the "badges inside the bark"
  decision. If the badges stop the taper, the taper is smaller; the badges do
  not get narrower.
- The taper is a smooth concave line with no step. Drop the collar and the
  dome.
- The fork sits at the oval's top edge plus 0.3–0.6 of the base font. The
  limbs leave in the same left-to-right order as their directions, so none
  crosses another inside the wood.
- The notches between limbs are rounded, with a radius of about 0.25 of the
  limb width. No points, and no gaps showing paper.
- Side branches use the bark's local width at their own badge's height.

**Colour.**
- Flat fills only, no texture.
- Each limb is the trunk's mid-tone for about 1.5 of its starting widths
  from the fork. It then changes to its lineage colour over about 2 widths,
  with a linear gradient along the limb.
- The change ends at least one font height before its first name or fork.
- In-between colours must also pass 3:1 on the paper, in every design.
- Modern Archive: one continuous black outline round trunk and limbs, with
  no colour change.
- With branch colours off: all bark, with no seam at all.

**Acceptance (all seven designs; the owner's family, kalali-filled, hypo, nouri; A0 and 2A0):**
- Report the trunk's width at the ground and just below the fork. On the
  owner's family at 2A0, the width below the fork should be ≤ 0.85 of the width at
  the ground (before: 72.4 mm, both the same).
- No badge pokes out of the bark.
- 0 crossings.
- No new QA defects, including the joint with each of the six foundation
  styles.
- `palettes.test.ts` passes, with the gradient midpoints added.

**Risks to watch.**
- The oval and the wives crowding the fork.
- Colour transitions reading as seams or bands, especially in Platinum and
  Emerald, where bark and lineage colours differ most in value.
- A crotch that looks pinched at A0.
- Side branches leaving a trunk edge that has moved.
- Surface roots and foundations sized from the old width.

## Inspect at print scale, for every step

- **Whole poster** at A0 and 2A0: the owner's family (whole tree, and as
  saved), natural350, kalali-filled, nouri.
- **Canopy-base close-up** at 1:1 print size, about 300 × 200 mm around the
  oval: the oval, the wives, the fork and the first ring. In the default
  design, Platinum and Modern Archive, and in all seven for step 3.
- **Trunk close-up**: the top and bottom badges, and the side-branch
  departures.
- Use the same crops before and after, saved in
  `%TEMP%\shajarah-design\<date>-trunk-canopy-base\`.

## Constraints from the design language

- Names first: no wood may outweigh a name.
- Flat branches, satin rather than gloss, no shadows or bark texture.
- Arabic upright, and ovals never rotate.
- The base keeps its scalloped double ring. Parents keep the second ring and
  bold type.
- Colours only from each design's `PRESET_PALETTES`, with each design's
  character kept.
- No line crosses another, and every name is drawn.

## Out of scope

- Side families drawn as boughs.
- Generation bands.
- Vertical margins.
- Any change to the database or schema.

Update the README passages "The trunk in proportion", "One solid trunk" and
"Spouses on the branch" in the same change, with the measurements above.
