"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import type { FormState } from "@/lib/errors/app-error";

import { createTagAction } from "../actions";

export function CreateTagForm({
  parentOptions,
}: {
  parentOptions: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTagAction,
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
        maxLength={40}
        autoComplete="off"
        placeholder="Food"
        error={state?.fieldErrors?.name?.[0]}
      />

      <SelectField
        label="Parent tag (optional)"
        name="parentId"
        error={state?.fieldErrors?.parentId?.[0]}
      >
        <option value="">Top level</option>
        {parentOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </SelectField>

      <TextareaField
        label="Description (optional)"
        name="description"
        maxLength={200}
        error={state?.fieldErrors?.description?.[0]}
      />

      <SubmitButton pending={pending}>Create tag</SubmitButton>
    </form>
  );
}
