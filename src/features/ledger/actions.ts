"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { ledgerTransactions } from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { AppError, type FieldErrors, type FormState } from "@/lib/errors/app-error";

import {
  postLedgerCommand,
  reverseLedgerTransaction,
} from "./service";
import { ledgerCommandSchema, reversalSchema } from "./validation";

function readTransactionForm(formData: FormData): Record<string, unknown> {
  const optional = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  return {
    type: formData.get("type"),
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
    currency: formData.get("currency") ?? "",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    accountId: optional("accountId"),
    fromAccountId: optional("fromAccountId"),
    toAccountId: optional("toAccountId"),
    personId: optional("personId"),
    loanTransactionId: optional("loanTransactionId"),
    idempotencyKey: formData.get("idempotencyKey"),
    tagIds: formData
      .getAll("tagIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  };
}

export async function createTransactionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = ledgerCommandSchema.safeParse(readTransactionForm(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  let transactionId: string;

  try {
    const result = await postLedgerCommand(getDb(), user.id, parsed.data);
    transactionId = result.transactionId;
  } catch (error) {
    if (error instanceof AppError) {
      return {
        error: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    console.error("Ledger command failed", error);

    return { error: "Could not record the transaction. Please try again." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect(`/transactions/${transactionId}`);
}

const updateMetadataSchema = z.object({
  transactionId: z.uuid(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description must be at most 200 characters long"),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value.length > 0 ? value : null)),
});

/** Only descriptive metadata may change; amounts and entries are immutable. */
export async function updateTransactionMetadataAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateMetadataSchema.safeParse({
    transactionId: formData.get("transactionId") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  const rows = await getDb()
    .update(ledgerTransactions)
    .set({
      description: parsed.data.description,
      notes: parsed.data.notes,
    })
    .where(
      and(
        eq(ledgerTransactions.id, parsed.data.transactionId),
        eq(ledgerTransactions.userId, user.id),
      ),
    )
    .returning({ id: ledgerTransactions.id });

  if (rows.length === 0) {
    return { error: "Transaction not found" };
  }

  revalidatePath(`/transactions/${parsed.data.transactionId}`);
  revalidatePath("/transactions");

  return { success: "Transaction details updated" };
}

export async function reverseTransactionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = reversalSchema.safeParse({
    transactionId: formData.get("transactionId") ?? "",
    idempotencyKey: formData.get("idempotencyKey") ?? "",
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  let reversalId: string;

  try {
    const result = await reverseLedgerTransaction(
      getDb(),
      user.id,
      parsed.data,
    );
    reversalId = result.transactionId;
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }

    console.error("Reversal failed", error);

    return { error: "Could not reverse the transaction. Please try again." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath(`/transactions/${parsed.data.transactionId}`);
  redirect(`/transactions/${reversalId}`);
}
