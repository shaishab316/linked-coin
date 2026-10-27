import Link from "next/link";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { getPersonBalances } from "@/features/ledger/queries";
import { setPersonArchivedAction } from "@/features/people/actions";
import { CreatePersonForm } from "@/features/people/components/create-person-form";
import { listPeopleForUser } from "@/features/people/service";
import { formatMoney } from "@/lib/money/money";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await requireUser();
  const db = getDb();
  const [people, balances] = await Promise.all([
    listPeopleForUser(db, user.id),
    getPersonBalances(db, user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-ink-muted">
          Track money you lent, money you borrowed, and partial repayments.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Contacts</h2>

          {people.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
              No people yet. Add someone to record loans and repayments.
            </p>
          ) : (
            <ul className="space-y-2">
              {people.map((person) => {
                const personBalances = balances.filter(
                  (balance) => balance.personId === person.id,
                );

                return (
                  <li
                    key={person.id}
                    className="rounded-lg border border-border-subtle bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link href={`/people/${person.id}`} className="min-w-0">
                        <p className="truncate font-medium">{person.name}</p>
                        <p className="text-xs text-ink-muted">
                          {person.contact ?? "no contact"}
                          {person.archivedAt ? " · archived" : ""}
                        </p>
                      </Link>

                      <div className="flex flex-wrap items-center gap-3">
                        {personBalances.length === 0 ? (
                          <span className="text-xs text-ink-muted">
                            settled
                          </span>
                        ) : (
                          personBalances.map((balance) => (
                            <span
                              key={balance.currency}
                              className={`font-mono text-sm ${
                                balance.netMinor > 0n
                                  ? "text-emerald-700"
                                  : "text-danger"
                              }`}
                            >
                              {balance.netMinor > 0n ? "owes you " : "you owe "}
                              {formatMoney(
                                balance.netMinor > 0n
                                  ? balance.netMinor
                                  : -balance.netMinor,
                                balance.currency,
                              )}
                            </span>
                          ))
                        )}

                        <form action={setPersonArchivedAction}>
                          <input type="hidden" name="personId" value={person.id} />
                          <input
                            type="hidden"
                            name="archived"
                            value={person.archivedAt ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted"
                          >
                            {person.archivedAt ? "Restore" : "Archive"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="rounded-lg border border-border-subtle bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">New person</h2>
          <CreatePersonForm />
        </aside>
      </div>
    </div>
  );
}
