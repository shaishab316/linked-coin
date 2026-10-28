"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ShieldCheck,
  Printer,
  Sparkles,
  Layers,
  CornerDownRight,
  HandCoins,
  Receipt,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatLocalizedAmount } from "../../../lib/i18n";
import type { SharedTransactionItem } from "../share-service";

interface SharedStatementExplorerProps {
  person: {
    id: string;
    name: string;
    contact?: string | null;
    notes?: string | null;
    outstandingMinor: bigint;
  };
  owner: {
    username: string;
    name?: string | null;
  };
  link: {
    token: string;
    label?: string | null;
    expiresAt?: string | null;
    createdAt?: string;
  };
  transactions: SharedTransactionItem[];
  currency?: string;
  locale?: string;
}

export function SharedStatementExplorer({
  person,
  owner,
  link,
  transactions,
  currency = "BDT",
  locale = "en",
}: SharedStatementExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "loan" | "repayment">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Filter by transaction type
    if (filterType === "loan") {
      result = result.filter(
        (t) => t.type === "loan_given" || t.type === "loan_received",
      );
    } else if (filterType === "repayment") {
      result = result.filter(
        (t) => t.type === "repayment_received" || t.type === "repayment_made",
      );
    }

    // 2. Filter by search text
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((t) => {
        const descMatch = t.description.toLowerCase().includes(q);
        const notesMatch = t.notes?.toLowerCase().includes(q);
        const tagsMatch = t.tags.some((tag) => tag.name.toLowerCase().includes(q));
        const amountMatch = (Number(t.amountMinor) / 100).toString().includes(q);
        const addonMatch = t.addons?.some(
          (a) =>
            a.description.toLowerCase().includes(q) ||
            (Number(a.amountMinor) / 100).toString().includes(q),
        );
        return descMatch || notesMatch || tagsMatch || amountMatch || addonMatch;
      });
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      }
      if (sortBy === "amount_desc") {
        return Number(b.amountMinor - a.amountMinor);
      }
      if (sortBy === "amount_asc") {
        return Number(a.amountMinor - b.amountMinor);
      }
      return 0;
    });

    return result;
  }, [transactions, filterType, searchTerm, sortBy]);

  // Group filtered transactions by Date
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; displayDate: string; items: SharedTransactionItem[] }[] = [];
    const map = new Map<string, SharedTransactionItem[]>();

    for (const tx of filteredTransactions) {
      const d = new Date(tx.occurredAt);
      const dateKey = d.toISOString().slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(tx);
    }

    for (const [dateKey, items] of map.entries()) {
      const d = new Date(dateKey);
      const displayDate = d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      groups.push({ dateKey, displayDate, items });
    }

    return groups;
  }, [filteredTransactions, locale]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalLoanGiven = 0n;
    let totalRepayments = 0n;

    for (const tx of transactions) {
      if (tx.type === "loan_given") {
        totalLoanGiven += tx.amountMinor;
      } else if (tx.type === "repayment_received") {
        totalRepayments += tx.amountMinor;
      }
    }

    return { totalLoanGiven, totalRepayments };
  }, [transactions]);

  const ownerDisplayName =
    owner.name?.trim() ? owner.name.trim() : owner.username ? `@${owner.username}` : "Owner";

  const hasDebt = person.outstandingMinor !== 0n;
  const owesOwner = person.outstandingMinor > 0n;
  const absOutstandingMinor =
    person.outstandingMinor < 0n ? -person.outstandingMinor : person.outstandingMinor;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500/30 print:bg-white print:text-black print:p-0 print:m-0 print:min-h-0">
      {/* Global Print Override Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                margin: 15mm;
                size: auto;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden print:hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10 print:max-w-none print:m-0 print:p-0 print:space-y-4">
        {/* Print-Only Minimal Header */}
        <div className="hidden print:block pt-2 pb-4 mb-4 border-b border-black">
          <h1 className="text-2xl font-bold text-black tracking-tight">{person.name}</h1>
          <p className="text-xs text-gray-700 mt-0.5 font-medium">
            Ledger shared by {ownerDisplayName}
          </p>
        </div>

        {/* Top Minimal Brand Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black text-sm shadow-md shadow-cyan-950/40">
              LC
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-200">Linked Coin</span>
              <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Shared Statement
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verified Ledger</span>
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-300" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Person & Owner Financial Summary */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Person & Owner Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 text-slate-100 font-black text-xl shadow-inner">
                {person.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-100">{person.name}</h1>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Ledger shared by <strong className="text-slate-300 font-semibold">{ownerDisplayName}</strong></span>
                </p>
                {link.label && (
                  <p className="text-[11px] text-cyan-400/90 font-medium mt-0.5">
                    &bull; Note: &quot;{link.label}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Net Outstanding Balance Badge */}
            <div className="sm:text-right bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl sm:min-w-[220px]">
              <span className="text-xs font-medium text-slate-400 block">
                {!hasDebt
                  ? "Net Balance"
                  : owesOwner
                  ? `${person.name} Owes ${ownerDisplayName}`
                  : `${ownerDisplayName} Owes ${person.name}`}
              </span>
              <span
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  !hasDebt ? "text-slate-400" : owesOwner ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatLocalizedAmount(absOutstandingMinor, currency, locale as "en", false)}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-slate-400 font-medium block">Total Loans Recorded</span>
              <span className="text-base font-bold text-amber-300 mt-0.5 block">
                {formatLocalizedAmount(stats.totalLoanGiven, currency, locale as "en", false)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-slate-400 font-medium block">Total Repayments Recorded</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                {formatLocalizedAmount(stats.totalRepayments, currency, locale as "en", false)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-slate-400 font-medium block">Total Entries</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {transactions.length} Transactions
              </span>
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 shadow-md print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions by description, notes, tags, or amount..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="date_desc">Date: Newest first</option>
                <option value="date_asc">Date: Oldest first</option>
                <option value="amount_desc">Amount: Highest first</option>
                <option value="amount_asc">Amount: Lowest first</option>
              </select>
            </div>
          </div>

          {/* Transaction Type Filter Tabs */}
          <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Filter:</span>
            {[
              { id: "all", label: "All Transactions" },
              { id: "loan", label: "Loans Only" },
              { id: "repayment", label: "Repayments Only" },
            ].map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1 rounded-xl font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              Showing {filteredTransactions.length} of {transactions.length}
            </span>
          </div>
        </div>

        {/* Transaction Feed (Screen Mode) */}
        <div className="space-y-6 print:hidden">
          {filteredTransactions.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
              <Receipt className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No Transactions Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No transactions matched your current search and filter criteria. Try resetting the search query.
              </p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-cyan-400 hover:bg-slate-700 transition"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                    {group.displayDate}
                  </span>
                  <div className="flex-1 h-px bg-slate-800/80 ml-2" />
                </div>

                {/* Transactions for this date */}
                <div className="space-y-3">
                  {group.items.map((tx) => {
                    const isLoanGiven = tx.type === "loan_given";
                    const isRepaymentReceived = tx.type === "repayment_received";
                    const isLoanReceived = tx.type === "loan_received";
                    const isRepaymentMade = tx.type === "repayment_made";

                    const badgeConfig = isLoanGiven
                      ? { label: "Loan Given", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: ArrowUpRight }
                      : isRepaymentReceived
                      ? { label: "Repayment Received", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: ArrowDownLeft }
                      : isLoanReceived
                      ? { label: "Loan Received", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: ArrowDownLeft }
                      : isRepaymentMade
                      ? { label: "Repayment Made", color: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: ArrowUpRight }
                      : { label: tx.type, color: "bg-slate-800 text-slate-300 border-slate-700", icon: HandCoins };

                    const BadgeIcon = badgeConfig.icon;
                    const timeStr = new Date(tx.occurredAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={tx.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md hover:border-slate-700 transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-200 shrink-0">
                              <BadgeIcon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeConfig.color}`}>
                                  {badgeConfig.label}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {timeStr}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-slate-100">{tx.description}</p>
                              {tx.notes && (
                                <p className="text-xs text-slate-400 italic bg-slate-950/50 px-2 py-1 rounded-lg">
                                  &quot;{tx.notes}&quot;
                                </p>
                              )}
                              {tx.tags && tx.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {tx.tags.map((t) => (
                                    <span
                                      key={t.id}
                                      className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-medium"
                                    >
                                      #{t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-base sm:text-lg font-black tracking-tight ${
                                isRepaymentReceived || isLoanReceived
                                  ? "text-emerald-400"
                                  : isLoanGiven
                                  ? "text-amber-300"
                                  : "text-slate-100"
                              }`}
                            >
                              {formatLocalizedAmount(tx.amountMinor, tx.currency || currency, locale as "en", false)}
                            </span>
                          </div>
                        </div>

                        {/* Coupled Add-on Transactions (if any) */}
                        {tx.addons && tx.addons.length > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-cyan-500/40 space-y-2 pt-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                              <Layers className="h-3.5 w-3.5" />
                              <span>Attached Add-ons ({tx.addons.length}):</span>
                            </div>

                            {tx.addons.map((addon) => (
                              <div
                                key={addon.id}
                                className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <CornerDownRight className="h-3.5 w-3.5 text-cyan-400" />
                                  <div>
                                    <span className="font-semibold text-cyan-200">{addon.description}</span>
                                    <span className="ml-2 text-[10px] text-cyan-400/70 uppercase font-mono">
                                      {addon.type}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-bold text-cyan-300">
                                  {formatLocalizedAmount(addon.amountMinor, addon.currency || currency, locale as "en", false)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Print-Only Transaction Table View */}
        <div className="hidden print:block">
          <table className="w-full text-left border-collapse text-xs text-black">
            <thead>
              <tr className="border-b-2 border-black font-bold uppercase tracking-wider text-[11px] text-gray-900">
                <th className="py-2.5 pr-4">Date & Time</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 pl-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTransactions.map((tx) => {
                const d = new Date(tx.occurredAt);
                const dateFormatted = d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const timeFormatted = d.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });

                const isLoanGiven = tx.type === "loan_given";
                const isRepaymentReceived = tx.type === "repayment_received";
                const isLoanReceived = tx.type === "loan_received";
                const isRepaymentMade = tx.type === "repayment_made";

                const typeLabel = isLoanGiven
                  ? "Loan Given"
                  : isRepaymentReceived
                  ? "Repayment Received"
                  : isLoanReceived
                  ? "Loan Received"
                  : isRepaymentMade
                  ? "Repayment Made"
                  : tx.type;

                return (
                  <React.Fragment key={tx.id}>
                    <tr className="break-inside-avoid">
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-gray-800 align-top whitespace-nowrap">
                        <div className="font-semibold text-black">{dateFormatted}</div>
                        <div className="text-[10px] text-gray-500">{timeFormatted}</div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="font-semibold text-black">{tx.description}</div>
                        {tx.notes && (
                          <div className="text-[11px] text-gray-600 italic mt-0.5">{tx.notes}</div>
                        )}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {tx.tags.map((t) => `#${t.name}`).join(" ")}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 align-top text-[11px] font-medium text-gray-800 whitespace-nowrap">
                        {typeLabel}
                      </td>
                      <td className="py-2.5 pl-4 align-top text-right font-bold text-black whitespace-nowrap">
                        {formatLocalizedAmount(tx.amountMinor, tx.currency || currency, locale as "en", false)}
                      </td>
                    </tr>

                    {/* Add-ons nested rows if any */}
                    {tx.addons && tx.addons.length > 0 && tx.addons.map((addon) => (
                      <tr key={addon.id} className="bg-gray-50 text-[11px] break-inside-avoid">
                        <td className="py-1.5 pr-4 pl-4 text-gray-400 font-mono text-right align-top">
                          ↳
                        </td>
                        <td className="py-1.5 px-4 align-top text-gray-700">
                          <span className="font-medium text-black">{addon.description}</span>
                          <span className="text-[10px] text-gray-500 uppercase font-mono ml-2">({addon.type})</span>
                        </td>
                        <td className="py-1.5 px-4 align-top text-gray-500 text-[10px]">
                          Add-on
                        </td>
                        <td className="py-1.5 pl-4 align-top text-right font-semibold text-black whitespace-nowrap">
                          {formatLocalizedAmount(addon.amountMinor, addon.currency || currency, locale as "en", false)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-slate-800/80 space-y-1 text-xs text-slate-500 print:hidden">
          <p>
            Cryptographically signed ledger statement powered by <strong className="text-slate-400">Linked Coin</strong>.
          </p>
          <p className="text-[11px]">
            This is a read-only secure statement. No credentials or personal dashboard access were granted with this link.
          </p>
        </div>
      </div>
    </div>
  );
}
