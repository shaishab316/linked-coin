import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tags, personTags, accountTags, type Tag, type TagType } from "../../db/schema";
import { AppError } from "../../lib/errors/app-error";
import {
  createTagSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from "./validation";

export interface TagTreeNode extends Tag {
  children: TagTreeNode[];
}

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function createTag(userId: string, input: CreateTagInput): Promise<Tag> {
  const parsed = createTagSchema.parse(input);
  const normalizedName = normalizeTagName(parsed.name);
  const tagType = parsed.tagType || "transaction";

  // Check unique normalized name within the same type
  const existing = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.normalizedName, normalizedName),
        eq(tags.tagType, tagType),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw AppError.conflict(`A ${tagType} tag named "${parsed.name}" already exists`);
  }

  // Validate parent if provided (parent must be of the same type)
  if (parsed.parentId) {
    const [parent] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          eq(tags.id, parsed.parentId),
          eq(tags.userId, userId),
          eq(tags.tagType, tagType),
        ),
      )
      .limit(1);

    if (!parent) {
      throw AppError.notFound("Parent tag not found (must be same type)");
    }
  }

  const [newTag] = await db
    .insert(tags)
    .values({
      userId,
      name: parsed.name.trim(),
      normalizedName,
      tagType,
      description: parsed.description || null,
      parentId: parsed.parentId || null,
    })
    .returning();

  return newTag;
}

/**
 * List tags filtered by type. Defaults to all types if not specified.
 */
export async function listTags(
  userId: string,
  includeArchived = false,
  tagType?: TagType,
): Promise<Tag[]> {
  const conditions = [eq(tags.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(tags.archivedAt));
  }
  if (tagType) {
    conditions.push(eq(tags.tagType, tagType));
  }

  return await db
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(tags.name);
}

export function buildTagTree(flatTags: Tag[]): TagTreeNode[] {
  const tagMap = new Map<string, TagTreeNode>();
  const roots: TagTreeNode[] = [];

  for (const t of flatTags) {
    tagMap.set(t.id, { ...t, children: [] });
  }

  for (const t of flatTags) {
    const node = tagMap.get(t.id)!;
    if (t.parentId && tagMap.has(t.parentId)) {
      tagMap.get(t.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function updateTag(
  userId: string,
  tagId: string,
  input: UpdateTagInput,
): Promise<Tag> {
  const parsed = updateTagSchema.parse(input);
  const normalizedName = normalizeTagName(parsed.name);

  // Prevent self as parent
  if (parsed.parentId === tagId) {
    throw AppError.validation("A tag cannot be its own parent");
  }

  const [updated] = await db
    .update(tags)
    .set({
      name: parsed.name.trim(),
      normalizedName,
      description: parsed.description || null,
      parentId: parsed.parentId || null,
      updatedAt: new Date(),
    })
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Tag not found");
  }

  return updated;
}

export async function archiveTag(userId: string, tagId: string): Promise<Tag> {
  const [updated] = await db
    .update(tags)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Tag not found");
  }

  return updated;
}

export async function restoreTag(userId: string, tagId: string): Promise<Tag> {
  const [updated] = await db
    .update(tags)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Tag not found");
  }

  return updated;
}

// ─── Person Tag Management ───────────────────────────────────────────

export async function getPersonTagIds(personId: string): Promise<string[]> {
  const rows = await db
    .select({ tagId: personTags.tagId })
    .from(personTags)
    .where(eq(personTags.personId, personId));
  return rows.map((r) => r.tagId);
}

export async function setPersonTags(personId: string, tagIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    // Remove all existing tags for this person
    await tx.delete(personTags).where(eq(personTags.personId, personId));
    // Insert new associations
    if (tagIds.length > 0) {
      await tx.insert(personTags).values(
        tagIds.map((tagId) => ({ personId, tagId })),
      );
    }
  });
}

export async function addPersonTag(personId: string, tagId: string): Promise<void> {
  await db
    .insert(personTags)
    .values({ personId, tagId })
    .onConflictDoNothing();
}

export async function removePersonTag(personId: string, tagId: string): Promise<void> {
  await db
    .delete(personTags)
    .where(and(eq(personTags.personId, personId), eq(personTags.tagId, tagId)));
}

// ─── Account Tag Management ─────────────────────────────────────────

export async function getAccountTagIds(accountId: string): Promise<string[]> {
  const rows = await db
    .select({ tagId: accountTags.tagId })
    .from(accountTags)
    .where(eq(accountTags.accountId, accountId));
  return rows.map((r) => r.tagId);
}

export async function setAccountTags(accountId: string, tagIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    // Remove all existing tags for this account
    await tx.delete(accountTags).where(eq(accountTags.accountId, accountId));
    // Insert new associations
    if (tagIds.length > 0) {
      await tx.insert(accountTags).values(
        tagIds.map((tagId) => ({ accountId, tagId })),
      );
    }
  });
}

export async function addAccountTag(accountId: string, tagId: string): Promise<void> {
  await db
    .insert(accountTags)
    .values({ accountId, tagId })
    .onConflictDoNothing();
}

export async function removeAccountTag(accountId: string, tagId: string): Promise<void> {
  await db
    .delete(accountTags)
    .where(and(eq(accountTags.accountId, accountId), eq(accountTags.tagId, tagId)));
}

export async function getPersonTags(personId: string): Promise<Tag[]> {
  const rows = await db
    .select({ tag: tags })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(eq(personTags.personId, personId));
  return rows.map((r) => r.tag);
}

export async function getAccountTags(accountId: string): Promise<Tag[]> {
  const rows = await db
    .select({ tag: tags })
    .from(accountTags)
    .innerJoin(tags, eq(accountTags.tagId, tags.id))
    .where(eq(accountTags.accountId, accountId));
  return rows.map((r) => r.tag);
}

