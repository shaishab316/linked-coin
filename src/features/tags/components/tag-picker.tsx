"use client";

import { useState, useTransition } from "react";
import { Tag as TagIcon, X, Plus } from "lucide-react";
import type { Tag } from "../../../db/schema";

interface TagPickerProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string, add: boolean) => Promise<{ success?: boolean; error?: string }>;
  label?: string;
}

/**
 * A compact, inline tag picker for assigning/removing tags on people or accounts.
 * Renders selected tags as chips with an "x" to remove, and a dropdown "+" button to add more.
 */
export function TagPicker({ availableTags, selectedTagIds, onToggle, label }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));
  const unselectedTags = availableTags.filter((t) => !selectedTagIds.includes(t.id));

  function handleToggle(tagId: string, add: boolean) {
    startTransition(async () => {
      await onToggle(tagId, add);
      if (!add) {
        // tag removed, keep dropdown open if user was browsing
      }
    });
  }

  return (
    <div className="space-y-2">
      {label && (
        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        {selectedTags.length === 0 && (
          <span className="text-xs text-slate-500 italic">No tags</span>
        )}

        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          >
            <TagIcon className="h-3 w-3" />
            {tag.name}
            <button
              type="button"
              onClick={() => handleToggle(tag.id, false)}
              disabled={isPending}
              className="ml-0.5 hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Add tag button */}
        {unselectedTags.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
              aria-label="Add tag"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>

            {isOpen && (
              <>
                {/* Click-outside backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1">
                  {unselectedTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        handleToggle(tag.id, true);
                        setIsOpen(false);
                      }}
                      disabled={isPending}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      <TagIcon className="h-3 w-3 inline mr-1.5 text-slate-500" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
