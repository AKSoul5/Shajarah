import { createHash } from "node:crypto";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { naturalFamily } from "@/lib/samples/natural";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { standIn } from "./standin";
const fams: [string, any][] = [["standin23", standIn(23)], ["standin7", standIn(7)], ["natural350", naturalFamily(350, 23)], ["kalali-filled", kalaliFilledTree()]];
for (const [name, tree] of fams) for (const paper of ["2A0"]) for (const mn of [false, true]) {
  const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper as any), showFemales: true, motherNames: mn });
  const h = createHash("sha1").update(JSON.stringify([l.nodes.map((n: any) => [n.id, n.x.toFixed(2), n.y.toFixed(2), n.fontSize.toFixed(3)]), l.edges.length])).digest("hex").slice(0, 10);
  console.log(name, paper, mn ? "spouses" : "plain", "problems", l.clarity.issues.length, "mm", l.legibility.smallestTextMm.toFixed(2), "holders", l.spouses.length, h);
}
