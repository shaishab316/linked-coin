"use client";

import React, { useState, useEffect } from "react";
import { updateTransactionAction } from "../actions";
import { minorToDecimalString } from "../../../lib/money/money";
import dayjs from "../../../lib/date/dayjs";
import {
  Edit3,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  X,
  Loader2,
  Calendar,
  Tag as TagIcon,
} from "lucide-react";

interface EditTransactionDialogProps {
  transaction: {
    id: string;
    description: string;
    amountMinor: bigint | string;
    currency: string;
    notes?: string | null;
    occurredAt: string;
    tags?: { id: string; name: string }[];
  };
  allTags?: Array<{ id: string; name: string }>;
  trigger?: React.ReactNode;
}

function generateRandomCode(length = 8): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function EditTransactionDialog({
  transaction,
  allTags = [],
  trigger,
}: EditTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expectedCode, setExpectedCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form field state
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(() => {
    const minor =
      typeof transaction.amountMinor === "bigint"
        ? transaction.amountMinor
        : BigInt(transaction.amountMinor || "0");
    return minorToDecimalString(minor, transaction.currency);
  });
  const [occurredAt, setOccurredAt] = useState(() =>
    dayjs(transaction.occurredAt).format("YYYY-MM-DDTHH:mm"),
  );
  const [notes, setNotes] = useState(transaction.notes || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    transaction.tags?.map((t) => t.id) || [],
  );

  // Reset or generate new random 8-character verification code whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const code = generateRandomCode(8);
      setExpectedCode(code);
      setEnteredCode("");
      setCopied(false);
      setError(null);
      setDescription(transaction.description);
      const minor =
        typeof transaction.amountMinor === "bigint"
          ? transaction.amountMinor
          : BigInt(transaction.amountMinor || "0");
      setAmount(minorToDecimalString(minor, transaction.currency));
      setOccurredAt(dayjs(transaction.occurredAt).format("YYYY-MM-DDTHH:mm"));
      setNotes(transaction.notes || "");
      setSelectedTagIds(transaction.tags?.map((t) => t.id) || []);
    }
  }, [isOpen, transaction]);

  const isCodeMatched =
    enteredCode.trim().length === 8 &&
    enteredCode.trim().toUpperCase() === expectedCode.toUpperCase();

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(expectedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isCodeMatched) {
      setError("Please accurately type the 8-character verification code to authorize editing.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("description", description.trim());
    formData.append("amount", amount.trim());
    formData.append("notes", notes.trim());
    formData.append("occurredAt", new Date(occurredAt).toISOString());
    formData.append("confirmationCode", enteredCode.trim().toUpperCase());
    formData.append("expectedCode", expectedCode.toUpperCase());

    selectedTagIds.forEach((tagId) => {
      formData.append("tagIds", tagId);
    });

    const res = await updateTransactionAction(transaction.id, formData);

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setIsOpen(false);
      window.location.reload();
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
          title="Edit transaction details"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-panel max-w-lg w-full rounded-3xl border border-slate-700/80 bg-slate-900/95 p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Edit Transaction</h3>
                  <p className="text-xs text-slate-400">Double-entry ledger transaction</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Security Verification Gate (Compare 8-character Random Code) */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Security Verification Code
                </span>
                <span className="text-[11px] font-mono text-slate-400">8-character match</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                To prevent accidental changes to your balanced financial ledger, please compare and
                type the 8-character verification code below:
              </p>

              {/* Code Display Box with Copy Button */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="font-mono text-lg font-black tracking-widest text-amber-400 select-all">
                  {expectedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Type Verification Code to Confirm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={8}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-digit code..."
                    className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border font-mono text-sm tracking-widest transition focus:outline-none ${
                      isCodeMatched
                        ? "border-emerald-500/80 text-emerald-400 ring-1 ring-emerald-500/50"
                        : "border-slate-800 text-white focus:border-amber-500"
                    }`}
                  />
                  {isCodeMatched && (
                    <div className="absolute right-3 top-2.5 flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[11px]">
                  {isCodeMatched ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Code confirmed! You may now save your changes below.
                    </span>
                  ) : enteredCode.length > 0 ? (
                    <span className="text-amber-400/90 font-mono">
                      {enteredCode.length}/8 characters entered (must match exact code)
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Type the code above to authorize transaction modification.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Transaction Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Transaction description"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount ({transaction.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                {/* Date & Time (Local) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>Date & Time (Local)</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Tags Selector */}
              {allTags.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <TagIcon className="h-3 w-3 text-slate-400" />
                    <span>Categories / Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    {allTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                          }`}
                        >
                          {isSelected ? "✓ " : ""}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isCodeMatched || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/40 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
