import Link from "next/link";

import { getDb } from "@/db";
import { listAccountsForUser } from "@/features/accounts/service";
import { ACCOUNT_TYPE_LABELS } from "@/features/accounts/validation";
import {
  getAccountBalances,
  getMonthlyCashFlow,
  getPersonBalances,
  listTransactionsForUser,
} from "@/features/ledger/queries";
import { requireUser } from "@/features/auth/session";
import { formatDate } from "@/lib/dates/format";
import { formatMinor } from "@/lib/money/money";

export const dynamic = "force-dynamic";

type Position = {
  currency: string;
  assets: bigint;
  liabilities: bigint;
  receivable: bigint;
  payable: bigint;
};

const TYPE_BADGES: Record<string, string> = {
  income: "bg-emerald-50 text-emerald-700",
  expense: "bg-rose-50 text-rose-700",
  transfer: "bg-slate-100 text-slate-700",
  loan_given: "bg-amber-50 text-amber-700",
  loan_received: "bg-amber-50 text-amber-700",
  repayment_received: "bg-emerald-50 text-emerald-700",
  repayment_made: "bg-rose-50 text-rose-700",
  adjustment: "bg-indigo-50 text-indigo-700",
  reversal: "bg-slate-200 text-slate-800",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();

  const [accounts, balances, personBalances, cashFlow, recent] =
    await Promise.all([
      listAccountsForUser(db, user.id),
      getAccountBalances(db, user.id),
      getPersonBalances(db, user.id),
      getMonthlyCashFlow(db, user.id, 6),
      listTransactionsForUser(db, user.id, { pageSize: 8 }),
    ]);

  const positions = new Map<string, Position>();
  const position = (currency: string): Position => {
    const existing = positions.get(currency) ?? {
      currency,
      assets: 0n,
      liabilities: 0n,
      receivable: 0n,
      payable: 0n,
    };
    positions.set(currency, existing);
    return existing;
  };

  for (const account of accounts) {
    const signed = balances.get(account.id) ?? 0n;
    const entry = position(account.currency);

    if (account.accountType === "credit") {
      entry.liabilities += -signed;
    } else {
      entry.assets += signed;
    }
  }

  for (const balance of personBalances) {
    const entry = position(balance.currency);

    if (balance.netMinor > 0n) {
      entry.receivable += balance.netMinor;
    } else {
      entry.payable += -balance.netMinor;
    }
  }

  const currencies = [...positions.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );

  const monthly = new Map<string, Array<{ month: string; income: bigint; expense: bigint }>>();
  for (const row of cashFlow) {
    const list = monthly.get(row.currency) ?? [];
    list.push({
      month: row.month,
      income: row.incomeMinor,
      expense: row.expenseMinor,
    });
    monthly.set(row.currency, list);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-ink-muted">
            Balances come straight from the ledger, never from cached numbers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/transactions/new?type=expense"
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
          >
            Record expense
          </Link>
          <Link
            href="/transactions/new?type=income"
            className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
          >
            Record income
          </Link>
          <Link
            href="/transactions/new?type=transfer"
            className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
          >
            Transfer
          </Link>
        </div>
      </div>

      {currencies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-10 text-center text-sm text-ink-muted">
          No financial position yet. Create an account, then record income or an
          opening balance.
        </p>
      ) : (
        <section aria-labelledby="position-heading" className="mb-8">
          <h2 id="position-heading" className="mb-3 text-lg font-semibold">
            Position
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {currencies.map((entry) => {
              const net =
                entry.assets + entry.receivable - entry.liabilities - entry.payable;

              return (
                <div
                  key={entry.currency}
                  className="rounded-lg border border-border-subtle bg-white p-4"
                >
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      {entry.currency}
                    </span>
                    <span className="text-lg font-semibold">
                      {formatMinor(net, entry.currency)}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-ink-muted">Assets</dt>
                    <dd className="text-right">
                      {formatMinor(entry.assets, entry.currency)}
                    </dd>
                    <dt className="text-ink-muted">Liabilities</dt>
                    <dd className="text-right">
                      {formatMinor(entry.liabilities, entry.currency)}
                    </dd>
                    <dt className="text-ink-muted">Owed to you</dt>
                    <dd className="text-right">
                      {formatMinor(entry.receivable, entry.currency)}
                    </dd>
                    <dt className="text-ink-muted">You owe</dt>
                    <dd className="text-right">
                      {formatMinor(entry.payable, entry.currency)}
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="accounts-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="accounts-heading" className="text-lg font-semibold">
              Accounts
            </h2>
            <Link href="/accounts" className="text-sm text-accent hover:underline">
              Manage
            </Link>
          </div>

          {accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-6 text-sm text-ink-muted">
              No accounts yet.{" "}
              <Link href="/accounts" className="text-accent hover:underline">
                Add your first account
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((account) => {
                const signed = balances.get(account.id) ?? 0n;
                const display =
                  account.accountType === "credit" ? -signed : signed;

                return (
                  <li key={account.id}>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-white px-4 py-3 transition hover:border-accent/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {account.name}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {ACCOUNT_TYPE_LABELS[account.accountType]}
                          {account.archivedAt ? " · archived" : ""}
                        </span>
                      </span>
                      <span className="font-mono text-sm">
                        {formatMinor(display, account.currency)}{" "}
                        <span className="text-xs text-ink-muted">
                          {account.currency}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="cashflow-heading">
          <h2 id="cashflow-heading" className="mb-3 text-lg font-semibold">
            Monthly cash flow
          </h2>

          {monthly.size === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-white px-4 py-6 text-sm text-ink-muted">
              No income or expenses recorded in the last six months.
            </p>
          ) : (
            <div className="space-y-4">
              {[...monthly.entries()].map(([currency, months]) => {
                const max = months.reduce(
                  (value, row) =>
                    row.income > value
                      ? row.income
                      : row.expense > value
                        ? row.expense
                        : value,
                  0n,
                );

                return (
                  <div
                    key={currency}
                    className="rounded-lg border border-border-subtle bg-white p-4"
                  >
                    <p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                      {currency}
                    </p>
                    <ul className="space-y-2">
                      {months.map((row) => {
                        const incomeWidth =
                          max > 0n ? Number((row.income * 100n) / max) : 0;
                        const expenseWidth =
                          max > 0n ? Number((row.expense * 100n) / max) : 0;
                        const net = row.income - row.expense;

                        return (
                          <li key={row.month} className="text-xs">
                            <div className="mb-1 flex justify-between">
                              <span className="text-ink-muted">{row.month}</span>
                              <span
                                className={
                                  net < 0n ? "text-danger" : "text-emerald-700"
                                }
                              >
                                {net >= 0n ? "+" : ""}
                                {formatMinor(net, currency)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="h-1.5 rounded bg-surface-muted">
                                <div
                                  className="h-1.5 rounded bg-emerald-500"
                                  style={{ width: `${incomeWidth}%` }}
                                />
                              </div>
                              <div className="h-1.5 rounded bg-surface-muted">
                                <div
                                  className="h-1.5 rounded bg-rose-400"
                                  style={{ width: `${expenseWidth}%` }}
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="recent-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent transactions
          </h2>
          <Link href="/transactions" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>

        {recent.items.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-white px-4 py-6 text-sm text-ink-muted">
            No transactions yet.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-white">
            {recent.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/transactions/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGES[item.type] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {item.type.replaceAll("_", " ")}
                    </span>
                    <span className="truncate text-sm">{item.description}</span>
                    {item.reversedAt ? (
                      <span className="text-[11px] text-ink-muted">(reversed)</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {formatDate(item.occurredAt)} ·{" "}
                    <span className="font-mono text-ink">
                      {formatMinor(item.amountMinor, item.currency)} {item.currency}
                    </span>
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
