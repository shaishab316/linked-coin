"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "../../../features/auth/actions";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await signUpAction(formData);

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">Create Account</h2>
      <p className="text-sm text-slate-400 mb-6">Start managing your personal finance with zero tracking and full data ownership.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="sign-up-form">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="At least 3 characters"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          id="btn-sign-up"
          className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-sm"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}
