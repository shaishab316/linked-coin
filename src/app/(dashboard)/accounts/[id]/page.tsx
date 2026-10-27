import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../features/auth/service";
import { getAccountById } from "../../../../features/accounts/service";
import { archiveAccountAction, restoreAccountAction } from "../../../../features/accounts/actions";
import { searchTransactions } from "../../../../features/query-builder/service";
import { formatMoney } from "../../../../lib/money/money";
import { formatDate } from "../../../../lib/dates/format";

interface AccountDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="account-detail-page">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/accounts" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition">
          <span>&larr;</span>
          <span>Back to Accounts</span>
        </Link>

        {account.archivedAt ? (
          <form action={restoreAccountAction.bind(null, account.id)}>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition"
            >
              Restore Account
            </button>
          </form>
        ) : (
          <form action={archiveAccountAction.bind(null, account.id)}>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
            >
              Archive Account
            </button>
          </form>
        )}
      </div>

      {/* Account Info Card */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {account.accountType.replace("_", " ")}
            </span>
            {account.archivedAt && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Archived
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{account.name}</h1>
          {account.description && <p className="text-xs text-slate-400 mt-1">{account.description}</p>}
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Current Balance
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {formatMoney(account.balanceMinor, account.currency)}
          </div>
          <div className="text-xs text-slate-500">{account.currency}</div>
        </div>
      </div>

      {/* Account Transaction History */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Account Ledger History</h2>

        {txResult.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No transactions found for this account.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {txResult.items.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{tx.description}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{formatDate(tx.occurredAt)}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{tx.type.replace("_", " ")}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div
                    className={`text-sm font-bold ${
                      tx.type === "income"
                        ? "text-emerald-400"
                        : tx.type === "expense"
                          ? "text-rose-400"
                          : "text-slate-200"
                    }`}
                  >
                    {formatMoney(tx.amountMinor, tx.currency)}
                  </div>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="text-[11px] text-slate-500 hover:text-emerald-400 transition"
                  >
                    Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
