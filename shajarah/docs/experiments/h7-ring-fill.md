# H7 experiment: more room for crowded rings (WIP, not for merging)

Switch (this branch only): `ZZFILL=<fill>` replaces `RING_FILL` (0.85) in
`ringChain`, the radius each crowded ring needs in the larger-names
("dense") layout. Harness: `h7-ring-fill-harness.test.ts.txt` (copy into
`tests/` as `zz-h7.test.ts`, run with `OUT=<file> TAG=<tag> ZZFILL=<fill>`).
Paragraph foundation, refined design. Kink = ringKink (0 = names on their
ring; the target is the column foundation's ~0.2); mm = smallest name.

What the kink is: one name at the end of a crowded ring stepping out
(long lineage A0: ring 4, 25 names, one at 0.767 of the span against the
ring's 0.596; ring 5 likewise). The rings themselves have no slack: rings
1-4 sit at the radius their names need, rings 5-14 at the minimum gap.

| Family / paper | 0.85 (now) | 0.80 | 0.77 | 0.75 | 0.72 | 0.70 |
|---|---|---|---|---|---|---|
| Long lineage A1 | 0.592 / 3.44 | 0.655 / 3.55 | 0.656 / 3.54 | 0.107 / 3.53 | 0.069 / 3.39 | 0.067 / 3.38 |
| Long lineage A0 | 0.585 / 4.82 | 0.657 / 4.90 | 0.656 / 5.01 | 0.107 / 4.99 | 0.069 / 4.80 | 0.067 / 4.79 |
| Long lineage 2A0 | 0.576 / 6.52 | 0.108 / 6.75 | 0.656 / 7.08 | 0.107 / 7.06 | 0.069 / 6.79 | 0.067 / 6.77 |
| No lineage, 350, A1 | 0.056 / 3.02 | same | same | same | same | same |
| No lineage, 350, A0 | 0.016 / 3.26 | same | same | same | same | same |
| No lineage, 350, 2A0 | 0.001 / 3.27 | 0.001 / 3.27 | 0.001 / 3.27 | 0.123 / 3.26 | 0.130 / 3.20 | 0.136 / 3.20 |
| Balanced A1/A0/2A0 | 0.120 / 0.107 / 0.130 | same | — | same | — | — |
| English stress A1/A0/2A0 | 6.305 / 0.617 / 0.715 | same | — | same | — | — |

Result: not adopted. The response is erratic (0.80 and 0.77 rough, 0.75
smooth, 0.72 smooth but smaller names): it flips which size the search
settles on rather than spacing the rings more evenly. 0.75 alone is smooth
with larger names for the long lineage, but costs the 350-person family
0.01 mm and 0.12 of kink at 2A0. The English stress family's 6.3 at A1 is
the separate long-medallion fault fixed on branch B (H3).
