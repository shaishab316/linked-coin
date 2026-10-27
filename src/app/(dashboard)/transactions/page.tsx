import Link from "next/link";
import { requireUser } from "../../../features/auth/service";
import { searchTransactions } from "../../../features/query-builder/service";
import { parseQueryString, astToChips } from "../../../features/query-builder/parser";
import { formatMoney, DEFAULT_CURRENCY } from "../../../lib/money/money";
import { formatDate } from "../../../lib/dates/format";

interface TransactionsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    offset?: string;
    limit?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q || "";
  const typeFilter = params.type;
  const offset = parseInt(params.offset || "0", 10);
  const limit = parseInt(params.limit || "20", 10);

  const ast = parseQueryString(q);
  if (typeFilter && typeFilter !== "all") {
    ast.transactionTypes = [typeFilter];
  }
  ast.limit = limit;
  ast.offset = offset;

  const result = await searchTransactions(user.id, ast);
  const chips = astToChips(ast);

  const filterTabs = [
    { label: "All", value: "all" },
    { label: "Expenses", value: "expense" },
    { label: "Income", value: "income" },
    { label: "Transfers", value: "transfer" },
    { label: "Loans Given", value: "loan_given" },
    { label: "Loans Received", value: "loan_received" },
    { label: "Repayments", value: "repayment_received" },
    { label: "Reversals", value: "reversal" },
  ];

  return (
    <div className="space-y-6" id="transactions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-400">Complete, append-only history of financial events.</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/export/transactions?q=${encodeURIComponent(q)}`}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition flex items-center gap-2"
            id="btn-export-csv"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </a>
          <Link
            href="/transactions/new"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            id="btn-create-transaction"
          >
            + New Transaction
          </Link>
        </div>
      </div>

      {/* Query Bar & Filters */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        <form method="GET" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder='Filter e.g. "tag:Food amount:>500 type:expense date:2026-01-01..2026-01-31"'
            className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-white/10"
          >
            Filter
          </button>
        </form>

        {/* Filter Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
              >
                <span className="font-semibold">{chip.label}:</span>
                <span>{chip.value}</span>
              </span>
            ))}
            <Link href="/transactions" className="text-xs text-slate-500 hover:text-rose-400 self-center ml-2">
              Clear All
            </Link>
          </div>
        )}

        {/* Type Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {filterTabs.map((tab) => {
            const isSelected = (!typeFilter && tab.value === "all") || typeFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/transactions?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(tab.value !== "all" ? { type: tab.value } : {}),
                }).toString()}`}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" id="transactions-table">
            <thead className="bg-slate-900/80 border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                result.items.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                          tx.type === "income"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : tx.type === "expense"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : tx.type === "transfer"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        }`}
                      >
                        {tx.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.reversedAt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Reversed
                          </span>
                        )}
                      </div>
                      {tx.notes && <div className="text-xs text-slate-500 truncate max-w-xs">{tx.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.map((t) => (
                          <span
                            key={t.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          tx.type === "income"
                            ? "text-emerald-400"
                            : tx.type === "expense"
                              ? "text-rose-400"
                              : "text-slate-200"
                        }
                      >
                        {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                        {formatMoney(tx.amountMinor, tx.currency)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-900/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{result.items.length}</span> of{" "}
            <span className="font-semibold text-white">{result.totalCount}</span> records
          </div>

          <div className="flex items-center gap-2">
            {offset > 0 && (
              <Link
                href={`/transactions?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(typeFilter ? { type: typeFilter } : {}),
                  offset: Math.max(0, offset - limit).toString(),
                  limit: limit.toString(),
                }).toString()}`}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition border border-white/10"
              >
                &larr; Previous
              </Link>
            )}

            {result.hasMore && (
              <Link
                href={`/transactions?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(typeFilter ? { type: typeFilter } : {}),
                  offset: result.nextOffset.toString(),
                  limit: limit.toString(),
                }).toString()}`}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition border border-white/10"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
