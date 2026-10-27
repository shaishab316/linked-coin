import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../features/auth/session";
import { Navigation } from "../../components/navigation";
import { SyncStatusPill } from "../../components/sync-status-pill";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex">
      <Navigation username={user.username} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b border-white/5 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <SyncStatusPill />
            <Link
              href="/transactions/new"
              id="header-btn-new-transaction"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New Transaction</span>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
