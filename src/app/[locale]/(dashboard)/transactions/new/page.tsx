import React from "react";
import { requireUser } from "../../../../../features/auth/service";
import { listAccounts } from "../../../../../features/accounts/service";
import { listPeople } from "../../../../../features/people/service";
import { listTags } from "../../../../../features/tags/service";
import { TransactionForm } from "../../../../../features/ledger/components/transaction-form";
import { getDictionary, type Locale } from "../../../../../lib/i18n";

interface NewTransactionPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function LocalizedNewTransactionPage({
  params,
  searchParams,
}: NewTransactionPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const queryParams = await searchParams;

  const [accounts, people, tags] = await Promise.all([
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          {t.transactionForm.newTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          {t.transactionForm.selectType}
        </p>
      </div>

      <TransactionForm
        accounts={accounts}
        people={people}
        tags={tags}
        initialType={queryParams.type || "expense"}
      />
    </div>
  );
}
