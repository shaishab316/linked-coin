import { requireUser } from "../../../features/auth/service";

export default async function DataPage() {
  await requireUser();

  return (
    <div className="space-y-8 max-w-4xl mx-auto" id="data-management-page">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Data Management & Backup</h1>
        <p className="text-sm text-slate-400 mt-1">
          Export your complete financial records, generate backups, or import external transactions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full JSON Backup */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
              📦
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Full System Backup (JSON)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all accounts, people, tags, transactions, balanced entries, and append-only
              financial events into a single standardized JSON snapshot.
            </p>
          </div>

          <a
            href="/api/export/backup"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition text-center shadow-lg shadow-emerald-500/20 block"
            id="btn-download-json-backup"
          >
            Download JSON Backup
          </a>
        </div>

        {/* Transactions CSV Export */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg mb-3">
              📊
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Transactions Ledger (CSV)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your transaction history formatted for spreadsheet applications (Excel, Google Sheets)
              with formula-injection protection.
            </p>
          </div>

          <a
            href="/api/export/transactions"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition text-center border border-white/10 block"
            id="btn-download-csv-export"
          >
            Download Transactions CSV
          </a>
        </div>
      </div>

      {/* CSV Import Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-white">Import Transactions from CSV</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Import your bank statements or personal records. Each imported row is validated, verified
          against double-entry invariants, and recorded with an idempotency key to prevent accidental
          duplicates.
        </p>

        <div className="p-4 rounded-xl border border-dashed border-white/10 bg-slate-900/40 text-center space-y-2">
          <div className="text-xs text-slate-400">
            CSV should include columns: <code className="text-emerald-400">date, type, description, amount, currency</code>
          </div>
          <div className="text-xs text-slate-500">
            Drag and drop your CSV file here, or click to browse
          </div>
          <input
            type="file"
            accept=".csv"
            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
          />
        </div>
      </div>
    </div>
  );
}
