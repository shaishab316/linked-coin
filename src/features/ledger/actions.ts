"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/service";
import { createTransaction, reverseTransaction, updateTransaction } from "./service";
import {
  createTransactionSchema,
  reverseTransactionSchema,
  updateTransactionSchema,
} from "./validation";

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();

  const type = formData.get("type") as any;
  const amount = formData.get("amount") as string;
  const currency = formData.get("currency") as string;
  const description = formData.get("description") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const occurredAt = (formData.get("occurredAt") as string) || new Date().toISOString();
  const sourceAccountId = (formData.get("sourceAccountId") as string) || null;
  const destinationAccountId = (formData.get("destinationAccountId") as string) || null;
  const personId = (formData.get("personId") as string) || null;
  const linkedTransactionId = (formData.get("linkedTransactionId") as string) || null;
  const parentTransactionId =
    (formData.get("parentTransactionId") as string) ||
    (formData.get("addonsForId") as string) ||
    null;
  const tagIdsRaw = formData.getAll("tagIds") as string[];

  // Support addon transactions
  const addonsRaw = formData.get("addons") as string;
  let addons: any[] = [];
  if (addonsRaw) {
    try {
      addons = JSON.parse(addonsRaw);
    } catch {
      addons = [];
    }
  }

  try {
    const input = createTransactionSchema.parse({
      type,
      amount,
      currency,
      description,
      notes,
      occurredAt,
      sourceAccountId,
      destinationAccountId,
      personId,
      linkedTransactionId,
      parentTransactionId,
      tagIds: tagIdsRaw.filter(Boolean),
      addons,
    });

    const tx = await createTransaction(user.id, input);
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/people");
    return { success: true, transactionId: tx.id };
  } catch (err: any) {
    return { error: err?.message || "Failed to record transaction" };
  }
}

export async function updateTransactionAction(transactionId: string, formData: FormData) {
  const user = await requireUser();

  const description = (formData.get("description") as string) || undefined;
  const amount = (formData.get("amount") as string) || undefined;
  const notes = formData.get("notes") !== null ? (formData.get("notes") as string) : undefined;
  const occurredAt = (formData.get("occurredAt") as string) || undefined;
  const sourceAccountId = (formData.get("sourceAccountId") as string) || null;
  const destinationAccountId = (formData.get("destinationAccountId") as string) || null;
  const personId = (formData.get("personId") as string) || null;
  const tagIdsRaw = formData.getAll("tagIds") as string[];
  const confirmationCode = (formData.get("confirmationCode") as string) || "";
  const expectedCode = (formData.get("expectedCode") as string) || "";

  try {
    const input = updateTransactionSchema.parse({
      description,
      amount,
      notes,
      occurredAt,
      sourceAccountId,
      destinationAccountId,
      personId,
      tagIds: tagIdsRaw.length > 0 ? tagIdsRaw.filter(Boolean) : undefined,
      confirmationCode,
      expectedCode,
    });

    await updateTransaction(user.id, transactionId, {
      description: input.description,
      amount: input.amount,
      notes: input.notes,
      occurredAt: input.occurredAt,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      personId: input.personId,
      tagIds: input.tagIds,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/people");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update transaction" };
  }
}

export async function reverseTransactionAction(transactionId: string, formData: FormData) {
  const user = await requireUser();
  const reason = formData.get("reason") as string;

  try {
    const input = reverseTransactionSchema.parse({ reason });
    await reverseTransaction(user.id, transactionId, input);
    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/people");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to reverse transaction" };
  }
}
