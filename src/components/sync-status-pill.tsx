"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncEngineStatus } from "../offline/sync-engine";

export function SyncStatusPill() {
  const [status, setStatus] = useState<SyncEngineStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  useEffect(() => {
    return syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const handleManualSync = () => {
    syncEngine.syncNow().catch(console.error);
  };

  return (
    <div className="flex items-center gap-2" id="sync-status-pill">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs font-medium">
        <span
          className={`w-2 h-2 rounded-full ${
            !status.isOnline
              ? "bg-amber-400"
              : status.isSyncing
                ? "bg-cyan-400 animate-spin"
                : "bg-emerald-400"
          }`}
        />
        <span className="text-slate-300">
          {!status.isOnline
            ? "Offline (Saved locally)"
            : status.isSyncing
              ? "Syncing..."
              : status.pendingCount > 0
                ? `${status.pendingCount} pending`
                : "Synced"}
        </span>
      </div>

      {status.isOnline && (
        <button
          onClick={handleManualSync}
          disabled={status.isSyncing}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-white/5 disabled:opacity-50"
          title="Force synchronization with server"
          id="btn-sync-now"
        >
          {status.isSyncing ? "..." : "Sync Now"}
        </button>
      )}
    </div>
  );
}
