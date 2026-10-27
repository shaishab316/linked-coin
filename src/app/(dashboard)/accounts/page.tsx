import Link from "next/link";

import { getDb } from "@/db";
import {
  archiveAccountAction,
  restoreAccountAction,
} from "@/features/accounts/actions";
import { CreateAccountForm } from "@/features/accounts/components/create-account-form";
import { listAccountsForUser } from "@/features/accounts/service";
import { ACCOUNT_TYPE_LABELS } from "@/features/accounts/validation";
import { getAccountBalances } from "@/features/ledger/queries";
import { requireUser } from "@/features/auth/session";
import { formatMinor } from "@/lib/money/money";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const db = getDb();
  const [accounts, balances] = await Promise.all([
    listAccountsForUser(db, user.id),
    getAccountBalances(db, user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-ink-muted">
          Balances are derived from ledger entries, not stored totals.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section aria-labelledby="account-list-heading" className="space-y-2">
          <h2 id="account-list-heading" className="text-lg font-semibold">
            Your accounts
          </h2>

          {accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
              No accounts yet. Add your first one to start recording money
              movements.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((account) => {
                const signed = balances.get(account.id) ?? 0n;
                const display =
                  account.accountType === "credit" ? -signed : signed;

                return (
                  <li
                    key={account.id}
                    className="rounded-lg border border-border-subtle bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <Link href={`/accounts/${account.id}`} className="min-w-0">
                        <p className="truncate font-medium">{account.name}</p>
                        <p className="text-xs text-ink-muted">
                          {ACCOUNT_TYPE_LABELS[account.accountType]} ·{" "}
                          {account.currency}
                          {account.archivedAt ? " · archived" : ""}
                        </p>
                      </Link>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">
                          {formatMinor(display, account.currency)}{" "}
                          <span className="text-xs text-ink-muted">
                            {account.currency}
                          </span>
                        </span>

                        <form
                          action={
                            account.archivedAt
                              ? restoreAccountAction
                              : archiveAccountAction
                          }
                        >
                          <input
                            type="hidden"
                            name="accountId"
                            value={account.id}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted"
                          >
                            {account.archivedAt ? "Restore" : "Archive"}
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
          <h2 className="mb-4 text-lg font-semibold">New account</h2>
          <CreateAccountForm />
        </aside>
      </div>
    </div>
  );
}
