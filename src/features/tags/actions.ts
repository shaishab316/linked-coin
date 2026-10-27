"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import {
  createTag,
  updateTag,
  archiveTag,
  restoreTag,
} from "./service";
import { createTagSchema, updateTagSchema } from "./validation";

export async function createTagAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const description = (formData.get("description") as string) || undefined;

  try {
    const input = createTagSchema.parse({ name, parentId, description });
    await createTag(user.id, input);
    revalidatePath("/tags");
    revalidatePath("/transactions/new");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to create tag" };
  }
}

export async function updateTagAction(tagId: string, formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const description = (formData.get("description") as string) || undefined;

  try {
    const input = updateTagSchema.parse({ name, parentId, description });
    await updateTag(user.id, tagId, input);
    revalidatePath("/tags");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update tag" };
  }
}

export async function archiveTagAction(tagId: string): Promise<void> {
  const user = await requireUser();
  await archiveTag(user.id, tagId);
  revalidatePath("/tags");
}

export async function restoreTagAction(tagId: string): Promise<void> {
  const user = await requireUser();
  await restoreTag(user.id, tagId);
  revalidatePath("/tags");
}
