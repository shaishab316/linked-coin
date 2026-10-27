"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { AppError, type FieldErrors, type FormState } from "@/lib/errors/app-error";

import { createTagForUser, setTagArchivedForUser } from "./service";
import { createTagSchema, setTagArchivedSchema } from "./validation";

export async function createTagAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createTagSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    parentId: formData.get("parentId") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  try {
    await createTagForUser(getDb(), user.id, parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }

    console.error("Tag creation failed", error);

    return { error: "Could not create the tag. Please try again." };
  }

  revalidatePath("/tags");

  return { success: `Tag "${parsed.data.name}" created` };
}

export async function setTagArchivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = setTagArchivedSchema.safeParse({
    tagId: formData.get("tagId") ?? "",
    archived: formData.get("archived") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  await setTagArchivedForUser(
    getDb(),
    user.id,
    parsed.data.tagId,
    parsed.data.archived === "true",
  );

  revalidatePath("/tags");
}
