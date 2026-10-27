import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getCurrentUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-muted">
          Access your Linked Coin financial history.
        </p>
      </header>

      <SignInForm />

      <p className="text-sm text-ink-muted">
        Need an account?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
