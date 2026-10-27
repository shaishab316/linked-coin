import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../../features/auth/service";
import { getAccountById } from "../../../../../features/accounts/service";
import { archiveAccountAction, restoreAccountAction } from "../../../../../features/accounts/actions";
import { searchTransactions } from "../../../../../features/query-builder/service";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../../lib/i18n";
import { InteractiveTimelineView } from "../../../../../components/timeline/InteractiveTimelineView";
import { ArrowLeft, Archive, RotateCcw, Wallet } from "lucide-react";

interface AccountDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function LocalizedAccountDetailPage({ params }: AccountDetailPageProps) {
  const user = await requireUser();
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  let account;
  try {
    account = await getAccountById(user.id, id);
  } catch {
    notFound();
  }

  const txResult = await searchTransactions(user.id, {
    accountIds: [account.id],
    limit: 50,
    offset: 0,
  });

  const timelineItems = txResult.items.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    currency: tx.currency,
    description: tx.description,
    notes: tx.notes,
    occurredAt: tx.occurredAt.toISOString(),
    reversedAt: tx.reversedAt?.toISOString() || null,
    reversesTransactionId: tx.reversesTransactionId,
    accountName: account.name,
    tags: tx.tags.map((t) => ({ id: t.id, name: t.name })),
    entries: tx.entries.map((e) => ({
      id: e.id,
      direction: e.direction,
      amountMinor: e.amountMinor,
      currency: e.currency,
      accountName: account.name,
      externalKind: e.externalKind || undefined,
    })),
  }));

  const isArchived = !!account.archivedAt;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/accounts`}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back} {t.nav.accounts}</span>
        </Link>

        {isArchived ? (
          <form action={restoreAccountAction.bind(null, account.id)}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.accounts.restoreAccount}</span>
            </button>
          </form>
        ) : (
          <form action={archiveAccountAction.bind(null, account.id)}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{t.accounts.archiveAccount}</span>
            </button>
          </form>
        )}
      </div>

      {/* Account Info Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {account.accountType}
            </span>
            {isArchived && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {t.accounts.archived}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">{account.name}</h2>
          {account.description && (
            <p className="text-xs text-slate-400 mt-1">{account.description}</p>
          )}
        </div>

        <div className="sm:text-right">
          <span className="text-xs text-slate-400 block">{t.accounts.currentBalance}</span>
          <span className="text-3xl font-black text-slate-100 tracking-tight">
            {formatLocalizedAmount(account.balanceMinor, account.currency, locale, false)}
          </span>
        </div>
      </div>

      {/* Account Transactions in Timeline View */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100">{t.timeline.title}</h3>
        <InteractiveTimelineView
          transactions={timelineItems}
          currency={account.currency}
          basePath={`/${locale}/transactions`}
        />
      </div>
    </div>
  );
}
