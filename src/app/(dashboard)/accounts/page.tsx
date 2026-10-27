import Link from "next/link";
import { requireUser } from "../../../features/auth/service";
import { listAccounts } from "../../../features/accounts/service";
import { CreateAccountDialog } from "../../../features/accounts/components/create-account-dialog";
import { formatMoney } from "../../../lib/money/money";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id, true);

  const activeAccounts = accounts.filter((a) => !a.archivedAt);
  const archivedAccounts = accounts.filter((a) => a.archivedAt);

  return (
    <div className="space-y-6" id="accounts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Accounts</h1>
          <p className="text-sm text-slate-400">
            Cash, bank accounts, digital wallets, and custom accounts.
          </p>
        </div>

        <CreateAccountDialog />
      </div>

      {/* Active Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAccounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-500 glass-panel rounded-2xl">
            No active accounts. Create your first account above.
          </div>
        ) : (
          activeAccounts.map((acc) => (
            <Link
              key={acc.id}
              href={`/accounts/${acc.id}`}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {acc.accountType.replace("_", " ")}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{acc.currency}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{acc.name}</h3>
                {acc.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">{acc.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Live Balance</span>
                <span className="text-lg font-mono font-black text-white">
                  {formatMoney(acc.balanceMinor, acc.currency)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <div className="pt-6 border-t border-white/5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Archived Accounts ({archivedAccounts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archivedAccounts.map((acc) => (
              <Link
                key={acc.id}
                href={`/accounts/${acc.id}`}
                className="glass-card p-4 rounded-xl flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{acc.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{acc.accountType} &bull; Archived</div>
                </div>
                <div className="text-sm font-mono text-slate-300">
                  {formatMoney(acc.balanceMinor, acc.currency)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
