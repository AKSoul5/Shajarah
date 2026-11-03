// Layout QA, fixture C: every design × display mode, on A3 and A1 (and 2A0, 4A0: the stress family on the largest sizes). See run.ts.
import { describe } from "vitest";
import { ENABLED, MODES, THEMES, caseTest, type Mode } from "./run";

describe.skipIf(!ENABLED)("layout QA · C", () => {
  for (const paper of ["A3", "A1", "2A0", "4A0"] as const) for (const mode of Object.keys(MODES) as Mode[]) for (const theme of THEMES) caseTest("C", mode, theme, paper);
});
