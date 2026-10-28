"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import { updateUserProfile } from "./service";

export async function updateUserProfileAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const timezone = formData.get("timezone") as string;

  try {
    const updated = await updateUserProfile(user.id, {
      name: name !== undefined ? name : undefined,
      timezone: timezone !== undefined ? timezone : undefined,
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/people");

    return { success: true, user: updated };
  } catch (err: any) {
    return { error: err?.message || "Failed to update profile" };
  }
}
