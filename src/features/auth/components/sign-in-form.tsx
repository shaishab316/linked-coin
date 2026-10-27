"use client";

import { useActionState } from "react";

import { FormAlert, FormField, SubmitButton } from "@/components/ui/form";

import { signInAction, type AuthActionState } from "../actions";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signInAction,
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
        error={state?.fieldErrors?.username?.[0]}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password?.[0]}
      />

      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
