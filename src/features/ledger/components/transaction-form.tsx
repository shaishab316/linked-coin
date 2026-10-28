"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "../actions";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "../../../lib/money/money";
import { useI18n } from "../../../lib/i18n/context";
import { CascadingTagSelector } from "../../tags/components/cascading-tag-selector";
import type { Account, Person, Tag } from "../../../db/schema";
import dayjs from "../../../lib/date/dayjs";
import { localDb } from "../../../offline/database";
import { enqueueOutboxOperation } from "../../../offline/outbox";
import { toast } from "sonner";
import { Plus, Trash2, Paperclip, Sparkles, AlertCircle } from "lucide-react";

interface TransactionFormProps {
  accounts: Account[];
  people: Person[];
  tags: Tag[];
  initialType?: string;
}

interface FormAddon {
  id: string;
  description: string;
  amount: string;
  type: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  tagIds?: string[];
  notes?: string;
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
  const [mainAmount, setMainAmount] = useState<string>("");

  // Local timezone datetime initialized in user's browser local time
  const [occurredAt, setOccurredAt] = useState<string>(() =>
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );

  // Addon transactions state
  const [addons, setAddons] = useState<FormAddon[]>([]);

  const availableCurrencies = Object.keys(SUPPORTED_CURRENCIES);
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

  // Helper to add addon transaction
  const addAddon = (presetDescription = "", presetAmount = "") => {
    const newAddon: FormAddon = {
      id: crypto.randomUUID(),
      description: presetDescription,
      amount: presetAmount,
      type: "expense",
      sourceAccountId: "",
      destinationAccountId: "",
      tagIds: [],
    };
    setAddons((prev) => [...prev, newAddon]);
  };

