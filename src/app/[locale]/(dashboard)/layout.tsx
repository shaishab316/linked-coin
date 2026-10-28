import React from "react";
import { requireUser } from "../../../features/auth/service";
import { Navigation } from "../../../components/navigation";
import { SyncStatusPill } from "../../../components/sync-status-pill";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row">
      <Navigation username={user.username} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-300">
              Linked Coin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatusPill />
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
