import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { ReverseTransactionForm } from "@/features/ledger/components/reverse-transaction-form";
import { TransactionMetadataForm } from "@/features/ledger/components/transaction-metadata-form";
import { getTransactionForUser } from "@/features/ledger/queries";
import { COMMAND_TYPE_LABELS } from "@/features/ledger/validation";
import { formatDateTime } from "@/lib/dates/format";
import { formatMoney } from "@/lib/money/money";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const transaction = await getTransactionForUser(getDb(), user.id, id);

  if (!transaction) {
    notFound();
  }

  const canReverse = transaction.type !== "reversal" && !transaction.reversedAt;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/transactions" className="text-sm text-ink-muted hover:underline">
        ← Transactions
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
            {COMMAND_TYPE_LABELS[transaction.type as keyof typeof COMMAND_TYPE_LABELS] ??
              transaction.type}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {transaction.description}
          </h1>
          <p className="text-sm text-ink-muted">
            {formatDateTime(transaction.occurredAt)}
          </p>
        </div>

        <p className="font-mono text-xl">
          {formatMoney(transaction.amountMinor, transaction.currency)}
        </p>
      </div>

      {transaction.reversedAt ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This transaction was reversed on {formatDateTime(transaction.reversedAt)}
          {transaction.reversedByTransactionId ? (
            <>
              {" "}
              by{" "}
              <Link
                href={`/transactions/${transaction.reversedByTransactionId}`}
                className="underline"
              >
                the reversal entry
              </Link>
              .
            </>
          ) : (
            "."
          )}
        </div>
      ) : null}

      {transaction.reversesTransactionId ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          This entry reverses{" "}
          <Link
            href={`/transactions/${transaction.reversesTransactionId}`}
            className="underline"
          >
            the original transaction
          </Link>
          .
        </div>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-y-2 rounded-lg border border-border-subtle bg-white p-4 text-sm">
        <dt className="text-ink-muted">Accounts</dt>
        <dd className="text-right">
          {transaction.accountNames.length > 0
            ? transaction.accountNames.join(" → ")
            : "—"}
        </dd>
        <dt className="text-ink-muted">Person</dt>
        <dd className="text-right">{transaction.personName ?? "—"}</dd>
        <dt className="text-ink-muted">Tags</dt>
        <dd className="text-right">
          {transaction.tagNames.length > 0
            ? transaction.tagNames.join(", ")
            : "—"}
        </dd>
        <dt className="text-ink-muted">Notes</dt>
        <dd className="text-right">{transaction.notes ?? "—"}</dd>
      </dl>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Ledger entries</h2>
        <table className="w-full overflow-hidden rounded-lg border border-border-subtle bg-white text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {transaction.entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2 capitalize">{entry.direction}</td>
                <td className="px-3 py-2">
                  {entry.accountName ??
                    entry.personName ??
                    `External ${entry.externalKind ?? "ledger"}`}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatMoney(entry.amountMinor, entry.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {transaction.linkedTransactions.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Related transactions</h2>
          <ul className="space-y-2">
            {transaction.linkedTransactions.map((linked) => (
              <li key={`${linked.id}-${linked.linkType}`}>
                <Link
                  href={`/transactions/${linked.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-white px-4 py-3 transition hover:border-accent/40"
                >
                  <span>
                    <span className="mr-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium">
                      {linked.linkType}
                    </span>
                    <span className="text-sm">{linked.description}</span>
                  </span>
                  <span className="font-mono text-sm">
                    {formatMoney(linked.amountMinor, linked.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border-subtle bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Edit details</h2>
          <TransactionMetadataForm
            transactionId={transaction.id}
            description={transaction.description}
            notes={transaction.notes}
          />
        </section>

        {canReverse ? (
          <section className="rounded-lg border border-border-subtle bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Correct this entry</h2>
            <ReverseTransactionForm
              transactionId={transaction.id}
              idempotencyKey={randomUUID()}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
