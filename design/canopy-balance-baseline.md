# Canopy balance: baseline (main 0a3c7dd, Shajarah 1.0.53)

Measured on 17 Nov 2026, before any change, to detect regressions. Sizes in
mm on the paper. Every name's place, size and box is also recorded for the
owner's family in a private file outside the repository (ids only).

| Poster | Layout time | Clean / lines alongside / legible (smallest text) | Founder name / oval | Trunk names / badge / trunk width | Canopy names min / median / max | Canopy reach left / right / names' centre right of the trunk | Side families min / median / max (connections) |
|---|---|---|---|---|---|---|---|
| owner's whole tree_A0 | 20.5 s | yes / 19 / yes (3.2) | 12.52 / 43.8×28.9 | 9.15 / 36.6×14.64 / 51.2 | 3.22 / 3.44 / 4.21 | 229.1 / 299.1 / 20.5 | 3.2 / 3.22 / 3.66 (101) |
| owner's whole tree_2A0 | 20 s | yes / 18 / yes (3.51) | 17.7 / 62×40.9 | 12.94 / 51.75×20.7 / 72.4 | 4.29 / 4.58 / 5.61 | 320.6 / 419.8 / 29.7 | 3.51 / 4.29 / 4.88 (101) |
| owner's saved poster_A0 | 11.9 s | yes / 0 / yes (3.39) | 6.75 / 23.6×15.6 | 4.94 / 19.74×7.9 / 27.6 | 3.76 / 4.02 / 4.92 | 225.7 / 293.2 / 32.2 | – |
| owner's saved poster_2A0 | 12.3 s | yes / 0 / yes (3.86) | 9.69 / 33.9×22.4 | 5.27 / 21.07×8.43 / 29.5 | 4.29 / 4.58 / 5.6 | 285 / 413.1 / 49.2 | – |
| kalali-filled_A0 | 1.4 s | yes / 0 / yes (4.35) | 14.6 / 51.1×33.7 | 6.11 / 24.44×9.78 / 34.2 | 4.35 / 5.31 / 6.94 | 185 / 200.9 / 3.1 | – |
| kalali-filled_2A0 | 1.4 s | yes / 0 / yes (5.43) | 12.16 / 42.5×28.1 | 7.64 / 30.55×12.22 / 42.8 | 5.43 / 6.64 / 8.68 | 325.3 / 338.9 / 12.3 | – |
| nouri_A0 | 0.1 s | yes / 0 / yes (14.69) | 28.43 / 275.2×181.6 | – / –×– / 56.9 | 14.69 / 17.36 / 19.97 | 378.4 / 378.4 / 11 | – |
| nouri_2A0 | 0.1 s | yes / 0 / yes (20.43) | 40.19 / 389×256.8 | – / –×– / 80.4 | 20.43 / 24.14 / 27.77 | 535 / 535 / 15.9 | – |
| natural350_A0 | 1.5 s | yes / 1 / yes (3.26) | 15.88 / 76.5×50.5 | – / –×– / 31.8 | 3.26 / 3.72 / 5.21 | 373.4 / 369.8 / -11.3 | – |
| natural350_2A0 | 2.1 s | yes / 5 / yes (3.27) | 22.45 / 108.2×71.4 | – / –×– / 44.9 | 3.27 / 3.72 / 5.22 | 524.7 / 520.8 / -15.9 | – |

## After (branch `poster/canopy-balance`, 18 Nov 2026)

Same measurements on the change. Names' centre is right of the trunk;
names in mm on the paper.

| Poster | Layout time | Clean | Canopy names min / median | Reach left / right / names' centre | What moved |
|---|---|---|---|---|---|
| owner's whole tree_A0 | 22.5 s | yes | 3.22 / 3.44 (same) | 236.9 / 288.5 / 0.4 | the canopy and its spouses' boxes; trunk and side families unchanged |
| owner's whole tree_2A0 | 22.2 s | yes | 4.47 / 4.77 (larger) | 334.1 / 406.7 / 0.7 | canopy; side families only by their larger size |
| owner's saved poster_A0 | 12.2 s | yes | 3.96 / 4.23 (larger) | 247 / 289.2 / 2.4 | canopy and spouses |
| owner's saved poster_2A0 | 10.7 s | yes | 4.76 / 5.08 (larger) | 313.7 / 407.8 / 3.8 | canopy; trunk names by their larger size |
| kalali-filled, nouri, natural350 (A0, 2A0) | as before | yes | as before | as before | nothing |

Layout QA (448 posters) against 1.0.53: none with smaller names or a new
defect, 9 with larger names, 1 with a finding fewer. Speed benchmark on the
same machine, each run alone: large family with roundels 0.99 → 2.18 s
(within its 2.5 s budget; it is laid out a second time without the change
to check it costs nothing), dense A1 2.30 → 2.37 s, natural 350 on A1
4.47 → 4.59 s (over its budget on this machine on 1.0.53 too).

Open point from the design review: on the owner's saved poster at 2A0 the
canopy base's wife's box stands further from the trunk's axis (11.6 → 29.7
mm; at A0 it came nearer, 18.0 → 9.1 mm). Her box is aimed at her sons on
the first ring, which are packed afresh at the larger size; the stem under
the centred canopy leans more there. Not changed here.
