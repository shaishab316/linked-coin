"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../features/auth/actions";

interface NavigationProps {
  username: string;
}

export function Navigation({ username }: NavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Transactions", href: "/transactions", icon: "💸" },
    { label: "Accounts", href: "/accounts", icon: "🏦" },
    { label: "People & Debt", href: "/people", icon: "👥" },
    { label: "Tags", href: "/tags", icon: "🏷️" },
    { label: "Search & Queries", href: "/query", icon: "🔍" },
    { label: "Import / Export", href: "/data", icon: "💾" },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-[#090d16] flex flex-col justify-between h-screen sticky top-0 p-4 shrink-0">
      <div>
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <span className="font-black text-lg text-slate-950">৳</span>
          </div>
          <div>
            <div className="font-bold text-base leading-tight text-white">Linked Coin</div>
            <div className="text-[10px] text-emerald-400 font-medium">Offline-First Ledger</div>
          </div>
        </Link>

        {/* Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-link-${item.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="border-t border-white/5 pt-4 px-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
              {username.slice(0, 2)}
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate">{username}</div>
              <div className="text-[10px] text-slate-500">Connected</div>
            </div>
          </div>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            id="btn-sign-out"
            className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left flex items-center gap-2"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
