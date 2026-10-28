"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signInAction } from "../../../../features/auth/actions";
import { useI18n } from "../../../../lib/i18n/context";

export function SignInForm({
  locale,
  signupEnabled = true,
}: {
  locale: string;
  signupEnabled?: boolean;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await signInAction(formData);

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">
        {locale === "bn" ? "স্বাগতম — লগইন করুন" : "Welcome Back"}
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        {locale === "bn"
          ? "আপনার অফলাইন হিসাব খাতায় প্রবেশ করতে ইউজারনেম ও পাসওয়ার্ড দিন।"
          : "Enter your username and password to access your offline-synced wallet."}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="sign-in-form">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="username">
            {locale === "bn" ? "ইউজারনেম (Username)" : "Username"}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="e.g. shaishab"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="password">
            {locale === "bn" ? "পাসওয়ার্ড (Password)" : "Password"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
          />
        </div>

        <button
          type="submit"
          id="btn-submit-sign-in"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          {isLoading ? t.common.loading : locale === "bn" ? "লগইন করুন" : "Sign In"}
        </button>
      </form>

      {signupEnabled && (
        <div className="mt-6 text-center text-xs text-slate-400">
          {locale === "bn" ? "অ্যাকাউন্ট নেই? " : "Don't have an account? "}
          <Link href={`/${locale}/sign-up`} className="text-emerald-400 font-semibold hover:underline">
            {locale === "bn" ? "নতুন অ্যাকাউন্ট খুলুন" : "Create one now"}
          </Link>
        </div>
      )}
    </div>
  );
}
