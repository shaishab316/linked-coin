import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../features/auth/service";
import { getPersonById } from "../../../../features/people/service";
import { archivePersonAction, restorePersonAction } from "../../../../features/people/actions";
import { searchTransactions } from "../../../../features/query-builder/service";
import { formatMoney, DEFAULT_CURRENCY } from "../../../../lib/money/money";
import { formatDate } from "../../../../lib/dates/format";

interface PersonDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;

  let person;
  try {
    person = await getPersonById(user.id, id);
  } catch {
    notFound();
  }

  const txResult = await searchTransactions(user.id, {
    personIds: [person.id],
    limit: 50,
    offset: 0,
  });

  const hasDebt = person.outstandingMinor !== 0n;
  const owesYou = person.outstandingMinor > 0n;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="person-detail-page">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/people" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition">
          <span>&larr;</span>
          <span>Back to People</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/transactions/new?type=${owesYou ? "repayment_received" : "repayment_made"}&personId=${person.id}`}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
          >
            Record Repayment
          </Link>

          {person.archivedAt ? (
            <form action={restorePersonAction.bind(null, person.id)}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition"
              >
                Restore
              </button>
            </form>
          ) : (
            <form action={archivePersonAction.bind(null, person.id)}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
              >
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Person Summary Card */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                !hasDebt
                  ? "bg-slate-800 text-slate-400 border border-white/5"
                  : owesYou
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {!hasDebt ? "Settled" : owesYou ? "Receivable (Owes You)" : "Payable (You Owe)"}
            </span>
            {person.contact && (
              <span className="text-xs text-slate-400">&bull; {person.contact}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{person.name}</h1>
          {person.notes && <p className="text-xs text-slate-400 mt-1">{person.notes}</p>}
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {!hasDebt ? "Outstanding Balance" : owesYou ? "Owed to You" : "You Owe"}
          </div>
          <div
            className={`text-3xl font-black font-mono ${
              !hasDebt ? "text-slate-400" : owesYou ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {formatMoney(
              owesYou ? person.outstandingMinor : -person.outstandingMinor,
              DEFAULT_CURRENCY,
            )}
          </div>
          <div className="text-xs text-slate-500">{DEFAULT_CURRENCY}</div>
        </div>
      </div>

      {/* Loan & Debt History */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Debt & Repayment History</h2>

        {txResult.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No loans or repayments recorded for this person yet.
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
                      tx.type === "loan_given" || tx.type === "repayment_made"
                        ? "text-emerald-400"
                        : "text-amber-400"
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
