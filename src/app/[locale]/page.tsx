import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../features/auth/session";
import { getDictionary, type Locale } from "../../lib/i18n";
import { ShieldCheck, WifiOff, RefreshCw, Layers, ArrowRight } from "lucide-react";
import { isSignUpEnabled } from "../../lib/config/env";

interface LocaleHomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const user = await getSessionUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);
  const signupEnabled = isSignUpEnabled();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between z-10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <span className="font-black text-xl text-slate-950">৳</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {t.common.appName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/sign-in`}
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition"
          >
            {locale === "bn" ? "লগইন" : "Sign In"}
          </Link>
          {signupEnabled ? (
            <Link
              href={`/${locale}/sign-up`}
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              {locale === "bn" ? "নিবন্ধন করুন" : "Get Started"}
            </Link>
          ) : (
            <Link
              href={`/${locale}/sign-in`}
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              {locale === "bn" ? "লগইন করুন" : "Sign In"}
            </Link>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center z-10 my-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {locale === "bn" ? "সম্পূর্ণ অফলাইন ব্যক্তিগত আর্থিক খাতা" : "Offline-First Personal Finance & Ledger"}
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
          {locale === "bn" ? (
            <>
              আপনার সম্পূর্ণ টাকার নির্ভুল হিসাব,{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                অফলাইনে সম্পূর্ণ আপনার নিয়ন্ত্রণে।
              </span>
            </>
          ) : (
            <>
              Your complete financial history,{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                offline and fully owned.
              </span>
            </>
          )}
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t.common.tagline}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={`/${locale}/sign-up`}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>{locale === "bn" ? "হিসাব শুরু করুন" : "Start Tracking Free"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/${locale}/sign-in`}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base transition"
          >
            {locale === "bn" ? "পূর্বের অ্যাকাউন্ট লগইন" : "Sign In to Existing Wallet"}
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto text-left">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <WifiOff className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">
              {locale === "bn" ? "ইন্টারনেট ছাড়াই সচল" : "True Offline-First"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {locale === "bn"
                ? "কোনো ইন্টারনেট সংযোগ ছাড়াই হিসাব রাখুন। নেট পেলেই স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হয়ে যাবে।"
                : "Record transactions anywhere without network. Seamlessly syncs when you reconnect."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">
              {locale === "bn" ? "নির্ভুল ডাবল-এন্ট্রি হিসাব" : "Double-Entry Invariants"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {locale === "bn"
                ? "পয়সার নির্ভুল হিসাব। প্রতিটি আয়-ব্যয় ডাটাবেজ লেভেলে সুরক্ষিত থাকে।"
                : "Exact minor units, balanced debit/credit legs, and append-only event safety."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">
              {locale === "bn" ? "ধার-দেনা ও মানুষ" : "People & Debts"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {locale === "bn"
                ? "কার কাছে কত টাকা পাবেন অথবা কাকে কত দিতে হবে তা সাধারণ খরচের সঙ্গে না মিলিয়ে আলাদাভাবে ট্র্যাক করুন।"
                : "Track loans given and received without corrupting your income and spending reports."}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-slate-500">
        Linked Coin &bull; Built strictly according to DEVELOPER_GUIDE.md specifications.
      </footer>
    </div>
  );
}
