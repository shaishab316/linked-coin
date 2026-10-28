import React from "react";
import { requireUser } from "../../../../../features/auth/service";
import { listAccounts } from "../../../../../features/accounts/service";
import { listPeople } from "../../../../../features/people/service";
import { listTags } from "../../../../../features/tags/service";
import { getTransactionById } from "../../../../../features/ledger/service";
import { TransactionForm } from "../../../../../features/ledger/components/transaction-form";
import { getDictionary, type Locale } from "../../../../../lib/i18n";

interface NewTransactionPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    type?: string;
    id?: string;
    addonsForId?: string;
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

  const [accounts, people, tags, editTransaction, parentTransaction] = await Promise.all([
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
    queryParams.id
      ? getTransactionById(user.id, queryParams.id).catch(() => null)
      : Promise.resolve(null),
    queryParams.addonsForId
      ? getTransactionById(user.id, queryParams.addonsForId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const isEditing = !!editTransaction;
  const isAddonMode = !!queryParams.addonsForId;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          {isEditing ? (
            locale === "bn" ? "লেনদেন সম্পাদনা করুন" : "Edit Transaction"
          ) : isAddonMode ? (
            <>
              <span className="text-cyan-400">📎</span>
              <span>{locale === "bn" ? "অ্যাড-অন লেনদেন যোগ করুন" : "Add Add-on Transaction"}</span>
            </>
          ) : (
            t.transactionForm.newTitle
          )}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          {isEditing ? (
            locale === "bn"
              ? `আইডি: ${editTransaction.id.slice(0, 8)}... — "${editTransaction.description}"`
              : `Modifying transaction: "${editTransaction.description}"`
          ) : isAddonMode ? (
            parentTransaction ? (
              <span>
                Coupling an independent add-on to:{" "}
                <strong className="text-cyan-300">
                  &quot;{parentTransaction.description}&quot;
                </strong>
              </span>
            ) : (
              `Attaching add-on to transaction #${queryParams.addonsForId?.slice(0, 8)}...`
            )
          ) : (
            t.transactionForm.selectType
          )}
        </p>
      </div>

      <TransactionForm
        key={`${queryParams.id || ""}-${queryParams.addonsForId || ""}-${queryParams.type || ""}`}
        accounts={accounts}
        people={people}
        tags={tags}
        initialType={editTransaction?.type || queryParams.type || "expense"}
        editTransaction={editTransaction}
        addonsForId={queryParams.addonsForId}
        parentTransaction={parentTransaction}
      />
    </div>
  );
}
