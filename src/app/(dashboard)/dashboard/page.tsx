import { getDb } from "@/db";
import { archiveAccountAction } from "@/features/accounts/actions";
import { CreateAccountForm } from "@/features/accounts/components/create-account-form";
import { listAccountsForUser } from "@/features/accounts/service";
import { ACCOUNT_TYPE_LABELS } from "@/features/accounts/validation";
import { signOutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const accounts = await listAccountsForUser(getDb(), user.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
            Linked Coin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Signed in as {user.username}
          </h1>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-muted"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section aria-labelledby="accounts-heading" className="space-y-3">
          <h2 id="accounts-heading" className="text-lg font-semibold">
            Accounts
          </h2>

          {accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
              No accounts yet. Add your first one to start recording money
              movements.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{account.name}</p>
                    <p className="text-xs text-ink-muted">
                      {ACCOUNT_TYPE_LABELS[account.accountType]} ·{" "}
                      {account.currency} · added{" "}
                      {dateFormatter.format(account.createdAt)}
                    </p>
                    {account.description ? (
                      <p className="mt-1 truncate text-sm text-ink-muted">
                        {account.description}
                      </p>
                    ) : null}
                  </div>

                  {account.archivedAt ? (
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-muted">
                      Archived
                    </span>
                  ) : (
                    <form action={archiveAccountAction}>
                      <input
                        type="hidden"
                        name="accountId"
                        value={account.id}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted"
                      >
                        Archive
                      </button>
                    </form>
                  )}
                </li>
              ))}
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
