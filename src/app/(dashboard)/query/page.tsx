import Link from "next/link";
import { requireUser } from "../../../features/auth/service";
import { searchTransactions, listSavedQueries } from "../../../features/query-builder/service";
import { parseQueryString, astToChips } from "../../../features/query-builder/parser";
import { listAccounts } from "../../../features/accounts/service";
import { listPeople } from "../../../features/people/service";
import { listTags } from "../../../features/tags/service";
import { formatMoney } from "../../../lib/money/money";
import { formatDate } from "../../../lib/dates/format";

interface QueryPageProps {
  searchParams: Promise<{
    q?: string;
    offset?: string;
  }>;
}

export default async function QueryPage({ searchParams }: QueryPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q || "";
  const offset = parseInt(params.offset || "0", 10);

  const ast = parseQueryString(q);
  ast.limit = 50;
  ast.offset = offset;

  const [result, savedQueriesList, accounts, people, tags] = await Promise.all([
    searchTransactions(user.id, ast),
    listSavedQueries(user.id),
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  const chips = astToChips(ast);

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="query-builder-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Unified Query Builder</h1>
        <p className="text-sm text-slate-400 mt-1">
          Perform complex multi-attribute searches and inspect ledger events across any dimension.
        </p>
      </div>

      {/* Query Bar */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <form method="GET" className="flex items-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder='e.g. tag:Food account:Cash amount:>500 type:expense date:2026-01-01..2026-12-31'
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
          >
            Execute Query
          </button>
        </form>

        {/* Filter Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-xs text-slate-400 font-semibold mr-1">Active Filters:</span>
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
              >
                <span className="font-semibold">{chip.label}:</span>
                <span>{chip.value}</span>
              </span>
            ))}
            <Link href="/query" className="text-xs text-slate-500 hover:text-rose-400 ml-2">
              Reset Query
            </Link>
          </div>
        )}

        {/* Quick Query Helpers */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold">Quick Samples:</span>
          <Link
            href="/query?q=type:expense+amount:>1000"
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5"
          >
            Large Expenses (&gt;1000)
          </Link>
          <Link
            href="/query?q=type:loan_given"
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5"
          >
            All Loans Given
          </Link>
          <Link
            href="/query?q=type:transfer"
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5"
          >
            Account Transfers
          </Link>
        </div>
      </div>

      {/* Query Results */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            Matching Transactions ({result.totalCount})
          </span>
          <a
            href={`/api/export/transactions?q=${encodeURIComponent(q)}`}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>📥</span>
            <span>Download CSV Results</span>
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    No transactions match this query AST.
                  </td>
                </tr>
              ) : (
                result.items.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-bold text-slate-300 whitespace-nowrap">
                      {tx.type.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{tx.description}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.map((t) => (
                          <span
                            key={t.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatMoney(tx.amountMinor, tx.currency)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
