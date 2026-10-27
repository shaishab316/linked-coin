import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import { tags, type Tag } from "../../db/schema";
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

  // Check unique normalized name
  const existing = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.normalizedName, normalizedName)))
    .limit(1);

  if (existing.length > 0) {
    throw AppError.conflict(`A tag named "${parsed.name}" already exists`);
  }

  // Validate parent if provided
  if (parsed.parentId) {
    const [parent] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, parsed.parentId), eq(tags.userId, userId)))
      .limit(1);

    if (!parent) {
      throw AppError.notFound("Parent tag not found");
    }
  }

  const [newTag] = await db
    .insert(tags)
    .values({
      userId,
      name: parsed.name.trim(),
      normalizedName,
      description: parsed.description || null,
      parentId: parsed.parentId || null,
    })
    .returning();

  return newTag;
}

export async function listTags(userId: string, includeArchived = false): Promise<Tag[]> {
  const conditions = [eq(tags.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(tags.archivedAt));
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
