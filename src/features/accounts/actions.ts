"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import {
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
} from "./service";
import { createAccountSchema, updateAccountSchema } from "./validation";

export async function createAccountAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const accountType = formData.get("accountType") as any;
  const currency = formData.get("currency") as string;
  const initialBalance = (formData.get("initialBalance") as string) || "0";
  const description = (formData.get("description") as string) || undefined;

  try {
    const input = createAccountSchema.parse({
      name,
      accountType,
      currency,
      initialBalance,
      description,
    });
    await createAccount(user.id, input);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to create account" };
  }
}

export async function updateAccountAction(accountId: string, formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;

  try {
    const input = updateAccountSchema.parse({ name, description });
    await updateAccount(user.id, accountId, input);
    revalidatePath(`/accounts/${accountId}`);
    revalidatePath("/accounts");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update account" };
  }
}

export async function archiveAccountAction(accountId: string): Promise<void> {
  const user = await requireUser();
  await archiveAccount(user.id, accountId);
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function restoreAccountAction(accountId: string): Promise<void> {
  const user = await requireUser();
  await restoreAccount(user.id, accountId);
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
