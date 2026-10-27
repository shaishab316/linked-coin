import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { savedQueries, type SavedQuery } from "../../db/schema";
import { AppError } from "../../lib/errors/app-error";
import { queryAstSchema, saveQuerySchema, type ValidatedQueryAst, type SaveQueryInput } from "./validation";
import { executeTransactionQuery, type PaginatedQueryResult } from "./compiler";

export async function searchTransactions(
  userId: string,
  rawAst: unknown,
): Promise<PaginatedQueryResult> {
  const ast = queryAstSchema.parse(rawAst || {});
  return executeTransactionQuery(userId, ast);
}

export async function saveQuery(userId: string, input: SaveQueryInput): Promise<SavedQuery> {
  const parsed = saveQuerySchema.parse(input);

  const [saved] = await db
    .insert(savedQueries)
    .values({
      userId,
      name: parsed.name,
      queryAst: parsed.queryAst,
    })
    .returning();

  return saved;
}

export async function listSavedQueries(userId: string): Promise<SavedQuery[]> {
  return await db
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.userId, userId))
    .orderBy(savedQueries.name);
}

export async function deleteSavedQuery(userId: string, queryId: string): Promise<void> {
  const [deleted] = await db
    .delete(savedQueries)
    .where(and(eq(savedQueries.id, queryId), eq(savedQueries.userId, userId)))
    .returning();

  if (!deleted) {
    throw AppError.notFound("Saved query not found");
  }
}
