import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Header & Action Buttons Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 sm:w-64 rounded-2xl bg-slate-800/80" />
          <div className="h-4 w-36 sm:w-80 rounded-xl bg-slate-800/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 rounded-2xl bg-slate-800/70" />
          <div className="h-10 w-32 rounded-2xl bg-emerald-500/20" />
        </div>
      </div>

      {/* 4 Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded-md bg-slate-800" />
              <div className="h-8 w-8 rounded-xl bg-slate-800/80" />
            </div>
            <div className="h-7 w-28 rounded-xl bg-slate-800" />
            <div className="h-2.5 w-32 rounded-md bg-slate-800/50" />
          </div>
        ))}
      </div>

      {/* Main Content / Timeline Rows Skeleton */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="h-5 w-40 rounded-xl bg-slate-800" />
          <div className="h-8 w-24 rounded-xl bg-slate-800/60" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800/50 bg-slate-950/40 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-800" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-4 w-32 sm:w-48 rounded-lg bg-slate-800" />
                  <div className="h-3 w-20 sm:w-28 rounded-md bg-slate-800/50" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="h-5 w-20 rounded-lg bg-slate-800" />
                <div className="h-3 w-12 rounded-md bg-slate-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
