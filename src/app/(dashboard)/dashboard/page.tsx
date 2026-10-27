import Link from "next/link";
import { requireUser } from "../../../features/auth/service";
import { getDashboardInsights } from "../../../features/insights/service";
import { listAccounts } from "../../../features/accounts/service";
import { searchTransactions } from "../../../features/query-builder/service";
import { formatMoney, DEFAULT_CURRENCY } from "../../../lib/money/money";
import { formatDate } from "../../../lib/dates/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const [insights, accounts, recentTxResult] = await Promise.all([
    getDashboardInsights(user.id, DEFAULT_CURRENCY),
    listAccounts(user.id),
    searchTransactions(user.id, { limit: 6, offset: 0 }),
  ]);

  const defaultNet = insights.netPositionByCurrency[DEFAULT_CURRENCY] || {
    assetsMinor: 0n,
    liabilitiesMinor: 0n,
    netMinor: 0n,
  };

  return (
    <div className="space-y-8" id="dashboard-page">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Financial Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative double-entry ledger &bull; Fully synchronized &bull; {DEFAULT_CURRENCY}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/transactions/new?type=expense"
            className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
          >
            - Expense
          </Link>
          <Link
            href="/transactions/new?type=income"
            className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
          >
            + Income
          </Link>
          <Link
            href="/transactions/new?type=transfer"
            className="px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold transition"
          >
            ⇄ Transfer
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Position */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="text-xs font-medium text-slate-400 mb-1">Net Worth</div>
          <div className={`text-2xl font-black ${defaultNet.netMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(defaultNet.netMinor, DEFAULT_CURRENCY)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>Assets: {formatMoney(defaultNet.assetsMinor, DEFAULT_CURRENCY)}</span>
            <span>Debt: {formatMoney(defaultNet.liabilitiesMinor, DEFAULT_CURRENCY)}</span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs font-medium text-slate-400 mb-1">Owned Cash & Bank</div>
          <div className="text-2xl font-black text-white">
            {formatMoney(defaultNet.assetsMinor, DEFAULT_CURRENCY)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
            <span>Across {accounts.length} registered accounts</span>
          </div>
        </div>

        {/* Receivables (Owed to you) */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs font-medium text-slate-400 mb-1">Money Lent (Receivable)</div>
          <div className="text-2xl font-black text-emerald-400">
            {formatMoney(insights.totalReceivablesMinor, DEFAULT_CURRENCY)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Owed to you by friends & borrowers
          </div>
        </div>

        {/* Payables (You owe) */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs font-medium text-slate-400 mb-1">Money Borrowed (Payable)</div>
          <div className="text-2xl font-black text-amber-400">
            {formatMoney(insights.totalPayablesMinor, DEFAULT_CURRENCY)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            You owe to others
          </div>
        </div>
      </div>

      {/* Visualizations: Monthly Cash Flow & Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash Flow Bars */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Cash Flow (Last 6 Months)</h2>
              <p className="text-xs text-slate-400">Excludes internal transfers between your own accounts</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Expense
              </span>
            </div>
          </div>

          {insights.monthlyCashFlow.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No cash flow records yet. Record income or expenses to see trends.
            </div>
          ) : (
            <div className="space-y-4">
              {insights.monthlyCashFlow.map((flow) => {
                const maxVal = Math.max(
                  Number(flow.incomeMinor),
                  Number(flow.expenseMinor),
                  100,
                );
                const incPct = (Number(flow.incomeMinor) / maxVal) * 100;
                const expPct = (Number(flow.expenseMinor) / maxVal) * 100;

                return (
                  <div key={flow.month} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{flow.month}</span>
                      <span className={`font-mono ${flow.netCashFlowMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                        Net: {formatMoney(flow.netCashFlowMinor, DEFAULT_CURRENCY)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 h-4 bg-slate-900/60 rounded-lg p-0.5 overflow-hidden">
                      {/* Income Bar */}
                      <div className="flex justify-end">
                        <div
                          className="bg-emerald-500 rounded-sm transition-all duration-500 h-full"
                          style={{ width: `${incPct}%` }}
                          title={`Income: ${formatMoney(flow.incomeMinor, DEFAULT_CURRENCY)}`}
                        />
                      </div>
                      {/* Expense Bar */}
                      <div className="flex justify-start">
                        <div
                          className="bg-rose-500 rounded-sm transition-all duration-500 h-full"
                          style={{ width: `${expPct}%` }}
                          title={`Expense: ${formatMoney(flow.expenseMinor, DEFAULT_CURRENCY)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Spending Breakdown */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Spending by Tag</h2>
            <p className="text-xs text-slate-400 mb-6">Current month expenses</p>

            {insights.spendingByTag.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No tagged expenses recorded this month.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.spendingByTag.slice(0, 5).map((tag) => (
                  <div key={tag.tagId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{tag.tagName}</span>
                      <span className="text-slate-400 font-mono">
                        {formatMoney(tag.totalMinor, DEFAULT_CURRENCY)} ({tag.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        style={{ width: `${tag.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/tags"
            className="mt-4 pt-3 border-t border-white/5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold block text-center"
          >
            Manage Tag Hierarchy &rarr;
          </Link>
        </div>
      </div>

      {/* Account Cards & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Accounts</h2>
            <Link href="/accounts" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
              View All ({accounts.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {accounts.slice(0, 5).map((acc) => (
              <Link
                key={acc.id}
                href={`/accounts/${acc.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 transition"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{acc.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.accountType}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">
                    {formatMoney(acc.balanceMinor, acc.currency)}
                  </div>
                  <div className="text-[10px] text-slate-500">{acc.currency}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Recent Financial Events</h2>
            <Link href="/transactions" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
              Browse All &rarr;
            </Link>
          </div>

          {recentTxResult.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No transactions recorded yet. Click &quot;New Transaction&quot; to begin.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTxResult.items.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        tx.type === "income"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : tx.type === "expense"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : tx.type === "transfer"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      }`}
                    >
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "⇄"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.reversedAt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Reversed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{formatDate(tx.occurredAt)}</span>
                        <span>&bull;</span>
                        <span className="capitalize">{tx.type.replace("_", " ")}</span>
                        {tx.tags.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-400">{tx.tags.map((t) => t.name).join(", ")}</span>
                          </>
                        )}
                      </div>
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
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
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
    </div>
  );
}
