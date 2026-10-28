import React from "react";
import Link from "next/link";
import { requireUser } from "../../../../features/auth/service";
import { searchTransactions } from "../../../../features/query-builder/service";
import { listAccounts } from "../../../../features/accounts/service";
import { listPeople } from "../../../../features/people/service";
import { listTags } from "../../../../features/tags/service";
import { getDictionary, type Locale } from "../../../../lib/i18n";
import { InteractiveTimelineView } from "../../../../components/timeline/InteractiveTimelineView";
import { PlusCircle, Search } from "lucide-react";

interface TransactionsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function TransactionsPage({ params }: TransactionsPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const [result, accounts, people, allTags] = await Promise.all([
    searchTransactions(user.id, { limit: 100, offset: 0 }),
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const personMap = new Map(people.map((p) => [p.id, p.name]));

  const timelineItems = result.items.map((tx) => {
    const primaryEntry = tx.entries.find((e) => e.accountId);
    const accountName = primaryEntry?.accountId ? accountMap.get(primaryEntry.accountId) : null;
    const personName = tx.personId ? personMap.get(tx.personId) : null;

    return {
      id: tx.id,
      type: tx.type,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      description: tx.description,
      notes: tx.notes,
      occurredAt: tx.occurredAt.toISOString(),
      reversedAt: tx.reversedAt?.toISOString() || null,
      reversesTransactionId: tx.reversesTransactionId,
      parentTransactionId: tx.parentTransactionId || null,
      isAddon: !!tx.parentTransactionId,
      addons: tx.addonTransactions?.map((a) => ({
        id: a.id,
        type: a.type,
        amountMinor: a.amountMinor,
        currency: a.currency,
        description: a.description,
        occurredAt: a.occurredAt.toISOString(),
      })),
      personName,
      accountName,
      tags: tx.tags.map((t) => ({ id: t.id, name: t.name })),
      entries: tx.entries.map((e) => ({
        id: e.id,
        direction: e.direction,
        amountMinor: e.amountMinor,
        currency: e.currency,
        accountName: e.accountId ? accountMap.get(e.accountId) : undefined,
        externalKind: e.externalKind || undefined,
      })),
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            {t.nav.transactions}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t.timeline.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/query`}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:border-slate-700 transition"
          >
            <Search className="h-4 w-4 text-emerald-400" />
            <span>{t.nav.query}</span>
          </Link>

          <Link
            href={`/${locale}/transactions/new`}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{t.nav.newTransaction}</span>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md p-3.5 sm:p-6 shadow-2xl">
        <InteractiveTimelineView
          transactions={timelineItems}
          allTags={allTags}
          currency="BDT"
          basePath={`/${locale}/transactions`}
          userTimezone={user.timezone}
        />
      </div>
    </div>
  );
}
