import Link from "next/link";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import {
  getPersonBalances,
  listTransactionsForUser,
} from "@/features/ledger/queries";
import { getPersonForUser } from "@/features/people/service";
import { formatDateTime } from "@/lib/dates/format";
import { formatMoney } from "@/lib/money/money";

export const dynamic = "force-dynamic";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  const person = await getPersonForUser(db, user.id, id);

  if (!person) {
    notFound();
  }

  const [balances, history] = await Promise.all([
    getPersonBalances(db, user.id),
    listTransactionsForUser(db, user.id, { personId: person.id, pageSize: 50 }),
  ]);

  const personBalances = balances.filter(
    (balance) => balance.personId === person.id,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/people" className="text-sm text-ink-muted hover:underline">
        ← People
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <p className="text-sm text-ink-muted">
            {person.contact ?? "No contact details"}
            {person.archivedAt ? " · archived" : ""}
          </p>
          {person.notes ? (
            <p className="mt-1 text-sm text-ink-muted">{person.notes}</p>
          ) : null}
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            Outstanding
          </p>
          {personBalances.length === 0 ? (
            <p className="text-sm text-ink-muted">Settled</p>
          ) : (
            personBalances.map((balance) => (
              <p key={balance.currency} className="font-mono text-lg">
                {balance.netMinor > 0n ? "" : "-"}
                {formatMoney(
                  balance.netMinor > 0n ? balance.netMinor : -balance.netMinor,
                  balance.currency,
                )}
                <span className="ml-1 text-xs text-ink-muted">
                  {balance.netMinor > 0n ? "receivable" : "payable"}
                </span>
              </p>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/transactions/new?type=loan_given"
          className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
        >
          Record money lent
        </Link>
        <Link
          href="/transactions/new?type=loan_received"
          className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
        >
          Record money borrowed
        </Link>
        <Link
          href="/transactions/new?type=repayment_received"
          className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
        >
          Record repayment
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">History</h2>

        {history.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
            No loans or repayments recorded for {person.name}.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-white">
            {history.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/transactions/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.description}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDateTime(item.occurredAt)} ·{" "}
                      {item.type.replaceAll("_", " ")}
                      {item.reversedAt ? " · reversed" : ""}
                    </span>
                  </span>
                  <span className="font-mono text-sm">
                    {formatMoney(item.amountMinor, item.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
