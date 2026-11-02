// Layout QA, stage 2: the foundation. The stress family (long trunk and
// foundation, everything shown) in every foundation style and design, on A2.
import { describe } from "vitest";
import { SOIL_STYLE_ORDER } from "@/lib/layout/soil";
import { ENABLED, THEMES, caseTest } from "./run";

describe.skipIf(!ENABLED)("layout QA · foundation styles", () => {
  for (const style of SOIL_STYLE_ORDER) for (const theme of THEMES) caseTest("C", "all", theme, "A2", style);
});
