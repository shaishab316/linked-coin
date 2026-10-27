import React from "react";
import Link from "next/link";
import { requireUser } from "../../../../features/auth/service";
import { listAccounts } from "../../../../features/accounts/service";
import { CreateAccountDialog } from "../../../../features/accounts/components/create-account-dialog";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../lib/i18n";
import { Wallet, Building2, PiggyBank, Smartphone, CreditCard, Layers, Tag as TagIcon } from "lucide-react";
import { db } from "../../../../db";
import { accountTags, tags } from "../../../../db/schema";
import { eq } from "drizzle-orm";

interface LocalizedAccountsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocalizedAccountsPage({ params }: LocalizedAccountsPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const [accounts, allAccountTags] = await Promise.all([
    listAccounts(user.id, true),
    db
      .select({ accountId: accountTags.accountId, tagName: tags.name })
      .from(accountTags)
      .innerJoin(tags, eq(accountTags.tagId, tags.id)),
  ]);

  const tagsByAccount = allAccountTags.reduce((acc, row) => {
    if (!acc[row.accountId]) acc[row.accountId] = [];
    acc[row.accountId].push(row.tagName);
    return acc;
  }, {} as Record<string, string[]>);

  const activeAccounts = accounts.filter((a) => !a.archivedAt);
  const archivedAccounts = accounts.filter((a) => a.archivedAt);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "bank":
        return Building2;
      case "savings":
        return PiggyBank;
      case "wallet":
        return Smartphone;
      case "credit":
        return CreditCard;
      case "cash":
        return Wallet;
      default:
        return Layers;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            {t.accounts.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t.accounts.subtitle}
          </p>
        </div>

        <CreateAccountDialog />
      </div>

      {/* Active Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAccounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-500 rounded-3xl border border-slate-800 bg-slate-900/40">
            No accounts found. Create your first account above!
          </div>
        ) : (
          activeAccounts.map((acc) => {
            const Icon = getAccountIcon(acc.accountType);
            return (
              <Link
                key={acc.id}
                href={`/${locale}/accounts/${acc.id}`}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 p-5 shadow-xl transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {acc.accountType}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{acc.currency}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition mb-1">
                    {acc.name}
                  </h3>
                  {acc.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{acc.description}</p>
                  )}

                  {tagsByAccount[acc.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                      {tagsByAccount[acc.id].map((tag) => (
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
                  <span className="text-xs text-slate-400">{t.accounts.currentBalance}</span>
                  <span className="text-xl font-black text-slate-100 tracking-tight">
                    {formatLocalizedAmount(acc.balanceMinor, acc.currency, locale, false)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {t.accounts.archived} ({archivedAccounts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivedAccounts.map((acc) => (
              <Link
                key={acc.id}
                href={`/${locale}/accounts/${acc.id}`}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 text-slate-400 hover:text-slate-200 transition flex items-center justify-between opacity-60 hover:opacity-100"
              >
                <span className="font-semibold text-sm">{acc.name}</span>
                <span className="font-mono text-xs">
                  {formatLocalizedAmount(acc.balanceMinor, acc.currency, locale, false)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
