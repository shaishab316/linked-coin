import React from "react";
import { requireUser } from "../../../../features/auth/service";
import { getDictionary, type Locale } from "../../../../lib/i18n";
import { Download, FileJson, FileSpreadsheet, ShieldCheck } from "lucide-react";

interface LocalizedDataPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocalizedDataPage({ params }: LocalizedDataPageProps) {
  await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          {t.data.title}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          {t.data.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full JSON Backup */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <FileJson className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">{t.data.backupCardTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.data.backupCardDesc}
            </p>
          </div>

          <a
            href="/api/export/backup"
            download
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{t.data.downloadBackup}</span>
          </a>
        </div>

        {/* CSV Spreadsheet Export */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">{t.data.csvCardTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.data.csvCardDesc}
            </p>
          </div>

          <a
            href="/api/export/transactions"
            download
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{t.data.downloadCsv}</span>
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-200/80">
          All exports are created directly on your machine and sanitized against formula injection.
        </p>
      </div>
    </div>
  );
}
