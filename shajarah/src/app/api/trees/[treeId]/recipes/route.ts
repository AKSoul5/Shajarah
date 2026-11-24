import { z } from "zod";
import { handle, parseBody } from "@/lib/data/http";
import { saveRecipes } from "@/lib/data/treeService";
import { layoutRecipesSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

export const dynamic = "force-dynamic";

/** Keeps the recipes of the family's latest posters (see layout/recipes.ts); not an edit of the family. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => saveRecipes(params.treeId, (await parseBody(req, z.object({ recipes: layoutRecipesSchema }))).recipes));
