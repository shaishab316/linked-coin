"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SubmitButton } from "@/components/ui/form";

import { createAccountAction, type AccountActionState } from "../actions";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_VALUES } from "../validation";

export function CreateAccountForm() {
  const [state, formAction, pending] = useActionState<
    AccountActionState,
    FormData
  >(createAccountAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <FormAlert message={state.error} /> : null}

      <FormField
        label="Name"
        name="name"
        required
        maxLength={80}
        autoComplete="off"
        placeholder="Everyday wallet"
        error={state?.fieldErrors?.name?.[0]}
      />

      <div className="space-y-1.5">
        <label htmlFor="accountType" className="block text-sm font-medium text-ink">
          Type
        </label>
        <select
          id="accountType"
          name="accountType"
          defaultValue="cash"
          className="w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {ACCOUNT_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {ACCOUNT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.accountType?.[0] ? (
          <p className="text-xs text-danger">
            {state.fieldErrors.accountType[0]}
          </p>
        ) : null}
      </div>

      <FormField
        label="Currency"
        name="currency"
        required
        maxLength={3}
        defaultValue="BDT"
        autoComplete="off"
        hint="Three-letter ISO code."
        error={state?.fieldErrors?.currency?.[0]}
      />

      <FormField
        label="Description"
        name="description"
        maxLength={280}
        autoComplete="off"
        error={state?.fieldErrors?.description?.[0]}
      />

      <SubmitButton pending={pending}>Add account</SubmitButton>
    </form>
  );
}
