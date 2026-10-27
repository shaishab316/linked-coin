"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import { saveQuery, deleteSavedQuery, listSavedQueries } from "./service";
import { parseQueryString } from "./parser";
import { queryAstSchema } from "./validation";

export async function saveQueryAction(name: string, queryString: string) {
  const user = await requireUser();
  try {
    const rawAst = parseQueryString(queryString);
    const ast = queryAstSchema.parse(rawAst);
    const saved = await saveQuery(user.id, {
      name: name.trim() || "Untitled Search",
      queryAst: ast,
    });
    revalidatePath("/query");
    return { success: true, saved };
  } catch (err: any) {
    return { error: err?.message || "Failed to save query" };
  }
}

export async function deleteQueryAction(queryId: string) {
  const user = await requireUser();
  try {
    await deleteSavedQuery(user.id, queryId);
    revalidatePath("/query");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete query" };
  }
}

export async function getSavedQueriesAction() {
  const user = await requireUser();
  return listSavedQueries(user.id);
}
