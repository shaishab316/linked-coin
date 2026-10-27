import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/people", label: "People" },
  { href: "/tags", label: "Tags" },
] as const;

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Linked Coin
          </Link>

          <nav aria-label="Main" className="flex flex-1 flex-wrap gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-ink-muted transition hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="text-xs text-ink-muted">{user.username}</span>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
