import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../features/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between z-10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <span className="font-black text-xl text-slate-950">৳</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Linked Coin
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition"
            id="nav-sign-in"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-emerald-500/25"
            id="nav-sign-up"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center z-10 my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Offline-First Personal Finance & Ledger
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
          Your complete financial history,{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            offline and fully owned.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Record expenses, transfers, loans, and repayments anywhere without internet. Built on an
          authoritative double-entry ledger that never loses or silently alters a financial event.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base transition shadow-xl shadow-emerald-500/25"
            id="hero-get-started"
          >
            Create Free Account
          </Link>
          <Link
            href="/sign-in"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-200 font-medium text-base transition"
            id="hero-sign-in"
          >
            Open Existing Wallet
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Double-Entry Ledger</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Exact minor-unit integer arithmetic (`bigint`). Every transaction is balanced and verified by database triggers.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Offline Outbox & Dexie</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Full offline capability with IndexedDB. Write offline, reconnect, and push changes with automatic server cursors and idempotency.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">People & Debt Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Distinguish owned money from receivables and payables. Track partial loan repayments without inflating income or expenses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-slate-500">
        Linked Coin — Privacy First, Data Ownership, Zero Floating-Point Rounding.
      </footer>
    </div>
  );
}
