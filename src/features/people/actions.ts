"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import {
  createPerson,
  updatePerson,
  archivePerson,
  restorePerson,
} from "./service";
import { createPersonSchema, updatePersonSchema } from "./validation";

export async function createPersonAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const contact = (formData.get("contact") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;

  try {
    const input = createPersonSchema.parse({ name, contact, notes });
    await createPerson(user.id, input);
    revalidatePath("/people");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to create person" };
  }
}

export async function updatePersonAction(personId: string, formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const contact = (formData.get("contact") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;

  try {
    const input = updatePersonSchema.parse({ name, contact, notes });
    await updatePerson(user.id, personId, input);
    revalidatePath(`/people/${personId}`);
    revalidatePath("/people");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update person" };
  }
}

export async function archivePersonAction(personId: string): Promise<void> {
  const user = await requireUser();
  await archivePerson(user.id, personId);
  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  revalidatePath("/dashboard");
}

export async function restorePersonAction(personId: string): Promise<void> {
  const user = await requireUser();
  await restorePerson(user.id, personId);
  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  revalidatePath("/dashboard");
}
