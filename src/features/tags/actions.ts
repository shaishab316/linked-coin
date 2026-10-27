"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import {
  createTag,
  updateTag,
  archiveTag,
  restoreTag,
  setPersonTags,
  setAccountTags,
  addPersonTag,
  removePersonTag,
  addAccountTag,
  removeAccountTag,
} from "./service";
import { createTagSchema, updateTagSchema } from "./validation";

export async function createTagAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const tagType = (formData.get("tagType") as string) || "transaction";
  const parentId = (formData.get("parentId") as string) || null;
  const description = (formData.get("description") as string) || undefined;

  try {
    const input = createTagSchema.parse({ name, tagType, parentId, description });
    await createTag(user.id, input);
    revalidatePath("/tags");
    revalidatePath("/transactions/new");
    revalidatePath("/people");
    revalidatePath("/accounts");
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

// ─── Person Tag Actions ─────────────────────────────────────────────

export async function setPersonTagsAction(personId: string, tagIds: string[]) {
  await requireUser();
  try {
    await setPersonTags(personId, tagIds);
    revalidatePath("/people");
    revalidatePath(`/people/${personId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update person tags" };
  }
}

export async function togglePersonTagAction(personId: string, tagId: string, add: boolean) {
  await requireUser();
  try {
    if (add) {
      await addPersonTag(personId, tagId);
    } else {
      await removePersonTag(personId, tagId);
    }
    revalidatePath("/people");
    revalidatePath(`/people/${personId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to toggle person tag" };
  }
}

// ─── Account Tag Actions ────────────────────────────────────────────

export async function setAccountTagsAction(accountId: string, tagIds: string[]) {
  await requireUser();
  try {
    await setAccountTags(accountId, tagIds);
    revalidatePath("/accounts");
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update account tags" };
  }
}

export async function toggleAccountTagAction(accountId: string, tagId: string, add: boolean) {
  await requireUser();
  try {
    if (add) {
      await addAccountTag(accountId, tagId);
    } else {
      await removeAccountTag(accountId, tagId);
    }
    revalidatePath("/accounts");
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to toggle account tag" };
  }
}
