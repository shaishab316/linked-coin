"use client";

import { useState } from "react";
import { reverseTransactionAction } from "../actions";

interface ReverseTransactionDialogProps {
  transactionId: string;
}

export function ReverseTransactionDialog({ transactionId }: ReverseTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await reverseTransactionAction(transactionId, formData);

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
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
        id="btn-open-reverse-modal"
      >
        Reverse Transaction
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reverse Transaction</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with our append-only accounting principles, this will not delete the
              original transaction. Instead, an atomic compensating reversal transaction will be
              recorded and linked.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason for Reversal
                </label>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="e.g. Wrong account selected, duplicate entry, refunded"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition disabled:opacity-50"
                  id="btn-confirm-reversal"
                >
                  {isLoading ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
