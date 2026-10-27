import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <span className="font-black text-xl text-slate-950">৳</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Linked Coin</span>
          </Link>
          <p className="text-xs text-slate-400 mt-2">
            Offline-first personal finance with double-entry precision.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
