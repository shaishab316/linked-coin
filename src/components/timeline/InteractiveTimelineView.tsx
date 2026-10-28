"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  CheckSquare,
  Square,
  Paperclip,
  CloudOff,
  CornerDownRight,
} from "lucide-react";
import { RangeMergeToolbar } from "../batch/RangeMergeToolbar";
import dayjs, { formatFromNow, formatDate } from "../../lib/date/dayjs";
import { localDb } from "../../offline/database";

export interface TimelineAddonItem {
  id: string;
  type: string;
  amountMinor: bigint;
  currency: string;
  description: string;
  notes?: string | null;
  occurredAt: string;
  tags?: { id: string; name: string }[];
  accountName?: string | null;
}

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
  addons?: TimelineAddonItem[];
  parentTransactionId?: string | null;
  isAddon?: boolean;
  syncStatus?: "synced" | "pending" | "failed";
}

interface InteractiveTimelineViewProps {
  transactions: TimelineTransactionItem[];
  allTags?: Array<{ id: string; name: string; parentId?: string | null; tagType?: string | null; [key: string]: any }>;
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
  const [collapsedAddonIds, setCollapsedAddonIds] = useState<Set<string>>(new Set());

  // Offline pending transactions loaded from Dexie localDb
  const [offlinePending, setOfflinePending] = useState<TimelineTransactionItem[]>([]);

  useEffect(() => {
    async function loadOfflineTransactions() {
      if (!localDb) return;
      try {
        const pending = await localDb.transactions
          .where("syncStatus")
          .equals("pending")
          .toArray();

        if (pending && pending.length > 0) {
          const mapped: TimelineTransactionItem[] = pending.map((p) => ({
            id: p.id,
            type: p.type,
            amountMinor: BigInt(p.amountMinor || "0"),
            currency: p.currency,
            description: p.description,
            notes: p.notes,
            occurredAt: p.occurredAt,
            parentTransactionId: p.parentTransactionId || null,
            isAddon: !!p.parentTransactionId,
            tags: [],
            syncStatus: "pending",
          }));
          setOfflinePending(mapped);
        }
      } catch (err) {
        console.warn("Could not load localDb pending transactions:", err);
      }
    }
    loadOfflineTransactions();
  }, []);

  // Merge server props with offline pending items seamlessly
  const allMergedTransactions = useMemo(() => {
    const existingIds = new Set(transactions.map((t) => t.id));
    const uniquePending = offlinePending.filter((p) => !existingIds.has(p.id));
    return [...uniquePending, ...transactions];
  }, [transactions, offlinePending]);

