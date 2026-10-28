"use server";

import { redirect } from "next/navigation";
import { signUp, signIn, signOut } from "./service";
import { signUpSchema, signInSchema } from "./validation";
import { isSignUpEnabled } from "../../lib/config/env";

export async function signUpAction(formData: FormData) {
  if (!isSignUpEnabled()) {
    return { error: "New user registration is currently disabled." };
  }

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const input = signUpSchema.parse({ username, password });
    await signUp(input);
  } catch (err: any) {
    return { error: err?.message || "Failed to sign up" };
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const input = signInSchema.parse({ username, password });
    await signIn(input);
  } catch (err: any) {
    return { error: err?.message || "Failed to sign in" };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}
