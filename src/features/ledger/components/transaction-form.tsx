"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "../actions";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "../../../lib/money/money";
import { useI18n } from "../../../lib/i18n/context";
import type { Account, Person, Tag } from "../../../db/schema";

interface TransactionFormProps {
  accounts: Account[];
  people: Person[];
  tags: Tag[];
  initialType?: string;
}

export function TransactionForm({
  accounts,
  people,
  tags,
  initialType = "expense",
}: TransactionFormProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [type, setType] = useState<string>(initialType);
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableCurrencies = Object.keys(SUPPORTED_CURRENCIES);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    const res = await createTransactionAction(formData);
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      router.push(`/${locale}/transactions`);
    }
  }

  const filteredAccounts = accounts.filter((a) => a.currency === currency);

  const typeOptions = [
    { label: t.transactionForm.typeExpense, value: "expense", short: t.dashboard.addExpense },
    { label: t.transactionForm.typeIncome, value: "income", short: t.dashboard.addIncome },
    { label: t.transactionForm.typeTransfer, value: "transfer", short: t.dashboard.transfer },
    { label: t.transactionForm.typeLoanGiven, value: "loan_given", short: t.people.giveLoan },
    { label: t.transactionForm.typeLoanReceived, value: "loan_received", short: t.people.receiveLoan },
    { label: t.transactionForm.typeRepaymentReceived, value: "repayment_received", short: t.people.recordRepayment },
    { label: t.transactionForm.typeRepaymentMade, value: "repayment_made", short: t.people.youOwe },
  ];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl max-w-2xl mx-auto border border-white/10 shadow-2xl">
      {/* Type Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 rounded-2xl mb-6 border border-white/5">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              type === opt.value
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {opt.short}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" id="new-transaction-form">
        {/* Amount & Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <input
              type="text"
              name="amount"
              required
              placeholder="e.g. 250.00"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Currency
            </label>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500"
            >
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <input
            type="text"
            name="description"
            required
            placeholder="e.g. Grocery shopping, Lunch, Monthly rent"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Account Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(type === "expense" ||
            type === "transfer" ||
            type === "loan_given" ||
            type === "repayment_made") && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                From Account
              </label>
              <select
                name="sourceAccountId"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select source account...</option>
                {filteredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === "income" ||
            type === "transfer" ||
            type === "loan_received" ||
            type === "repayment_received") && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                To Account
              </label>
              <select
                name="destinationAccountId"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select destination account...</option>
                {filteredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Person Picker (for Loans & Repayments) */}
        {(type === "loan_given" ||
          type === "loan_received" ||
          type === "repayment_received" ||
          type === "repayment_made") && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Person
            </label>
            <select
              name="personId"
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select contact / person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.contact ? `(${p.contact})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Date & Time
            </label>
            <input
              type="datetime-local"
              name="occurredAt"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900/40 rounded-xl border border-white/5">
              {tags.length === 0 ? (
                <span className="text-xs text-slate-500">No tags created yet.</span>
              ) : (
                tags.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/5 cursor-pointer hover:border-emerald-500/50"
                  >
                    <input type="checkbox" name="tagIds" value={t.id} className="rounded" />
                    <span>{t.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Additional context or remarks..."
            className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            id="btn-submit-transaction"
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-xl shadow-emerald-500/25 disabled:opacity-50 text-sm"
          >
            {isLoading ? "Recording Ledger Transaction..." : "Save Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
