"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localDb } from "../../offline/database";
import { syncEngine } from "../../offline/sync-engine";
import {
  WifiOff,
  RefreshCw,
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Wallet,
  Users,
  Tags,
  Search,
  Database,
  ArrowRight,
} from "lucide-react";

export default function OfflineFallbackPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);

    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      if (localDb) {
        try {
          const count = await localDb.outbox.where("status").equals("pending").count();
          setPendingCount(count);
        } catch {
          // ignore
        }
      }
    };

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    const unsubscribe = syncEngine.subscribe((status) => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
    });

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const navLinks = [
    { label: "Dashboard", href: "/en/dashboard", icon: LayoutDashboard, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Transactions", href: "/en/transactions", icon: Receipt, color: "text-cyan-400 bg-cyan-500/10" },
    { label: "New Transaction", href: "/en/transactions/new", icon: PlusCircle, color: "text-amber-400 bg-amber-500/10" },
    { label: "Accounts", href: "/en/accounts", icon: Wallet, color: "text-sky-400 bg-sky-500/10" },
    { label: "People & Loans", href: "/en/people", icon: Users, color: "text-purple-400 bg-purple-500/10" },
    { label: "Tags & Categories", href: "/en/tags", icon: Tags, color: "text-pink-400 bg-pink-500/10" },
    { label: "Query Builder", href: "/en/query", icon: Search, color: "text-indigo-400 bg-indigo-500/10" },
    { label: "Data & Backup", href: "/en/data", icon: Database, color: "text-slate-400 bg-slate-800" },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-8 flex flex-col justify-center items-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Status Hero Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <WifiOff className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <span>Offline Mode Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Linked Coin is Fully Functional Offline
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Your financial records are stored securely on this device. You can browse cached
              pages, create transactions with add-ons, and all changes will automatically sync
              when connection is restored.
            </p>
          </div>

          {/* Outbox Queue Pill */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-left">
            <div>
              <div className="text-xs font-semibold text-slate-300">
                Pending Local Outbox
              </div>
              <div className="text-xs text-slate-500">
                {pendingCount > 0
                  ? `${pendingCount} transaction(s) queued for sync`
                  : "All local changes are up-to-date"}
              </div>
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-white/10 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
              <span>{isOnline ? (isSyncing ? "Syncing..." : "Sync Now") : "Waiting for Network..."}</span>
            </button>
          </div>
        </div>

        {/* Quick Access to Cached App Pages */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
            Available Cached Pages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">
                      {item.label}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