  const removeAddon = (id: string) => {
    setAddons((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAddon = (id: string, updates: Partial<FormAddon>) => {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };

  // Calculate live financial summary
  const numericMain = parseFloat(mainAmount) || 0;
  const numericAddons = addons.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0,
  );
  const grandTotal = numericMain + numericAddons;

  // Save to Dexie when offline or on network failure
  async function saveOffline(
    formData: FormData,
    parsedOccurredAtIso: string,
    cleanAddons: FormAddon[],
  ) {
    if (!localDb) {
      throw new Error("Local database unavailable");
    }

    const txId = crypto.randomUUID();
    const description = formData.get("description") as string;
    const notes = (formData.get("notes") as string) || null;
    const sourceAccountId = (formData.get("sourceAccountId") as string) || null;
    const destinationAccountId = (formData.get("destinationAccountId") as string) || null;
    const personId = (formData.get("personId") as string) || null;
    const tagIdsRaw = (formData.getAll("tagIds") as string[]).filter(Boolean);

    const mainMinor = Math.round(numericMain * 100).toString();

    // 1. Create main local transaction
    await localDb.transactions.put({
      id: txId,
      userId: "local-user",
      type,
      occurredAt: parsedOccurredAtIso,
      description,
      notes,
      currency,
      amountMinor: mainMinor,
      personId,
      parentTransactionId: null,
      idempotencyKey: crypto.randomUUID(),
      tagIds: tagIdsRaw,
      entries: [
        {
          id: crypto.randomUUID(),
          transactionId: txId,
          accountId: sourceAccountId || destinationAccountId || null,
          direction: type === "income" ? "debit" : "credit",
          amountMinor: mainMinor,
          currency,
        },
      ],
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
    });

    // 2. Create local addon transactions
    for (const addon of cleanAddons) {
      const addonId = addon.id || crypto.randomUUID();
      const addonAmountFloat = parseFloat(addon.amount) || 0;
      const addonMinor = Math.round(addonAmountFloat * 100).toString();

      await localDb.transactions.put({
        id: addonId,
        userId: "local-user",
        type: addon.type || "expense",
        occurredAt: parsedOccurredAtIso,
        description: addon.description,
        notes: addon.notes || `Add-on to: ${description}`,
        currency,
        amountMinor: addonMinor,
        personId,
        parentTransactionId: txId,
        idempotencyKey: crypto.randomUUID(),
        tagIds: addon.tagIds || [],
        entries: [
          {
            id: crypto.randomUUID(),
            transactionId: addonId,
            accountId: addon.sourceAccountId || sourceAccountId || null,
            direction: "credit",
            amountMinor: addonMinor,
            currency,
          },
        ],
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Queue to outbox
    await enqueueOutboxOperation("CREATE_TRANSACTION", {
      type,
      amount: mainAmount,
      currency,
      description,
      notes,
      occurredAt: parsedOccurredAtIso,
      sourceAccountId,
      destinationAccountId,
      personId,
      tagIds: tagIdsRaw,
      addons: cleanAddons.map((a) => ({
        description: a.description,
        amount: a.amount,
        type: a.type || "expense",
        sourceAccountId: a.sourceAccountId || sourceAccountId || null,
        destinationAccountId: a.destinationAccountId || destinationAccountId || null,
        tagIds: a.tagIds || [],
        notes: a.notes || null,
      })),
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    // Convert local datetime to accurate ISO timestamp (preserving instant in UTC)
    const localDate = new Date(occurredAt);
    const occurredAtIso = !isNaN(localDate.getTime())
      ? localDate.toISOString()
      : new Date().toISOString();

    formData.set("occurredAt", occurredAtIso);

    // Filter valid addons (must have description and amount > 0)
    const validAddons = addons.filter(
      (a) => a.description.trim() && parseFloat(a.amount) > 0,
    );
    formData.set("addons", JSON.stringify(validAddons));

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    if (isOffline) {
      try {
        await saveOffline(formData, occurredAtIso, validAddons);
        toast.success(
          "Saved locally in offline mode! Transactions will sync automatically when back online.",
        );
        router.push(`/${locale}/transactions`);
      } catch (err: any) {
        setError(err?.message || "Failed to save offline");
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await createTransactionAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        toast.success("Transaction recorded successfully!");
        router.push(`/${locale}/transactions`);
      }
    } catch (err: any) {
      // Network failure fallback
      console.warn("Online submission failed, falling back to offline outbox:", err);
      try {
        await saveOffline(formData, occurredAtIso, validAddons);
        toast.info(
          "Network unreachable. Transaction saved locally in offline outbox!",
        );
        router.push(`/${locale}/transactions`);
      } catch (offlineErr: any) {
        setError(offlineErr?.message || "Failed to record transaction");
        setIsLoading(false);
      }
    }
  }

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
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" id="new-transaction-form">
        {/* Amount & Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Main Amount
            </label>
            <input
              type="text"
              name="amount"
              required
              value={mainAmount}
              onChange={(e) => setMainAmount(e.target.value)}
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
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
            placeholder="e.g. Grocery shopping, Flight ticket, Dinner with friends"
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
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
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

        {/* Date & Time (User's Local Timezone) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Date & Time (Local Time)
            </label>
            <span className="text-[11px] text-emerald-400 font-mono">
              Local Zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
          <input
            type="datetime-local"
            name="occurredAt"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Hierarchical Cascading Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Categories & Tags
          </label>
          <CascadingTagSelector tags={tags} />
        </div>

        {/* Addon Transactions Section */}
        <div className="pt-2 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-cyan-400" />
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Add-on Transactions
              </label>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                Coupled in Timeline
              </span>
            </div>
            <button
              type="button"
              onClick={() => addAddon()}
              className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2.5 py-1 rounded-xl transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Add-on</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" /> Quick add:
            </span>
            {[
              { label: "+ Delivery Fee", desc: "Delivery fee" },
              { label: "+ Service / Tip", desc: "Service Tip" },
              { label: "+ Tax / VAT", desc: "Tax / VAT" },
              { label: "+ Processing Fee", desc: "Processing fee" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addAddon(p.desc)}
                className="text-[11px] font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 hover:border-cyan-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Addon Rows */}
          {addons.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {addons.map((addon, index) => (
                <div
                  key={addon.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2 shadow-inner"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                    <span>Add-on #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAddon(addon.id)}
                      className="text-slate-400 hover:text-rose-400 transition p-1 cursor-pointer"
                      title="Remove addon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Addon Description (e.g. Delivery fee, Tip)"
                        value={addon.description}
                        onChange={(e) =>
                          updateAddon(addon.id, { description: e.target.value })
                        }
                        required
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Amount (e.g. 50.00)"
                        value={addon.amount}
                        onChange={(e) =>
                          updateAddon(addon.id, { amount: e.target.value })
                        }
                        required
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <select
                        value={addon.sourceAccountId || ""}
                        onChange={(e) =>
                          updateAddon(addon.id, { sourceAccountId: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Account: Inherit from main transaction</option>
                        {filteredAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            Pay from: {acc.name} ({acc.accountType})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={addon.type}
                        onChange={(e) =>
                          updateAddon(addon.id, { type: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="expense">Type: Expense</option>
                        <option value="income">Type: Income</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Calculated Total Summary */}
          {addons.length > 0 && (
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">
                Main: <strong className="font-mono text-white">{mainAmount || "0.00"} {currency}</strong>
                {" + "}
                Add-ons ({addons.length}): <strong className="font-mono text-cyan-400">{numericAddons.toFixed(2)} {currency}</strong>
              </span>
              <span className="font-bold text-slate-200">
                Grand Total: <span className="font-mono text-emerald-400 text-sm">{grandTotal.toFixed(2)} {currency}</span>
              </span>
            </div>
          )}
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
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-xl shadow-emerald-500/25 disabled:opacity-50 text-sm cursor-pointer"
          >
            {isLoading
              ? "Recording Ledger Transaction..."
              : addons.length > 0
              ? `Save Transaction + ${addons.length} Add-on${addons.length > 1 ? "s" : ""}`
              : "Save Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
