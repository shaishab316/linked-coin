"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SubmitButton, TextareaField } from "@/components/ui/form";
import type { FormState } from "@/lib/errors/app-error";

import { updateAccountAction } from "../actions";

export function AccountMetadataForm({
  accountId,
  name,
  description,
}: {
  accountId: string;
  name: string;
  description: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateAccountAction,
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

      <input type="hidden" name="accountId" value={accountId} />

      <FormField
        label="Name"
        name="name"
        defaultValue={name}
        maxLength={80}
        required
        error={state?.fieldErrors?.name?.[0]}
      />

      <TextareaField
        label="Description"
        name="description"
        defaultValue={description ?? ""}
        maxLength={280}
        error={state?.fieldErrors?.description?.[0]}
      />

      <SubmitButton pending={pending} variant="secondary">
        Save account
      </SubmitButton>

      <p className="text-xs text-ink-muted">
        Account type and currency cannot change once entries exist.
      </p>
    </form>
  );
}
