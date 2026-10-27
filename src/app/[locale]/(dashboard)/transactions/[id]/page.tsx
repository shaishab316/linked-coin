import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../../features/auth/service";
import { getTransactionById } from "../../../../../features/ledger/service";
import { listAccounts } from "../../../../../features/accounts/service";
import { ReverseTransactionDialog } from "../../../../../features/ledger/components/reverse-transaction-dialog";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../../lib/i18n";
import { formatDateTime } from "../../../../../lib/dates/format";
import { ArrowLeft, Clock, ShieldCheck, Tag as TagIcon, Wallet, User } from "lucide-react";

interface TransactionDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function LocalizedTransactionDetailPage({ params }: TransactionDetailPageProps) {
  const user = await requireUser();
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  let tx;
  let accounts;
  try {
    [tx, accounts] = await Promise.all([
      getTransactionById(user.id, id),
      listAccounts(user.id),
    ]);
  } catch {
    notFound();
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const isReversible = !tx.reversedAt && tx.type !== "reversal";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/transactions`}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back}</span>
        </Link>

        {isReversible && <ReverseTransactionDialog transactionId={tx.id} />}
      </div>

      {/* Main Info Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-emerald-500/20">
                {tx.type.replace(/_/g, " ")}
              </span>
              {tx.reversedAt ? (
                <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {t.timeline.reversedBadge}
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t.common.status}: Confirmed
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-100">{tx.description}</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{formatDateTime(tx.occurredAt)}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">{t.common.amount}</span>
            <span
              className={`text-3xl font-black tracking-tight ${
                tx.reversedAt ? "line-through text-slate-500" : "text-emerald-400"
              }`}
            >
              {formatLocalizedAmount(tx.amountMinor, tx.currency, locale, false)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {tx.notes && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-xs font-semibold text-slate-400 block mb-1">{t.common.notes}:</span>
            <p className="text-sm text-slate-200">{tx.notes}</p>
          </div>
        )}

        {/* Tags */}
        {tx.tags && tx.tags.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">{t.nav.tags}:</span>
            <div className="flex flex-wrap gap-2">
              {tx.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400"
                >
                  <TagIcon className="h-3.5 w-3.5" />
                  <span>{tag.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Balanced Ledger Entries (Double-Entry Verification) */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Double-Entry Ledger Legs (Balanced)
          </span>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden divide-y divide-slate-800/80">
            {tx.entries.map((entry) => (
              <div key={entry.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-lg ${
                      entry.direction === "debit"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {entry.direction}
                  </span>
                  <span className="text-slate-200 font-medium">
                    {entry.accountId
                      ? (accountMap.get(entry.accountId) || "Account")
                      : (entry.externalKind ? `External (${entry.externalKind})` : "Account")}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {formatLocalizedAmount(entry.amountMinor, entry.currency, locale, false)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
