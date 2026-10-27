import Link from "next/link";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { listAccountsForUser } from "@/features/accounts/service";
import { requireUser } from "@/features/auth/session";
import { TransactionForm } from "@/features/ledger/components/transaction-form";
import { listOpenLoansForUser } from "@/features/ledger/queries";
import {
  COMMAND_TYPES,
  type CommandType,
} from "@/features/ledger/validation";
import { listPeopleForUser } from "@/features/people/service";
import { listTagsForUser } from "@/features/tags/service";
import { toDateTimeLocalValue } from "@/lib/dates/format";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requested = params.type as CommandType | undefined;
  const defaultType: CommandType =
    requested && COMMAND_TYPES.includes(requested) ? requested : "expense";

  const db = getDb();
  const [accounts, people, tags, loans] = await Promise.all([
    listAccountsForUser(db, user.id),
    listPeopleForUser(db, user.id),
    listTagsForUser(db, user.id),
    listOpenLoansForUser(db, user.id),
  ]);

  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const activePeople = people.filter((person) => !person.archivedAt);
  const activeTags = tags.filter((tag) => !tag.archivedAt);
  const defaultCurrency = activeAccounts[0]?.currency ?? "BDT";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/transactions"
          className="text-sm text-ink-muted hover:underline"
        >
          ← Transactions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Record a transaction
        </h1>
        <p className="text-sm text-ink-muted">
          Amounts are stored in exact minor units; the ledger entry is written
          atomically with the transaction.
        </p>
      </div>

      {activeAccounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-10 text-center text-sm text-ink-muted">
          You need an active account first.{" "}
          <Link href="/accounts" className="text-accent hover:underline">
            Create an account
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <TransactionForm
            accounts={activeAccounts.map((account) => ({
              id: account.id,
              name: `${account.name} (${account.currency})`,
              currency: account.currency,
            }))}
            people={activePeople.map((person) => ({
              id: person.id,
              name: person.name,
            }))}
            tags={activeTags.map((tag) => ({ id: tag.id, name: tag.name }))}
            loans={loans}
            defaultType={defaultType}
            defaultCurrency={defaultCurrency}
            defaultOccurredAt={toDateTimeLocalValue(new Date())}
            idempotencyKey={randomUUID()}
          />
        </div>
      )}
    </div>
  );
}