  // Build coupled addon mapping and group by user's local date
  const { filtered, groupedByDate, sortedDateKeys, parentAddonMap } = useMemo(() => {
    const addonMap = new Map<string, TimelineAddonItem[]>();

    for (const tx of allMergedTransactions) {
      if (tx.addons && tx.addons.length > 0) {
        const list = addonMap.get(tx.id) || [];
        addonMap.set(tx.id, [...list, ...tx.addons]);
      }
      if (tx.parentTransactionId) {
        const list = addonMap.get(tx.parentTransactionId) || [];
        if (!list.some((a) => a.id === tx.id)) {
          list.push({
            id: tx.id,
            type: tx.type,
            amountMinor: tx.amountMinor,
            currency: tx.currency,
            description: tx.description,
            notes: tx.notes,
            occurredAt: tx.occurredAt,
            tags: tx.tags,
            accountName: tx.accountName,
          });
          addonMap.set(tx.parentTransactionId, list);
        }
      }
    }

    const filteredTx = allMergedTransactions.filter((tx) => {
      if (filterType === "all") return true;
      if (filterType === "inflow") return tx.type === "income" || tx.type === "repayment_received";
      if (filterType === "outflow") return tx.type === "expense" || tx.type === "repayment_made";
      if (filterType === "transfer") return tx.type === "transfer";
      if (filterType === "debt") return tx.type.startsWith("loan_") || tx.type.startsWith("repayment_");
      return true;
    });

    const parentIdsInList = new Set(filteredTx.map((t) => t.id));

    // Group by local timezone date string (YYYY-MM-DD)
    const groups: Record<string, TimelineTransactionItem[]> = {};
    for (const tx of filteredTx) {
      // If this transaction is an addon whose parent is in the list,
      // it will be coupled directly under its parent card
      if (tx.parentTransactionId && parentIdsInList.has(tx.parentTransactionId)) {
        continue;
      }

      const dateKey = dayjs(tx.occurredAt).format("YYYY-MM-DD");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return {
      filtered: filteredTx,
      groupedByDate: groups,
      sortedDateKeys: sortedKeys,
      parentAddonMap: addonMap,
    };
  }, [allMergedTransactions, filterType]);

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

  const toggleCollapseAddons = (txId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  // Local date formatting relative to user's local timezone
  const getRelativeDateLabel = (dateStr: string) => {
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const fromNowText = formatFromNow(dateStr, locale);

    if (dateStr === today) return `${t.timeline.today} (${fromNowText})`;
    if (dateStr === yesterday) return `${t.timeline.yesterday} (${fromNowText})`;

    return `${formatDate(dateStr, "D MMMM, YYYY", locale)} · ${fromNowText}`;
  };

  const getTypeVisual = (type: string) => {
    switch (type) {
      case "income":
      case "repayment_received":
        return {
          icon: ArrowDownLeft,
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
          nodeColor: "bg-emerald-500",
          accentBorder: "border-l-4 border-l-emerald-500",
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
          accentBorder: "border-l-4 border-l-rose-500",
          badgeColor: "bg-rose-500/20 text-rose-300",
          amountColor: "text-rose-400",
          sign: "-",
        };
      case "transfer":
        return {
          icon: ArrowLeftRight,
          color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
          nodeColor: "bg-sky-500",
          accentBorder: "border-l-4 border-l-sky-500",
          badgeColor: "bg-sky-500/20 text-sky-300",
          amountColor: "text-sky-400",
          sign: "",
        };
      case "loan_given":
      case "loan_received":
        return {
          icon: HandCoins,
          color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
          nodeColor: "bg-purple-500",
          accentBorder: "border-l-4 border-l-purple-500",
          badgeColor: "bg-purple-500/20 text-purple-300",
          amountColor: "text-purple-400",
          sign: type === "loan_given" ? "-" : "+",
        };
      default:
        return {
          icon: RotateCcw,
          color: "text-slate-400 bg-slate-800 border-slate-700",
          nodeColor: "bg-slate-500",
          accentBorder: "border-l-4 border-l-slate-600",
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
                viewMode === "timeline"
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ⏱️ {t.timeline.viewTimeline}
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
              <div className="space-y-4">
                {items.map((tx) => {
                  const visual = getTypeVisual(tx.type);
                  const Icon = visual.icon;
                  const isExpanded = expandedId === tx.id;
                  const isSelected = selectedIds.includes(tx.id);
                  const isReversed = !!tx.reversedAt;
                  const isPending = tx.syncStatus === "pending";

                  // Addons coupled to this transaction
                  const coupledAddons = parentAddonMap.get(tx.id) || [];
                  const hasAddons = coupledAddons.length > 0;
                  const areAddonsCollapsed = collapsedAddonIds.has(tx.id);

                  const addonsTotalMinor = coupledAddons.reduce(
                    (sum, a) => sum + BigInt(a.amountMinor.toString()),
                    0n,
                  );
                  const bundleTotalMinor = tx.amountMinor + addonsTotalMinor;

                  // Format dates strictly in user's browser local timezone
                  const yearStr = dayjs(tx.occurredAt).format("YYYY");
                  const dateStrFormatted = dayjs(tx.occurredAt)
                    .locale(locale === "bn" ? "bn" : "en")
                    .format("MMM D");
                  const timeStr = dayjs(tx.occurredAt)
                    .locale(locale === "bn" ? "bn" : "en")
                    .format("h:mm A");
                  const fromNowStr = formatFromNow(tx.occurredAt, locale);

                  return (
                    <div key={tx.id} className="relative flex items-start group">
                      {/* Left Column: Local Timestamp */}
                      <div className="hidden sm:flex flex-col items-end w-24 md:w-28 shrink-0 pr-3 pt-3.5 select-none text-right">
                        <span className="text-xs font-bold text-slate-200 tracking-tight">
                          {yearStr}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {dateStrFormatted}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {timeStr}
                        </span>
                      </div>

                      {/* Center Axis with Continuous Vertical Line & Bullet Node Dot */}
                      <div className="relative flex flex-col items-center shrink-0 self-stretch w-7 sm:w-8">
                        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-800 group-hover:bg-slate-700 transition" />
                        <div
                          className={`relative top-4 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#090d16] ${visual.nodeColor} shadow-md transition-transform group-hover:scale-125`}
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Right Column: Transaction Interactive Card */}
                      <div className="flex-1 min-w-0 pl-1.5 sm:pl-3 pb-2 space-y-2">
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                          className={`cursor-pointer rounded-2xl border transition-all duration-200 ${visual.accentBorder} ${
                            isSelected
                              ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/40"
                              : isReversed
                              ? "border-slate-800/50 bg-slate-900/30 opacity-60"
                              : "border-slate-800/80 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 shadow-sm"
                          } p-4`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Left: Checkbox + Icon + Details */}
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => toggleSelect(tx.id, e)}
                                className="mt-0.5 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition shrink-0 cursor-pointer"
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

                              <div className="space-y-1 min-w-0">
                                {/* Title (Description) + Badges */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition truncate">
                                    {tx.description}
                                  </h5>

                                  {/* Add-ons Coupled Badge */}
                                  {hasAddons && (
                                    <button
                                      type="button"
                                      onClick={(e) => toggleCollapseAddons(tx.id, e)}
                                      className="flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer"
                                      title="Toggle coupled addon transactions"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span>
                                        +{coupledAddons.length} {coupledAddons.length === 1 ? "Add-on" : "Add-ons"}
                                      </span>
                                    </button>
                                  )}

                                  {/* Standalone Addon Indicator */}
                                  {tx.isAddon && !tx.parentTransactionId && (
                                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                      📎 Add-on
                                    </span>
                                  )}

                                  {/* Offline Pending Badge */}
                                  {isPending && (
                                    <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                      <CloudOff className="h-3 w-3" />
                                      <span>Offline · Pending Sync</span>
                                    </span>
                                  )}

                                  {isReversed && (
                                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                      {t.timeline.reversedBadge}
                                    </span>
                                  )}
                                </div>

                                {/* Italic Relative Subtitle: from now */}
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="italic font-serif font-medium text-amber-400/90 tracking-wide">
                                    {fromNowStr}
                                  </span>
                                  {/* Mobile-only date indicator */}
                                  <span className="sm:hidden text-[10px] text-slate-500 font-mono">
                                    • {dateStrFormatted}, {timeStr}
                                  </span>

                                  {hasAddons && (
                                    <span className="text-[11px] text-cyan-400 font-mono font-medium">
                                      · Total with add-ons: {formatLocalizedAmount(bundleTotalMinor, tx.currency, locale, visual.sign as any)}
                                    </span>
                                  )}
                                </div>

                                {/* Badges: Account, Tag, Person */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
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
                                    <Link
                                      href={`/${locale}/people`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition"
                                    >
                                      <User className="h-3 w-3 text-purple-400" />
                                      {tx.personName}
                                    </Link>
                                  )}
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

                        {/* Awesome Coupled Add-ons Display */}
                        {hasAddons && !areAddonsCollapsed && (
                          <div className="ml-4 sm:ml-7 space-y-2 border-l-2 border-dashed border-cyan-500/30 pl-3 sm:pl-4 pt-1 animate-in fade-in duration-200">
                            {coupledAddons.map((addon) => {
                              const addonVisual = getTypeVisual(addon.type);
                              return (
                                <div
                                  key={addon.id}
                                  className="group/addon relative flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-slate-900/90 transition shadow-sm"
                                >
                                  {/* Left: Connector Icon + Description */}
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                      <CornerDownRight className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-200 group-hover/addon:text-cyan-300 transition truncate">
                                          {addon.description}
                                        </span>
                                        <span className="text-[9px] uppercase font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                                          Add-on
                                        </span>
                                      </div>
                                      {addon.accountName && (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                                          <Wallet className="h-2.5 w-2.5" />
                                          {addon.accountName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Amount & Details */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs font-bold font-mono text-cyan-300">
                                      {formatLocalizedAmount(
                                        BigInt(addon.amountMinor.toString()),
                                        addon.currency,
                                        locale,
                                        addonVisual.sign as any,
                                      )}
                                    </span>
                                    <Link
                                      href={`${basePath}/${addon.id}`}
                                      className="text-[11px] text-slate-500 hover:text-cyan-400 transition"
                                      title="View Add-on Details"
                                    >
                                      →
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
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
