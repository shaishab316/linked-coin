"use server";

import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { AppError, type FieldErrors } from "@/lib/errors/app-error";

import { endSession, startSession } from "./session";
import { authenticateUser, registerUser } from "./service";
import { signInSchema, signUpSchema } from "./validation";

export type AuthActionState =
  | {
      error?: string;
      fieldErrors?: FieldErrors;
    }
  | undefined;

function readCredentials(formData: FormData): Record<string, FormDataEntryValue> {
  return {
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
  };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(readCredentials(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const user = await registerUser(getDb(), parsed.data);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }

    console.error("Sign-up failed", error);

    return { error: "Could not create your account. Please try again." };
  }

  redirect("/dashboard");
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(readCredentials(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const user = await authenticateUser(getDb(), parsed.data);

    if (!user) {
      return { error: "Incorrect username or password." };
    }

    await startSession(user.id);
  } catch (error) {
    console.error("Sign-in failed", error);

    return { error: "Could not sign you in. Please try again." };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<never> {
  await endSession();

  redirect("/sign-in");
}
