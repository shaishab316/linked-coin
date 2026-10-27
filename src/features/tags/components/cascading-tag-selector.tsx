"use client";

import React, { useState, useMemo } from "react";
import {
  Tag as TagIcon,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Check,
  X,
  Search,
} from "lucide-react";
import type { Tag } from "../../../db/schema";

interface CascadingTagSelectorProps {
  tags: Tag[];
  defaultSelectedIds?: string[];
  name?: string;
}

export function CascadingTagSelector({
  tags,
  defaultSelectedIds = [],
  name = "tagIds",
}: CascadingTagSelectorProps) {
  // Only leaf / selectable tags chosen by the user
  const [selectedLeafIds, setSelectedLeafIds] = useState<string[]>(defaultSelectedIds);
  // Set of expanded parent accordion IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Filter to active transaction tags
  const validTags = useMemo(() => {
    return tags.filter((t) => !t.archivedAt && (t.tagType === "transaction" || !t.tagType));
  }, [tags]);

  // Lookup map by ID
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const t of validTags) {
      map.set(t.id, t);
    }
    return map;
  }, [validTags]);

  // Children map: parentId -> Tag[]
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Tag[]>();
    map.set(null, []);

    for (const t of validTags) {
      const validParentId = t.parentId && tagMap.has(t.parentId) ? t.parentId : null;
      if (!map.has(validParentId)) {
        map.set(validParentId, []);
      }
      map.get(validParentId)!.push(t);
    }
    return map;
  }, [validTags, tagMap]);

  // Set of all IDs that act as parents (have at least one child)
  const parentIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const [pId, children] of childrenMap.entries()) {
      if (pId && children.length > 0) {
        set.add(pId);
      }
    }
    return set;
  }, [childrenMap]);

  // Top-level root tags
  const rootTags = childrenMap.get(null) || [];

  // Toggle accordion expand/collapse for a parent tag
  const toggleAccordion = (parentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(parentIdSet));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Toggle selection for a leaf tag (parents cannot be selected)
  const toggleLeafTag = (tagId: string) => {
    setSelectedLeafIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const removeSelectedTag = (tagId: string) => {
    setSelectedLeafIds((prev) => prev.filter((id) => id !== tagId));
  };

  // Under the hood: calculate all ancestor parent IDs for the selected leaf tags
  // so queries matching the parent also find this transaction
  const allSubmittedTagIds = useMemo(() => {
    const idSet = new Set<string>(selectedLeafIds);
    for (const leafId of selectedLeafIds) {
      let curr = tagMap.get(leafId)?.parentId;
      while (curr && tagMap.has(curr)) {
        idSet.add(curr);
        curr = tagMap.get(curr)?.parentId;
      }
    }
    return Array.from(idSet);
  }, [selectedLeafIds, tagMap]);

  // Helper to get parent path name for display (e.g. "Food")
  const getParentBreadcrumb = (tagId: string): string | null => {
    const parentId = tagMap.get(tagId)?.parentId;
    if (!parentId) return null;
    return tagMap.get(parentId)?.name || null;
  };

  // Filtered leaf tags when searching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    // Only search leaf tags that the user can select
    return validTags.filter((t) => !parentIdSet.has(t.id) && t.name.toLowerCase().includes(q));
  }, [searchQuery, validTags, parentIdSet]);

  // Recursive tree accordion node renderer
  const renderTagNode = (tag: Tag, depth = 0) => {
    const isParent = parentIdSet.has(tag.id);
    const children = childrenMap.get(tag.id) || [];
    const isExpanded = expandedIds.has(tag.id);

    // If it's a parent, render as an accordion section (CANNOT BE SELECTED)
    if (isParent) {
      // Check if any child inside this parent is selected to highlight folder
      const hasSelectedChild = children.some(
        (c) => selectedLeafIds.includes(c.id) || (parentIdSet.has(c.id) && (childrenMap.get(c.id) || []).some(gc => selectedLeafIds.includes(gc.id))),
      );

      return (
        <div key={tag.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden mb-2">
          {/* Accordion Header (Click to expand/collapse only) */}
          <button
            type="button"
            onClick={() => toggleAccordion(tag.id)}
            className={`w-full flex items-center justify-between p-3.5 text-left transition cursor-pointer select-none ${
              isExpanded
                ? "bg-slate-800/70 border-b border-slate-800"
                : "hover:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg transition ${
                  hasSelectedChild
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isExpanded
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-400"
                }`}
              >
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-slate-100">{tag.name}</span>
                {tag.description && (
                  <p className="text-[11px] text-slate-400">{tag.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                {children.length} {children.length === 1 ? "tag" : "tags"}
              </span>
              <div className="p-1 rounded-lg text-slate-400">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </button>

          {/* Accordion Body: Child tags */}
          {isExpanded && (
            <div className="p-3 pl-4 sm:pl-6 bg-slate-950/40 border-l-2 border-emerald-500/30 ml-3 sm:ml-4 my-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {children.map((child) => renderTagNode(child, depth + 1))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Leaf Tag (Selectable Tag)
    const isSelected = selectedLeafIds.includes(tag.id);

    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleLeafTag(tag.id)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm ${
          isSelected
            ? "bg-emerald-500 text-slate-950 font-bold shadow-emerald-500/25 ring-2 ring-emerald-400"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <div
          className={`flex h-4 w-4 items-center justify-center rounded-md transition ${
            isSelected
              ? "bg-slate-950 text-emerald-400"
              : "border border-slate-600 bg-slate-950"
          }`}
        >
          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
        </div>
        <span>{tag.name}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
      {/* Hidden Inputs for Form Submission:
          Includes selected leaf tag IDs + ancestor parent IDs under the hood */}
      {allSubmittedTagIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {/* Selected Tags Display: ONLY displays the selected child tag */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 text-emerald-400" />
            Selected Tags ({selectedLeafIds.length})
          </label>
          {selectedLeafIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedLeafIds([])}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {selectedLeafIds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-3 text-center text-xs text-slate-400">
            No tags selected. Open a category accordion below and select your tag.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
            {selectedLeafIds.map((id) => {
              const tag = tagMap.get(id);
              if (!tag) return null;
              const parentName = getParentBreadcrumb(id);

              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-in zoom-in-95 duration-150"
                >
                  <TagIcon className="h-3 w-3 text-emerald-400" />
                  <span>{tag.name}</span>
                  {parentName && (
                    <span className="text-[10px] text-emerald-400/70 font-normal">
                      ({parentName})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSelectedTag(id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-emerald-500/30 text-emerald-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Input for Quick Finding */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags directly..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Expand / Collapse Accordion Controls */}
        {!searchQuery && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-xl transition cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-xl transition cursor-pointer"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* Accordion Tree View */}
      {searchQuery ? (
        /* Search results view */
        <div className="space-y-2 max-h-64 overflow-y-auto p-1">
          {searchResults.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No tags found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searchResults.map((tag) => {
                const isSelected = selectedLeafIds.includes(tag.id);
                const parentName = getParentBreadcrumb(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleLeafTag(tag.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400"
                        : "bg-slate-950 text-slate-200 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-md ${
                        isSelected ? "bg-slate-950 text-emerald-400" : "border border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span>{tag.name}</span>
                    {parentName && (
                      <span className="text-[10px] text-slate-400">in {parentName}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tree Accordion */
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {rootTags.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No tags created yet.
            </div>
          ) : (
            rootTags.map((tag) => renderTagNode(tag, 0))
          )}
        </div>
      )}

      {/* Helper Footer */}
      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
        💡 Categories act as accordion folders. Tap any category to open it, then select the sub-tag.
      </p>
    </div>
  );
}
