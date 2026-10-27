import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { tags } from "@/db/schema";
import { AppError, isUniqueViolation } from "@/lib/errors/app-error";

import type { CreateTagInput } from "./validation";

export type TagRecord = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  archivedAt: Date | null;
};

const tagColumns = {
  id: tags.id,
  name: tags.name,
  description: tags.description,
  parentId: tags.parentId,
  createdAt: tags.createdAt,
  archivedAt: tags.archivedAt,
};

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

export async function listTagsForUser(
  db: Database,
  userId: string,
): Promise<TagRecord[]> {
  return db
    .select(tagColumns)
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.archivedAt), asc(tags.name));
}

export async function createTagForUser(
  db: Database,
  userId: string,
  input: CreateTagInput,
): Promise<TagRecord> {
  if (input.parentId) {
    const [parent] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, input.parentId), eq(tags.userId, userId)))
      .limit(1);

    if (!parent) {
      throw new AppError("NOT_FOUND", "Parent tag not found");
    }
  }

  try {
    const [tag] = await db
      .insert(tags)
      .values({
        userId,
        name: input.name,
        normalizedName: normalizeTagName(input.name),
        description: input.description,
        parentId: input.parentId,
      })
      .returning(tagColumns);

    if (!tag) {
      throw new AppError("INTERNAL", "Could not create the tag");
    }

    return tag;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", "A tag with that name already exists", {
        fieldErrors: { name: ["A tag with that name already exists"] },
      });
    }

    throw error;
  }
}

export async function setTagArchivedForUser(
  db: Database,
  userId: string,
  tagId: string,
  archived: boolean,
): Promise<boolean> {
  const rows = await db
    .update(tags)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning({ id: tags.id });

  return rows.length > 0;
}
