// Layout QA, fixture C-en: every design × display mode, on A3 and A1. See run.ts.
import { describe } from "vitest";
import { ENABLED, MODES, THEMES, caseTest, type Mode } from "./run";

describe.skipIf(!ENABLED)("layout QA · C-en", () => {
  for (const paper of ["A3", "A1"] as const) for (const mode of Object.keys(MODES) as Mode[]) for (const theme of THEMES) caseTest("C-en", mode, theme, paper);
});
