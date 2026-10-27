"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SubmitButton } from "@/components/ui/form";

import { signUpAction, type AuthActionState } from "../actions";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signUpAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <FormAlert message={state.error} /> : null}

      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        required
        hint="3–32 characters: letters, numbers, and underscores."
        error={state?.fieldErrors?.username?.[0]}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state?.fieldErrors?.password?.[0]}
      />

      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
