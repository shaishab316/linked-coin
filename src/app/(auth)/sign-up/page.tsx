import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getCurrentUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-ink-muted">
          Your records stay private to this account.
        </p>
      </header>

      <SignUpForm />

      <p className="text-sm text-ink-muted">
        Already registered?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
