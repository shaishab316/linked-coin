import Link from "next/link";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { archiveAccountAction, restoreAccountAction } from "@/features/accounts/actions";
import { AccountMetadataForm } from "@/features/accounts/components/account-metadata-form";
import { getAccountForUser } from "@/features/accounts/service";
import { ACCOUNT_TYPE_LABELS } from "@/features/accounts/validation";
import { requireUser } from "@/features/auth/session";
import {
  getAccountBalances,
  listTransactionsForAccount,
} from "@/features/ledger/queries";
import { formatDate, formatDateTime } from "@/lib/dates/format";
import { formatMoney } from "@/lib/money/money";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  const account = await getAccountForUser(db, user.id, id);

  if (!account) {
    notFound();
  }

  const [balances, history] = await Promise.all([
    getAccountBalances(db, user.id),
    listTransactionsForAccount(db, user.id, account.id, { pageSize: 50 }),
  ]);

  const signed = balances.get(account.id) ?? 0n;
  const display = account.accountType === "credit" ? -signed : signed;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/accounts" className="text-sm text-ink-muted hover:underline">
        ← Accounts
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account.name}
          </h1>
          <p className="text-sm text-ink-muted">
            {ACCOUNT_TYPE_LABELS[account.accountType]} · {account.currency} ·
            opened {formatDate(account.createdAt)}
            {account.archivedAt ? " · archived" : ""}
          </p>
          {account.description ? (
            <p className="mt-1 text-sm text-ink-muted">{account.description}</p>
          ) : null}
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            {account.accountType === "credit" ? "Owed" : "Balance"}
          </p>
          <p className="font-mono text-2xl">
            {formatMoney(display, account.currency)}
          </p>

          <form
            action={account.archivedAt ? restoreAccountAction : archiveAccountAction}
            className="mt-2"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <button
              type="submit"
              className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted"
            >
              {account.archivedAt ? "Restore account" : "Archive account"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">History</h2>
            <Link
              href="/transactions/new"
              className="text-sm text-accent hover:underline"
            >
              Add transaction
            </Link>
          </div>

          {history.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
              No transactions touch this account yet.
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
                        {formatDateTime(item.occurredAt)} · {item.type.replaceAll("_", " ")}
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

        <aside className="rounded-lg border border-border-subtle bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Edit account</h2>
          <AccountMetadataForm
            accountId={account.id}
            name={account.name}
            description={account.description}
          />
        </aside>
      </div>
    </div>
  );
}
