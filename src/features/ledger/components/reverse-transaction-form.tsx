"use client";

import { useActionState } from "react";

import { FormAlert, SubmitButton, TextareaField } from "@/components/ui/form";
import type { FormState } from "@/lib/errors/app-error";

import { reverseTransactionAction } from "../actions";

export function ReverseTransactionForm({
  transactionId,
  idempotencyKey,
}: {
  transactionId: string;
  idempotencyKey: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    reverseTransactionAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <FormAlert message={state.error} /> : null}

      <input type="hidden" name="transactionId" value={transactionId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <TextareaField
        label="Reason (optional)"
        name="reason"
        maxLength={500}
        placeholder="Wrong amount, duplicate entry, …"
      />

      <p className="text-xs text-ink-muted">
        Reversing appends a compensating transaction. The original stays in the
        ledger and both remain linked.
      </p>

      <SubmitButton pending={pending} variant="secondary">
        Reverse transaction
      </SubmitButton>
    </form>
  );
}
