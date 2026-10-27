import React from "react";
import { requireUser } from "../../../../features/auth/service";
import { searchTransactions } from "../../../../features/query-builder/service";
import { parseQueryString, astToChips } from "../../../../features/query-builder/parser";
import { listAccounts } from "../../../../features/accounts/service";
import { listPeople } from "../../../../features/people/service";
import { listTags } from "../../../../features/tags/service";
import { getDictionary, type Locale } from "../../../../lib/i18n";
import { InteractiveQueryView } from "../../../../features/query-builder/components/InteractiveQueryView";

interface LocalizedQueryPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string;
    offset?: string;
  }>;
}

export default async function LocalizedQueryPage({
  params,
  searchParams,
}: LocalizedQueryPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const queryParams = await searchParams;
  const q = queryParams.q || "";
  const offset = parseInt(queryParams.offset || "0", 10);

  const ast = parseQueryString(q);
  ast.limit = 50;
  ast.offset = offset;

  const [result, accounts, people, tags] = await Promise.all([
    searchTransactions(user.id, ast),
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  const chips = astToChips(ast);

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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          {t.query.title}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          {t.query.subtitle}
        </p>
      </div>

      <InteractiveQueryView
        initialQuery={q}
        chips={chips}
        transactions={timelineItems}
        totalCount={result.totalCount}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
        basePath={`/${locale}/query`}
      />
    </div>
  );
}
