"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { AppError, type FieldErrors } from "@/lib/errors/app-error";

import { archiveAccountForUser, createAccountForUser } from "./service";
import {
  archiveAccountSchema,
  createAccountSchema,
} from "./validation";

export type AccountActionState =
  | {
      error?: string;
      fieldErrors?: FieldErrors;
    }
  | undefined;

export async function createAccountAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();

  const parsed = createAccountSchema.safeParse({
    name: formData.get("name") ?? "",
    accountType: formData.get("accountType") ?? "",
    currency: formData.get("currency") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  try {
    await createAccountForUser(getDb(), user.id, parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }

    console.error("Account creation failed", error);

    return { error: "Could not create the account. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function archiveAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = archiveAccountSchema.safeParse({
    accountId: formData.get("accountId") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  await archiveAccountForUser(getDb(), user.id, parsed.data.accountId);

  revalidatePath("/dashboard");
}
