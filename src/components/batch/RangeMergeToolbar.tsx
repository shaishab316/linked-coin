"use client";

import React, { useState } from "react";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";
import { CheckSquare, Layers, Download, X, Tag as TagIcon, FileText } from "lucide-react";
import { TagPicker, type TagPickerItem } from "../../features/tags/components/tag-picker";
import dayjs from "../../lib/date/dayjs";

export interface SelectedTransactionInfo {
  id: string;
  type: string;
  amountMinor: bigint;
  currency: string;
  description: string;
  occurredAt: string;
  tags?: { id: string; name: string }[];
  accounts?: string[];
}

interface RangeMergeToolbarProps {
  selectedIds: string[];
  transactions: SelectedTransactionInfo[];
  allTags?: TagPickerItem[];
  currency?: string;
  onClearSelection: () => void;
  onApplyBatchTag?: (tagId: string) => Promise<void>;
}

export function RangeMergeToolbar({
  selectedIds,
  transactions,
  allTags = [],
  currency = "BDT",
  onClearSelection,
  onApplyBatchTag,
}: RangeMergeToolbarProps) {
  const { locale, t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [customNote, setCustomNote] = useState("");

  if (selectedIds.length === 0) return null;

  const selectedItems = transactions.filter((tx) => selectedIds.includes(tx.id));

  // Compute inflows, outflows, and net sum
  let inflowMinor = 0n;
  let outflowMinor = 0n;
  let netMinor = 0n;

  for (const item of selectedItems) {
    if (item.type === "income" || item.type === "repayment_received") {
      inflowMinor += item.amountMinor;
      netMinor += item.amountMinor;
    } else if (item.type === "expense" || item.type === "repayment_made" || item.type === "loan_given") {
      outflowMinor += item.amountMinor;
      netMinor -= item.amountMinor;
    } else {
      // transfers/adjustments
      netMinor += item.amountMinor;
    }
  }

  const handleExportSelectedCsv = () => {
    const headers = ["ID", "Date", "Type", "Description", "Amount", "Currency"];
    const rows = selectedItems.map((tx) => [
      tx.id,
      tx.occurredAt,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      (Number(tx.amountMinor) / 100).toFixed(2),
      tx.currency,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `selected_transactions_${dayjs().format("YYYY-MM-DD")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyTag = async () => {
    if (!selectedTagId || !onApplyBatchTag) return;
    setIsApplying(true);
    try {
      await onApplyBatchTag(selectedTagId);
      setIsModalOpen(false);
      onClearSelection();
    } catch (e) {
      console.error("Batch tag error:", e);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      {/* Sticky Bottom Batch Toolbar */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 z-40 -translate-x-1/2 w-[95%] sm:w-[92%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-2 px-3 sm:p-3.5 sm:px-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs sm:text-sm">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-200">
                {selectedIds.length} {t.batch.selectedCount}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400">
                {t.batch.netTotal}:{" "}
                <span className={`font-bold ${netMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatLocalizedAmount(netMinor, currency, locale, true)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-emerald-600 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition active:scale-95 cursor-pointer"
            >
              <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t.batch.mergeSummary}
            </button>

            <button
              onClick={handleExportSelectedCsv}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-slate-700 bg-slate-800 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-200 hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              title={t.batch.exportCsv}
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t.batch.exportCsv}</span>
            </button>

            <button
              onClick={onClearSelection}
              className="flex items-center justify-center rounded-lg sm:rounded-xl p-1 sm:p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
              title={t.batch.clearSelection}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Range Merge / Group Summary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{t.batch.modalTitle}</h3>
                  <p className="text-xs text-slate-400">{t.batch.modalDesc}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics in Range */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                <span className="text-[11px] text-slate-400">{t.batch.transactionsIncluded}</span>
                <p className="mt-1 text-lg font-bold text-slate-100">{selectedIds.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                <span className="text-[11px] text-slate-400">{t.batch.totalInflow}</span>
                <p className="mt-1 text-xs font-bold text-emerald-400">
                  {formatLocalizedAmount(inflowMinor, currency, locale, false)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                <span className="text-[11px] text-slate-400">{t.batch.totalOutflow}</span>
                <p className="mt-1 text-xs font-bold text-rose-400">
                  {formatLocalizedAmount(outflowMinor, currency, locale, false)}
                </p>
              </div>
            </div>

            {/* Net Total Callout */}
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <span className="text-sm font-semibold text-slate-300">{t.batch.netTotal}:</span>
              <span className={`text-lg font-extrabold ${netMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                {formatLocalizedAmount(netMinor, currency, locale, true)}
              </span>
            </div>

            {/* Unified Tag Assignment (Optional) */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5 text-emerald-400" />
                  {t.batch.applyCommonTag}
                </label>
                <TagPicker
                  mode="single"
                  availableTags={allTags}
                  selectedTagId={selectedTagId}
                  onSelect={setSelectedTagId}
                  placeholder={t.batch.chooseTag}
                />
              </div>
            )}

            {/* Common Memo / Group note */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                {t.batch.mergedNotes}
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Vacation with friends"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={isApplying || !selectedTagId}
                onClick={handleApplyTag}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {isApplying ? t.common.loading : t.batch.applyChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
