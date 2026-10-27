"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SubmitButton, TextareaField } from "@/components/ui/form";
import type { FormState } from "@/lib/errors/app-error";

import { createPersonAction } from "../actions";

export function CreatePersonForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPersonAction,
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

      <FormField
        label="Name"
        name="name"
        required
        maxLength={80}
        autoComplete="off"
        error={state?.fieldErrors?.name?.[0]}
      />

      <FormField
        label="Contact (optional)"
        name="contact"
        maxLength={120}
        autoComplete="off"
        error={state?.fieldErrors?.contact?.[0]}
      />

      <TextareaField
        label="Notes (optional)"
        name="notes"
        maxLength={500}
        error={state?.fieldErrors?.notes?.[0]}
      />

      <SubmitButton pending={pending}>Add person</SubmitButton>
    </form>
  );
}
