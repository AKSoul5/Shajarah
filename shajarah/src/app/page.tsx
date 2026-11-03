import { listTrees } from "@/lib/data/treeService";
import type { TreeSummary } from "@/lib/types";
import { HomeView } from "./HomeView";

export const dynamic = "force-dynamic";

/** The start page: the families on this computer, read here; shown by HomeView. */
export default async function Home() {
  let trees: TreeSummary[] = [];
  let dbError: string | null = null;
  try {
    trees = await listTrees();
  } catch (e) {
    dbError = e instanceof Error ? e.message.split("\n").slice(-1)[0] : "Database unavailable";
  }
  return <HomeView trees={trees} dbError={dbError} />;
}
