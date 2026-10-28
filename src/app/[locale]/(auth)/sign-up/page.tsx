import React from "react";
import Link from "next/link";
import { isSignUpEnabled } from "../../../../lib/config/env";
import { SignUpForm } from "./sign-up-form";

interface SignUpPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocalizedSignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  const enabled = isSignUpEnabled();

  if (!enabled) {
    return (
      <div className="space-y-4 text-center py-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
          🔒
        </div>
        <h2 className="text-xl font-bold text-white">
          {locale === "bn" ? "নিবন্ধন বর্তমানে বন্ধ রয়েছে" : "Registration Disabled"}
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          {locale === "bn"
            ? "অ্যাডমিনিস্ট্রেটর নতুন ব্যবহারকারী নিবন্ধন বন্ধ রেখেছেন। অনুগ্রহ করে লগইন করুন।"
            : "New account registration is currently disabled by administrator."}
        </p>
        <div className="pt-2">
          <Link
            href={`/${locale}/sign-in`}
            className="inline-block py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
          >
            {locale === "bn" ? "লগইন পৃষ্ঠায় যান" : "Go to Sign In"}
          </Link>
        </div>
      </div>
    );
  }

  return <SignUpForm locale={locale} />;
}
