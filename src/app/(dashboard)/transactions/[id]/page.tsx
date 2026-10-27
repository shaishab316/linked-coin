import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../features/auth/service";
import { getTransactionById } from "../../../../features/ledger/service";
import { ReverseTransactionDialog } from "../../../../features/ledger/components/reverse-transaction-dialog";
import { formatMoney } from "../../../../lib/money/money";
import { formatDateTime } from "../../../../lib/dates/format";

interface TransactionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;

  let tx;
  try {
    tx = await getTransactionById(user.id, id);
  } catch {
    notFound();
  }

  const isReversible = !tx.reversedAt && tx.type !== "reversal";

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="transaction-detail-page">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/transactions"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <span>&larr;</span>
          <span>Back to Transactions</span>
        </Link>

        {isReversible && <ReverseTransactionDialog transactionId={tx.id} />}
      </div>

      {/* Main Info Card */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-emerald-500/20">
                {tx.type.replace("_", " ")}
              </span>
              {tx.reversedAt ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Reversed
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Confirmed
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{tx.description}</h1>
            <p className="text-xs text-slate-400 mt-1">Occurred on {formatDateTime(tx.occurredAt)}</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-2xl font-black font-mono text-white">
              {formatMoney(tx.amountMinor, tx.currency)}
            </div>
            <div className="text-xs text-slate-500">{tx.currency} (Exact Minor Units)</div>
          </div>
        </div>

        {/* Notes */}
        {tx.notes && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-300">
            <div className="text-xs font-semibold text-slate-400 mb-1">Notes:</div>
            <div>{tx.notes}</div>
          </div>
        )}

        {/* Tags */}
        {tx.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tx.tags.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Double-Entry Balancing Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Balanced Double-Entry Ledger Legs
            </h2>
            <span className="text-xs text-emerald-400 font-medium">✓ Sum(Debit) == Sum(Credit)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-white/5 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Direction</th>
                  <th className="py-2.5 px-4">Target Leg</th>
                  <th className="py-2.5 px-4 text-right">Debit</th>
                  <th className="py-2.5 px-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tx.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 px-4 uppercase font-bold text-slate-300">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          entry.direction === "debit"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-cyan-500/20 text-cyan-400"
                        }`}
                      >
                        {entry.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {entry.accountId
                        ? "Account Leg"
                        : entry.personId
                          ? "Person Debt Leg"
                          : `External Category (${entry.externalKind})`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      {entry.direction === "debit" ? formatMoney(entry.amountMinor, entry.currency) : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-cyan-400">
                      {entry.direction === "credit" ? formatMoney(entry.amountMinor, entry.currency) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linked Transactions (Reversals / Repayments) */}
        {tx.linkedTransactions && tx.linkedTransactions.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Linked Financial Events
            </h3>
            <div className="space-y-2">
              {tx.linkedTransactions.map((linked) => (
                <Link
                  key={linked.id}
                  href={`/transactions/${linked.id}`}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {linked.linkType}
                    </span>
                    <span className="text-white font-medium">{linked.description}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatMoney(linked.amountMinor, linked.currency)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
