// A poster that follows the mother's line (MATRILINEAL) from a man: his
// children whose mothers are recorded belong to their mothers' lines, so
// they are not drawn from him (the stress test's 463-person family drew 1 to
// 6 people). The editor says so plainly when people are left off the poster
// (a family with no mothers recorded is still drawn whole). Which root or
// line to use instead is the owner's choice: nothing is changed for them.
import { lineRootOf } from "./genealogy";
import type { MemberDTO, TreeDTO } from "./types";

/** The poster's root when it is a man and the poster follows the mother's line; otherwise null. */
export function maleRootOfMothersLine(tree: Pick<TreeDTO, "lineage" | "members" | "rootMemberId">): MemberDTO | null {
  if (tree.lineage !== "MATRILINEAL") return null;
  const rootId = lineRootOf(tree.members, tree.lineage, tree.rootMemberId);
  const root = tree.members.find((m) => m.id === rootId);
  return root && root.gender === "MALE" ? root : null;
}
