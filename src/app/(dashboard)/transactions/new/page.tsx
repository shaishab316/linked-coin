import { requireUser } from "../../../../features/auth/service";
import { listAccounts } from "../../../../features/accounts/service";
import { listPeople } from "../../../../features/people/service";
import { listTags } from "../../../../features/tags/service";
import { TransactionForm } from "../../../../features/ledger/components/transaction-form";

interface NewTransactionPageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function NewTransactionPage({ searchParams }: NewTransactionPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const [accounts, people, tags] = await Promise.all([
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  return (
    <div className="space-y-6" id="new-transaction-page">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white tracking-tight">Record Financial Event</h1>
        <p className="text-sm text-slate-400 mt-1">
          Each transaction generates balanced double-entry legs committed atomically.
        </p>
      </div>

      <TransactionForm
        accounts={accounts}
        people={people}
        tags={tags}
        initialType={params.type || "expense"}
      />
    </div>
  );
}
