"use client";

import { useState } from "react";
import { createTagAction } from "../actions";
import type { Tag, TagType } from "../../../db/schema";
import { TAG_TYPES } from "../../../db/schema/tags";

interface CreateTagDialogProps {
  existingTags: Tag[];
  defaultTagType?: TagType;
}

const TAG_TYPE_LABELS: Record<TagType, string> = {
  transaction: "Transaction",
  person: "Person",
  account: "Account",
};

const TAG_TYPE_COLORS: Record<TagType, string> = {
  transaction: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  person: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  account: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export function CreateTagDialog({ existingTags, defaultTagType }: CreateTagDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tagType, setTagType] = useState<TagType>(defaultTagType || "transaction");

  // Filter parent options to same type only
  const sameTags = existingTags.filter((t) => t.tagType === tagType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("tagType", tagType);
    const res = await createTagAction(formData);

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setIsOpen(false);
      setIsLoading(false);
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
              Choose what this tag is for, then give it a name.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tag Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Tag Type
                </label>
                <div className="flex gap-2">
                  {TAG_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTagType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        tagType === type
                          ? TAG_TYPE_COLORS[type]
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {TAG_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tag Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder={
                    tagType === "transaction"
                      ? "e.g. Restaurants, Freelance, Health"
                      : tagType === "person"
                      ? "e.g. Family, Friend, Coworker"
                      : "e.g. Business, Personal, Joint"
                  }
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
                  <option value="">None (Top-Level)</option>
                  {sameTags.map((t) => (
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
