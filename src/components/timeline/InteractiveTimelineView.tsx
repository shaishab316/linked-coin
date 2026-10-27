"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  HandCoins,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  Wallet,
  User,
  RotateCcw,
  Clock,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Square,
} from "lucide-react";
import { RangeMergeToolbar, type SelectedTransactionInfo } from "../batch/RangeMergeToolbar";

export interface TimelineTransactionItem {
  id: string;
  type: string;
  amountMinor: bigint;
  currency: string;
  description: string;
  notes?: string | null;
  occurredAt: string;
  reversedAt?: string | null;
  reversesTransactionId?: string | null;
  personName?: string | null;
  accountName?: string | null;
  tags?: { id: string; name: string }[];
  entries?: {
    id: string;
    direction: string;
    amountMinor: bigint;
    currency: string;
    accountName?: string;
    externalKind?: string;
  }[];
}

interface InteractiveTimelineViewProps {
  transactions: TimelineTransactionItem[];
  allTags?: { id: string; name: string }[];
  currency?: string;
  basePath?: string;
}

export function InteractiveTimelineView({
  transactions,
  allTags = [],
  currency = "BDT",
  basePath = "/transactions",
}: InteractiveTimelineViewProps) {
  const { locale, t } = useI18n();
  const [filterType, setFilterType] = useState<"all" | "inflow" | "outflow" | "transfer" | "debt">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "compact">("timeline");

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterType === "all") return true;
    if (filterType === "inflow") return tx.type === "income" || tx.type === "repayment_received";
    if (filterType === "outflow") return tx.type === "expense" || tx.type === "repayment_made";
    if (filterType === "transfer") return tx.type === "transfer";
    if (filterType === "debt") return tx.type.startsWith("loan_") || tx.type.startsWith("repayment_");
    return true;
  });

  // Group by date string (YYYY-MM-DD)
  const groupedByDate: Record<string, TimelineTransactionItem[]> = {};
  for (const tx of filtered) {
    const dateKey = tx.occurredAt.slice(0, 10);
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(tx);
  }

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAllInDate = (dateKey: string) => {
    const itemsInDate = groupedByDate[dateKey] || [];
    const dateIds = itemsInDate.map((i) => i.id);
    const allSelected = dateIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !dateIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...dateIds])));
    }
  };

  const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (dateStr === today) return t.timeline.today;
    if (dateStr === yesterday) return t.timeline.yesterday;

    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeVisual = (type: string) => {
    switch (type) {
      case "income":
      case "repayment_received":
        return {
          icon: ArrowDownLeft,
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
          nodeColor: "bg-emerald-500",
          badgeColor: "bg-emerald-500/20 text-emerald-300",
          amountColor: "text-emerald-400",
          sign: "+",
        };
      case "expense":
      case "repayment_made":
        return {
          icon: ArrowUpRight,
          color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
          nodeColor: "bg-rose-500",
          badgeColor: "bg-rose-500/20 text-rose-300",
          amountColor: "text-rose-400",
          sign: "-",
        };
      case "transfer":
        return {
          icon: ArrowLeftRight,
          color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
          nodeColor: "bg-blue-500",
          badgeColor: "bg-blue-500/20 text-blue-300",
          amountColor: "text-blue-400",
          sign: "",
        };
      case "loan_given":
      case "loan_received":
        return {
          icon: HandCoins,
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
          nodeColor: "bg-amber-500",
          badgeColor: "bg-amber-500/20 text-amber-300",
          amountColor: "text-amber-400",
          sign: type === "loan_given" ? "-" : "+",
        };
      default:
        return {
          icon: RotateCcw,
          color: "text-slate-400 bg-slate-800 border-slate-700",
          nodeColor: "bg-slate-500",
          badgeColor: "bg-slate-800 text-slate-300",
          amountColor: "text-slate-300",
          sign: "",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border border-slate-800 bg-slate-900/80">
          {(
            [
              { id: "all", label: t.timeline.all },
              { id: "inflow", label: t.timeline.inflow },
              { id: "outflow", label: t.timeline.outflow },
              { id: "transfer", label: t.timeline.transfers },
              { id: "debt", label: t.timeline.debts },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filterType === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                viewMode === "timeline" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ⏱️ {t.timeline.viewTimeline}
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                viewMode === "compact" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📋 {t.timeline.viewCompact}
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedDateKeys.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800/80 bg-slate-900/30 p-12 text-center">
          <Clock className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-400">{t.timeline.noTransactions}</p>
        </div>
      )}

      {/* Chronological Timeline Groups */}
      <div className="space-y-8">
        {sortedDateKeys.map((dateKey) => {
          const items = groupedByDate[dateKey] || [];
          const allInDateSelected = items.every((i) => selectedIds.includes(i.id));

          return (
            <div key={dateKey} className="relative">
              {/* Date Header Node */}
              <div className="sticky top-16 z-20 mb-4 flex items-center justify-between backdrop-blur-md py-1.5 px-3 rounded-2xl bg-[#090d16]/80 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {getRelativeDateLabel(dateKey)}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    ({items.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSelectAllInDate(dateKey)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                >
                  {allInDateSelected ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t.common.selected}</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      <span>{t.timeline.selectToMerge}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Connected Timeline Axis & Cards */}
              <div className="relative pl-6 sm:pl-8 space-y-3">
                {/* Vertical Timeline Track Line */}
                <div className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-slate-800/90" />

                {items.map((tx) => {
                  const visual = getTypeVisual(tx.type);
                  const Icon = visual.icon;
                  const isExpanded = expandedId === tx.id;
                  const isSelected = selectedIds.includes(tx.id);
                  const isReversed = !!tx.reversedAt;

                  return (
                    <div key={tx.id} className="relative group">
                      {/* Timeline Node Point on Axis */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#090d16] ${visual.nodeColor} transition-transform group-hover:scale-125 z-10`}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>

                      {/* Transaction Interactive Card */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                        className={`cursor-pointer rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/40"
                            : isReversed
                            ? "border-slate-800/50 bg-slate-900/30 opacity-60"
                            : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 shadow-sm"
                        } p-4`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Checkbox + Icon + Details */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(e) => toggleSelect(tx.id, e)}
                              className="mt-0.5 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>

                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${visual.color}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition">
                                  {tx.description}
                                </h5>
                                {isReversed && (
                                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                    {t.timeline.reversedBadge}
                                  </span>
                                )}
                              </div>

                              {/* Badges: Account, Tag, Person */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                {tx.accountName && (
                                  <span className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2 py-0.5 text-slate-300">
                                    <Wallet className="h-3 w-3 text-slate-400" />
                                    {tx.accountName}
                                  </span>
                                )}

                                {tx.tags &&
                                  tx.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-emerald-400 border border-emerald-500/20"
                                    >
                                      <TagIcon className="h-3 w-3" />
                                      {tag.name}
                                    </span>
                                  ))}

                                {tx.personName && (
                                  <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-amber-300 border border-amber-500/20">
                                    <User className="h-3 w-3" />
                                    {tx.personName}
                                  </span>
                                )}

                                <span className="text-[10px] text-slate-500">
                                  {new Date(tx.occurredAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount & Expand Arrow */}
                          <div className="flex flex-col items-end justify-between shrink-0">
                            <span
                              className={`text-base font-extrabold ${visual.amountColor} ${
                                isReversed ? "line-through opacity-70" : ""
                              }`}
                            >
                              {formatLocalizedAmount(
                                tx.amountMinor,
                                tx.currency,
                                locale,
                                visual.sign as any,
                              )}
                            </span>

                            <div className="mt-2 text-slate-500 group-hover:text-slate-300 transition">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details on Click */}
                        {isExpanded && (
                          <div className="mt-4 border-t border-slate-800/80 pt-3 space-y-3 animate-in fade-in duration-200">
                            {tx.notes && (
                              <p className="text-xs text-slate-400 italic bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                                &quot;{tx.notes}&quot;
                              </p>
                            )}

                            {/* Double-Entry Legs breakdown */}
                            {tx.entries && tx.entries.length > 0 && (
                              <div className="space-y-1.5 rounded-xl bg-slate-950/60 p-3 border border-slate-800/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Double-Entry Ledger Legs (Balanced)
                                </span>
                                <div className="space-y-1 text-xs">
                                  {tx.entries.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center justify-between text-slate-300"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                                            entry.direction === "debit"
                                              ? "bg-emerald-500/20 text-emerald-300"
                                              : "bg-blue-500/20 text-blue-300"
                                          }`}
                                        >
                                          {entry.direction}
                                        </span>
                                        <span>
                                          {entry.accountName ||
                                            (entry.externalKind
                                              ? `External (${entry.externalKind})`
                                              : "Account")}
                                        </span>
                                      </span>
                                      <span className="font-mono font-semibold">
                                        {formatLocalizedAmount(
                                          entry.amountMinor,
                                          entry.currency,
                                          locale,
                                          false,
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions Footer */}
                            <div className="flex items-center justify-end gap-3 pt-1">
                              <Link
                                href={`${basePath}/${tx.id}`}
                                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                              >
                                {t.timeline.viewDetails} →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Range Merge Toolbar */}
      <RangeMergeToolbar
        selectedIds={selectedIds}
        transactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amountMinor: t.amountMinor,
          currency: t.currency,
          description: t.description,
          occurredAt: t.occurredAt,
          tags: t.tags,
        }))}
        allTags={allTags}
        currency={currency}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
