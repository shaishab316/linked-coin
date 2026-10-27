"use client";

import { useState } from "react";
import { createTagAction } from "../actions";
import type { Tag } from "../../../db/schema";

interface CreateTagDialogProps {
  existingTags: Tag[];
}

export function CreateTagDialog({ existingTags }: CreateTagDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await createTagAction(formData);

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setIsOpen(false);
      window.location.reload();
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
        id="btn-add-tag"
      >
        + Add Tag
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Tag</h3>
            <p className="text-xs text-slate-400">
              Organize transactions hierarchically (e.g. Food &rarr; Restaurants &rarr; Fast Food).
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tag Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Restaurants, Freelance, Health"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Parent Tag (Optional)
                </label>
                <select
                  name="parentId"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">None (Top-Level Category)</option>
                  {existingTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                  id="btn-submit-tag"
                >
                  {isLoading ? "Saving..." : "Create Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
