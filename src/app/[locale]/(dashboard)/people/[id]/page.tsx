import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../../features/auth/service";
import { getPersonById } from "../../../../../features/people/service";
import { archivePersonAction, restorePersonAction } from "../../../../../features/people/actions";
import { searchTransactions } from "../../../../../features/query-builder/service";
import { listTags, getPersonTagIds } from "../../../../../features/tags/service";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../../lib/i18n";
import { InteractiveTimelineView } from "../../../../../components/timeline/InteractiveTimelineView";
import { PersonTagsSection } from "../../../../../features/tags/components/person-tags-section";
import { EditPersonDialog } from "../../../../../features/people/components/edit-person-dialog";
import { SharePersonDialog } from "../../../../../features/people/components/share-person-dialog";
import { ArrowLeft, Archive, RotateCcw, HandCoins, ArrowDownLeft, ArrowUpRight, Phone } from "lucide-react";

interface PersonDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function LocalizedPersonDetailPage({ params }: PersonDetailPageProps) {
  const user = await requireUser();
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  let person;
  try {
    person = await getPersonById(user.id, id);
  } catch {
    notFound();
  }

  const [txResult, personTagIds, personTags] = await Promise.all([
    searchTransactions(user.id, {
      personIds: [person.id],
      limit: 50,
      offset: 0,
    }),
    getPersonTagIds(person.id),
    listTags(user.id, false, "person"),
  ]);

  const timelineItems = txResult.items.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    currency: tx.currency,
    description: tx.description,
    notes: tx.notes,
    occurredAt: tx.occurredAt.toISOString(),
    reversedAt: tx.reversedAt?.toISOString() || null,
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
    personName: person.name,
    tags: tx.tags.map((t) => ({ id: t.id, name: t.name })),
    entries: tx.entries.map((e) => ({
      id: e.id,
      direction: e.direction,
      amountMinor: e.amountMinor,
      currency: e.currency,
      externalKind: e.externalKind || undefined,
    })),
  }));

  const isArchived = !!person.archivedAt;
  const defaultCurr = "BDT";
  const hasDebt = person.outstandingMinor !== 0n;
  const owesYou = person.outstandingMinor > 0n;
  const absOutstanding =
    person.outstandingMinor < 0n ? -person.outstandingMinor : person.outstandingMinor;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/people`}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back} {t.nav.people}</span>
        </Link>

        {isArchived ? (
          <form action={restorePersonAction.bind(null, person.id)}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.accounts.restoreAccount}</span>
            </button>
          </form>
        ) : (
          <form action={archivePersonAction.bind(null, person.id)}>
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

      {/* Person Header Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 font-extrabold text-lg">
              {person.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-100">{person.name}</h2>
                <EditPersonDialog person={person} triggerVariant="button" />
                <SharePersonDialog person={person} locale={locale} />
              </div>
              {person.contact && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{person.contact}</span>
                </p>
              )}
            </div>
          </div>
          {person.notes && (
            <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-xl">
              &quot;{person.notes}&quot;
            </p>
          )}

          {/* Person Tags */}
          <PersonTagsSection
            personId={person.id}
            availableTags={personTags}
            selectedTagIds={personTagIds}
          />
        </div>

        {/* Outstanding Balance & Quick Actions */}
        <div className="flex flex-col sm:items-end gap-3">
          <div>
            <span className="text-xs text-slate-400 block sm:text-right">
              {!hasDebt ? "Net Status" : owesYou ? t.people.owesYou : t.people.youOwe}
            </span>
            <span
              className={`text-3xl font-black tracking-tight ${
                !hasDebt ? "text-slate-400" : owesYou ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatLocalizedAmount(absOutstanding, defaultCurr, locale, false)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/transactions/new?type=loan_given`}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{t.people.giveLoan}</span>
            </Link>

            <Link
              href={`/${locale}/transactions/new?type=repayment_received`}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>{t.people.recordRepayment}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contact History in Interactive Timeline */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100">{t.people.contactHistory}</h3>
        <InteractiveTimelineView
          transactions={timelineItems}
          currency={defaultCurr}
          basePath={`/${locale}/transactions`}
        />
      </div>
    </div>
  );
}
