import Link from "next/link";

import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { listTransactionsForUser } from "@/features/ledger/queries";
import {
  COMMAND_TYPE_LABELS,
  COMMAND_TYPES,
} from "@/features/ledger/validation";
import { formatDateTime } from "@/lib/dates/format";
import { formatMinor } from "@/lib/money/money";

export const dynamic = "force-dynamic";

function buildHref(params: { page?: number; type?: string }): string {
  const search = new URLSearchParams();

  if (params.type) {
    search.set("type", params.type);
  }

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }

  const query = search.toString();

  return query ? `/transactions?${query}` : "/transactions";
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const type =
    params.type && COMMAND_TYPES.includes(params.type as never)
      ? params.type
      : undefined;

  const result = await listTransactionsForUser(getDb(), user.id, {
    page: Number(params.page ?? "1") || 1,
    type,
  });

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-ink-muted">
            {result.total} transaction{result.total === 1 ? "" : "s"}
            {type ? ` of type ${COMMAND_TYPE_LABELS[type as never]}` : ""}
          </p>
        </div>

        <Link
          href="/transactions/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
        >
          New transaction
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-muted">
            Filter by type
          </span>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {COMMAND_TYPES.map((option) => (
              <option key={option} value={option}>
                {COMMAND_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
        >
          Apply
        </button>

        {type ? (
          <Link
            href="/transactions"
            className="px-2 py-2 text-sm text-ink-muted hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-10 text-center text-sm text-ink-muted">
          No transactions match this view.{" "}
          <Link href="/transactions/new" className="text-accent hover:underline">
            Record one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-white">
          {result.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/transactions/${item.id}`}
                className="block px-4 py-3 transition hover:bg-surface-muted"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {item.type.replaceAll("_", " ")}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {item.description}
                    </span>
                    {item.reversedAt ? (
                      <span className="text-[11px] text-danger">reversed</span>
                    ) : null}
                  </span>

                  <span className="font-mono text-sm">
                    {formatMinor(item.amountMinor, item.currency)}{" "}
                    <span className="text-xs text-ink-muted">
                      {item.currency}
                    </span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-ink-muted">
                  {formatDateTime(item.occurredAt)}
                  {item.accountNames.length > 0
                    ? ` · ${item.accountNames.join(" → ")}`
                    : ""}
                  {item.personName ? ` · ${item.personName}` : ""}
                  {item.tagNames.length > 0
                    ? ` · ${item.tagNames.join(", ")}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Page {result.page} of {totalPages}
          </span>

          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={buildHref({ page: result.page - 1, type })}
                className="rounded-md border border-border-subtle bg-white px-3 py-1.5 transition hover:bg-surface-muted"
              >
                Previous
              </Link>
            ) : null}

            {result.page < totalPages ? (
              <Link
                href={buildHref({ page: result.page + 1, type })}
                className="rounded-md border border-border-subtle bg-white px-3 py-1.5 transition hover:bg-surface-muted"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
