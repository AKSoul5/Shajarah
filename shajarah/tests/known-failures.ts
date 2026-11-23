// Known failures of the new canopy fan, 1.0.60 (owner's decision, 23 Nov
// 2026: ship the fan, record what it does not yet pass, fix it in 1.0.61).
// Each test still runs. Marked as known, it is expected to fail: once the
// fault is fixed it passes, the mark turns it red, and its entry here is
// removed with the fix. Nothing is hidden: the release notes name them.
import { it } from "vitest";

export const KNOWN: Record<string, string> = {
  // A side family's lines on the crowded-trunk family (lines under names, a
  // crossing, two lines run together), where the side families now share
  // one nested fan per side.
  "childless-trunk A1": "side families' nested fan: a name above its legible size where 1.0.59 kept it smaller",
  "childless-trunk A0": "side families' nested fan: lines under names (8)",
  "childless-lines en A1": "side families' nested fan: one crossing",
  "childless-lines ar A1": "side families' nested fan: two lines run together",
  "childless-lines ar A2": "side families' nested fan: two lines run together",
  "childless-lines ar A3": "side families' nested fan: two lines run together",
  "side-badge refined A1": "side families' nested fan: lines under names",
  "side-badge classic A1": "side families' nested fan: lines under names",
  "side-badge refined A0": "side families' nested fan: two lines run together",
  // A man's wives on one spouse ring per generation: a line to one wife's
  // box crosses another's, on test family 11.
  "spouse-lines family 11 refined 2A0": "spouse ring: one crossing between two wives' lines",
  "spouse-lines family 11 classic A0": "spouse ring: one crossing between two wives' lines",
  "spouse-lines family 11 emerald A1": "spouse ring: one crossing between two wives' lines",
  // The 90-person generated family with daughters' families and spouses.
  "stress 90 1 through+spouses": "no paper size clear on the new fan",
  "stress spouse holders": "two wives' boxes overlap at A1",
  // A generation's names not on one smooth arc on two sample families: a
  // name pushed off its ring by the final separation of overlapping names.
  "fan small family": "a name off its generation's ring",
  "fan the Al-Kalali line, filled": "a name off its generation's ring",
  // The editor's two placements of the centred son's mother.
  "editor both started": "on the new fan the upright placement wins outright, so this family no longer needs the comparison the test starts from; a family that does is to be found",
  "editor mixed steps": "QA family B with rectangular names at A2: 7.36 mm, not above 8 (the name-box designs' smaller names, to be fixed in 1.0.61)",
  // Innermost ring names below the canopy base beside the trunk.
  "shape dominant luxe": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape dominant silver-gold": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape dominant classic": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape samples luxe": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape samples silver-gold": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape samples classic": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
  "shape samples emerald": "an inner ring's end name below the canopy base, within a fifth of the width of the trunk",
};

/** `it`, or `it.fails` for a known failure (see KNOWN). */
export const knownIt = (key: string) => (key in KNOWN ? it.fails : it);
