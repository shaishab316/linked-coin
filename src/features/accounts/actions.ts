"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { AppError, type FieldErrors, type FormState } from "@/lib/errors/app-error";

import {
  createAccountForUser,
  setAccountArchivedForUser,
  updateAccountMetadataForUser,
} from "./service";
import {
  archiveAccountSchema,
  createAccountSchema,
  updateAccountSchema,
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

  await setAccountArchivedForUser(
    getDb(),
    user.id,
    parsed.data.accountId,
    true,
  );

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${parsed.data.accountId}`);
}

export async function restoreAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = archiveAccountSchema.safeParse({
    accountId: formData.get("accountId") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  await setAccountArchivedForUser(
    getDb(),
    user.id,
    parsed.data.accountId,
    false,
  );

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${parsed.data.accountId}`);
}

export async function updateAccountAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = updateAccountSchema.safeParse({
    accountId: formData.get("accountId") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  const updated = await updateAccountMetadataForUser(
    getDb(),
    user.id,
    parsed.data.accountId,
    { name: parsed.data.name, description: parsed.data.description },
  );

  if (!updated) {
    return { error: "Account not found" };
  }

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${parsed.data.accountId}`);
  revalidatePath("/dashboard");

  return { success: "Account updated" };
}
