import React from "react";
import Link from "next/link";
import { requireUser } from "../../../../features/auth/service";
import { listPeople } from "../../../../features/people/service";
import { CreatePersonDialog } from "../../../../features/people/components/create-person-dialog";
import { EditPersonDialog } from "../../../../features/people/components/edit-person-dialog";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../lib/i18n";
import { User, Phone, HandCoins, ArrowDownLeft, ArrowUpRight, Tag as TagIcon } from "lucide-react";
import { db } from "../../../../db";
import { personTags, tags } from "../../../../db/schema";
import { eq } from "drizzle-orm";

interface LocalizedPeoplePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocalizedPeoplePage({ params }: LocalizedPeoplePageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const [people, allPersonTags] = await Promise.all([
    listPeople(user.id, true),
    db
      .select({ personId: personTags.personId, tagName: tags.name })
      .from(personTags)
      .innerJoin(tags, eq(personTags.tagId, tags.id)),
  ]);

  const tagsByPerson = allPersonTags.reduce((acc, row) => {
    if (!acc[row.personId]) acc[row.personId] = [];
    acc[row.personId].push(row.tagName);
    return acc;
  }, {} as Record<string, string[]>);

  const activePeople = people.filter((p) => !p.archivedAt);
  const archivedPeople = people.filter((p) => p.archivedAt);

  const defaultCurr = "BDT";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            {t.people.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t.people.subtitle}
          </p>
        </div>

        <CreatePersonDialog />
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePeople.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-500 rounded-3xl border border-slate-800 bg-slate-900/40">
            No contacts added yet. Click &apos;+ Add Contact&apos; above to record loans or debts.
          </div>
        ) : (
          activePeople.map((person) => {
            const hasDebt = person.outstandingMinor !== 0n;
            const owesYou = person.outstandingMinor > 0n;

            return (
              <Link
                key={person.id}
                href={`/${locale}/people/${person.id}`}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 p-5 shadow-xl transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                        !hasDebt
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : owesYou
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {!hasDebt
                        ? t.people.settled
                        : owesYou
                        ? t.people.owesYou
                        : t.people.youOwe}
                    </span>

                    <div className="flex items-center gap-2">
                      {person.contact && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[120px]">
                          <Phone className="h-3 w-3" />
                          {person.contact}
                        </span>
                      )}
                      <EditPersonDialog person={person} triggerVariant="icon" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm">
                      {person.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition">
                        {person.name}
                      </h3>
                      {person.notes && (
                        <p className="text-xs text-slate-500 line-clamp-1">{person.notes}</p>
                      )}
                    </div>
                  </div>

                  {tagsByPerson[person.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                      {tagsByPerson[person.id].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          <TagIcon className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">
                    {!hasDebt ? "Net Balance" : owesYou ? t.people.totalReceivable : t.people.totalPayable}
                  </span>
                  <span
                    className={`text-xl font-black tracking-tight ${
                      !hasDebt
                        ? "text-slate-400"
                        : owesYou
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {formatLocalizedAmount(person.outstandingMinor, defaultCurr, locale, true)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Archived People */}
      {archivedPeople.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {t.accounts.archived} ({archivedPeople.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivedPeople.map((person) => (
              <Link
                key={person.id}
                href={`/${locale}/people/${person.id}`}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 text-slate-400 hover:text-slate-200 transition flex items-center justify-between opacity-60 hover:opacity-100"
              >
                <span className="font-semibold text-sm">{person.name}</span>
                <span className="font-mono text-xs">
                  {formatLocalizedAmount(person.outstandingMinor, defaultCurr, locale, true)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
