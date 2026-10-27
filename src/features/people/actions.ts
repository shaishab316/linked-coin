"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { AppError, type FieldErrors, type FormState } from "@/lib/errors/app-error";

import { createPersonForUser, setPersonArchivedForUser } from "./service";
import { createPersonSchema, setPersonArchivedSchema } from "./validation";

export async function createPersonAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createPersonSchema.safeParse({
    name: formData.get("name") ?? "",
    contact: formData.get("contact") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  try {
    await createPersonForUser(getDb(), user.id, parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }

    console.error("Person creation failed", error);

    return { error: "Could not add the person. Please try again." };
  }

  revalidatePath("/people");

  return { success: `${parsed.data.name} added` };
}

export async function setPersonArchivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = setPersonArchivedSchema.safeParse({
    personId: formData.get("personId") ?? "",
    archived: formData.get("archived") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  await setPersonArchivedForUser(
    getDb(),
    user.id,
    parsed.data.personId,
    parsed.data.archived === "true",
  );

  revalidatePath("/people");
}
