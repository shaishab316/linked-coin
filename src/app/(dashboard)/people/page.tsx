import Link from "next/link";
import { requireUser } from "../../../features/auth/service";
import { listPeople } from "../../../features/people/service";
import { CreatePersonDialog } from "../../../features/people/components/create-person-dialog";
import { formatMoney, DEFAULT_CURRENCY } from "../../../lib/money/money";

export default async function PeoplePage() {
  const user = await requireUser();
  const people = await listPeople(user.id, true);

  const activePeople = people.filter((p) => !p.archivedAt);
  const archivedPeople = people.filter((p) => p.archivedAt);

  return (
    <div className="space-y-6" id="people-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">People & Personal Debts</h1>
          <p className="text-sm text-slate-400">
            Track money owed to or by people. Accurately separate receivables from regular income.
          </p>
        </div>

        <CreatePersonDialog />
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePeople.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-500 glass-panel rounded-2xl">
            No contacts added yet. Add a contact above to track personal debts.
          </div>
        ) : (
          activePeople.map((person) => {
            const hasDebt = person.outstandingMinor !== 0n;
            const owesYou = person.outstandingMinor > 0n;

            return (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="glass-card p-5 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        !hasDebt
                          ? "bg-slate-800 text-slate-400 border border-white/5"
                          : owesYou
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {!hasDebt ? "Settled" : owesYou ? "Receivable" : "Payable"}
                    </span>
                    {person.contact && (
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">
                        {person.contact}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{person.name}</h3>
                  {person.notes && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{person.notes}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">
                    {!hasDebt ? "Outstanding" : owesYou ? "Owes you" : "You owe"}
                  </span>
                  <span
                    className={`text-lg font-mono font-black ${
                      !hasDebt
                        ? "text-slate-400"
                        : owesYou
                          ? "text-emerald-400"
                          : "text-amber-400"
                    }`}
                  >
                    {formatMoney(
                      owesYou ? person.outstandingMinor : -person.outstandingMinor,
                      DEFAULT_CURRENCY,
                    )}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Archived Contacts */}
      {archivedPeople.length > 0 && (
        <div className="pt-6 border-t border-white/5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Archived Contacts ({archivedPeople.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archivedPeople.map((person) => (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="glass-card p-4 rounded-xl flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{person.name}</div>
                  <div className="text-[10px] text-slate-400">Archived</div>
                </div>
                <div className="text-sm font-mono text-slate-300">
                  {formatMoney(person.outstandingMinor, DEFAULT_CURRENCY)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
