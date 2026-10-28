"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../features/auth/actions";
import { useI18n } from "../lib/i18n/context";
import { Globe, Menu, X, PlusCircle } from "lucide-react";

interface NavigationProps {
  username: string;
}

export function Navigation({ username }: NavigationProps) {
  const pathname = usePathname();
  const { locale, t, setLocale } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (username && typeof window !== "undefined") {
      try {
        localStorage.setItem("linked_coin_username", username);
      } catch {}
    }
  }, [username]);

  const displayUsername =
    username ||
    (typeof window !== "undefined"
      ? localStorage.getItem("linked_coin_username") || "User"
      : "User");

  const navItems = [
    { label: t.nav.dashboard, href: `/${locale}/dashboard`, rawHref: "/dashboard", icon: "📊" },
    { label: t.nav.transactions, href: `/${locale}/transactions`, rawHref: "/transactions", icon: "💸" },
    { label: t.nav.accounts, href: `/${locale}/accounts`, rawHref: "/accounts", icon: "🏦" },
    { label: t.nav.people, href: `/${locale}/people`, rawHref: "/people", icon: "👥" },
    { label: t.nav.tags, href: `/${locale}/tags`, rawHref: "/tags", icon: "🏷️" },
    { label: t.nav.query, href: `/${locale}/query`, rawHref: "/query", icon: "🔍" },
    { label: t.nav.data, href: `/${locale}/data`, rawHref: "/data", icon: "💾" },
  ];

  const toggleLanguage = () => {
    const nextLocale = locale === "en" ? "bn" : "en";
    setLocale(nextLocale);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#090d16]/95 px-4 py-3 backdrop-blur-md">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-emerald-500/20">
            ৳
          </div>
          <span className="font-bold text-white text-sm">{t.common.appName}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span>{locale === "en" ? "বাংলা" : "English"}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 z-30 bg-[#090d16]/95 p-4 backdrop-blur-xl border-b border-slate-800 flex flex-col justify-between">
          <nav className="space-y-1">
            <Link
              href={`/${locale}/transactions/new`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 mb-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t.nav.newTransaction}</span>
            </Link>

            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.includes(item.rawHref);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
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

          <div className="border-t border-slate-800 pt-3">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full py-2.5 px-3 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-xl transition text-center"
              >
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#090d16] flex-col justify-between h-screen sticky top-0 p-4 shrink-0">
        <div>
          {/* Brand */}
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
              <span className="font-black text-lg text-slate-950">৳</span>
            </div>
            <div>
              <div className="font-bold text-base leading-tight text-white">{t.common.appName}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Offline Ledger</div>
            </div>
          </Link>

          {/* Quick Add Button */}
          <div className="px-1 mb-4">
            <Link
              href={`/${locale}/transactions/new`}
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t.nav.newTransaction}</span>
            </Link>
          </div>

          {/* Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.rawHref !== "/dashboard" && pathname.includes(item.rawHref));
              return (
                <Link
                  key={item.href}
                  href={item.href}
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

        {/* User profile, Language Switcher & Logout */}
        <div className="border-t border-white/5 pt-4 px-2 space-y-3">
          {/* Language Switcher Pill */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>{locale === "en" ? "Language" : "ভাষা"}</span>
            </div>
            <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              {locale === "en" ? "🇬🇧 English" : "🇧🇩 বাংলা"}
            </span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
                {displayUsername.slice(0, 2)}
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold text-white truncate">{displayUsername}</div>
                <div className="text-[10px] text-slate-500">Connected</div>
              </div>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              id="btn-sign-out"
              className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left flex items-center gap-2 cursor-pointer"
            >
              <span>🚪</span>
              <span>{t.nav.signOut}</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
