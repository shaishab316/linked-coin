"use client";

import { useActionState } from "react";

import {
  FormAlert,
  FormField,
  SubmitButton,
  TextareaField,
} from "@/components/ui/form";
import type { FormState } from "@/lib/errors/app-error";

import { updateTransactionMetadataAction } from "../actions";

export function TransactionMetadataForm({
  transactionId,
  description,
  notes,
}: {
  transactionId: string;
  description: string;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateTransactionMetadataAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <FormAlert message={state.error} /> : null}
      {state?.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <input type="hidden" name="transactionId" value={transactionId} />

      <FormField
        label="Description"
        name="description"
        defaultValue={description}
        maxLength={200}
        required
        error={state?.fieldErrors?.description?.[0]}
      />

      <TextareaField
        label="Notes"
        name="notes"
        defaultValue={notes ?? ""}
        maxLength={1000}
        error={state?.fieldErrors?.notes?.[0]}
      />

      <SubmitButton pending={pending} variant="secondary">
        Update details
      </SubmitButton>

      <p className="text-xs text-ink-muted">
        Amounts, accounts, dates, and ledger entries are immutable.
      </p>
    </form>
  );
}
