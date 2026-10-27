"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Tag as TagIcon,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Check,
  X,
  Plus,
  Search,
  Globe,
} from "lucide-react";

export interface TagPickerItem {
  id: string;
  name: string;
  parentId?: string | null;
  tagType?: string | null;
  description?: string | null;
  [key: string]: any;
}

export type TagPickerProps = {
  availableTags: TagPickerItem[];
  label?: string;
  placeholder?: string;
  name?: string;
  allowSelectParent?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
} & (
  | {
      mode: "single";
      selectedTagId: string;
      onSelect: (tagId: string) => void;
      selectedTagIds?: never;
      onToggle?: never;
      onChange?: never;
    }
  | {
      mode?: "multiple";
      selectedTagIds: string[];
      onToggle?: (tagId: string, add: boolean) => Promise<{ success?: boolean; error?: string }> | void;
      onChange?: (selectedTagIds: string[]) => void;
      selectedTagId?: never;
      onSelect?: never;
    }
);

/**
 * Universal Tree-Accordion Tag Picker component.
 * - Parents act as collapsible accordion folders (cannot be selected unless allowSelectParent is true).
 * - Only leaf / child tags are selectable for transactions/merge.
 * - Supports both "single" selection (e.g. parent tag, batch merge) and "multiple" selection (e.g. people, accounts, transactions).
 */
export function TagPicker(props: TagPickerProps) {
  const {
    availableTags,
    label,
    placeholder = "Choose category / tag...",
    name,
    allowSelectParent = false,
    allowNone = false,
    noneLabel = "None (Top-Level)",
  } = props;

  const mode = props.mode || "multiple";
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Normalize selected IDs
  const selectedIds = useMemo(() => {
    if (props.mode === "single") {
      return props.selectedTagId ? [props.selectedTagId] : [];
    }
    return props.selectedTagIds || [];
  }, [props]);

  // Lookup map by ID
  const tagMap = useMemo(() => {
    const map = new Map<string, TagPickerItem>();
    for (const t of availableTags) {
      map.set(t.id, t);
    }
    return map;
  }, [availableTags]);

  // Children map: parentId -> TagPickerItem[]
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, TagPickerItem[]>();
    map.set(null, []);

    for (const t of availableTags) {
      const validParentId = t.parentId && tagMap.has(t.parentId) ? t.parentId : null;
      if (!map.has(validParentId)) {
        map.set(validParentId, []);
      }
      map.get(validParentId)!.push(t);
    }
    return map;
  }, [availableTags, tagMap]);

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

  // Root tags
  const rootTags = childrenMap.get(null) || [];

  // Toggle accordion expand/collapse for a parent tag
  const toggleAccordion = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  // Handle selecting a tag (leaf tag or parent if allowSelectParent is true)
  const handleSelectLeaf = (tagId: string) => {
    if (props.mode === "single") {
      props.onSelect(tagId);
      setIsOpen(false);
      setSearchQuery("");
      return;
    }

    // Multiple mode
    const isCurrentlySelected = selectedIds.includes(tagId);
    if (props.onToggle) {
      startTransition(async () => {
        await props.onToggle!(tagId, !isCurrentlySelected);
      });
    } else if (props.onChange) {
      const next = isCurrentlySelected
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId];
      props.onChange(next);
    }
  };

  const handleRemove = (tagId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (props.mode === "single") {
      props.onSelect("");
      return;
    }
    if (props.onToggle) {
      startTransition(async () => {
        await props.onToggle!(tagId, false);
      });
    } else if (props.onChange) {
      props.onChange(selectedIds.filter((id) => id !== tagId));
    }
  };

  // Under the hood ancestor tags calculation for form inputs (when allowSelectParent is false)
  const allSubmittedTagIds = useMemo(() => {
    if (allowSelectParent) {
      return selectedIds;
    }
    const idSet = new Set<string>(selectedIds);
    for (const leafId of selectedIds) {
      let curr = tagMap.get(leafId)?.parentId;
      while (curr && tagMap.has(curr)) {
        idSet.add(curr);
        curr = tagMap.get(curr)?.parentId;
      }
    }
    return Array.from(idSet);
  }, [selectedIds, tagMap, allowSelectParent]);

  // Helper to get parent path name
  const getParentBreadcrumb = (tagId: string): string | null => {
    const parentId = tagMap.get(tagId)?.parentId;
    if (!parentId) return null;
    return tagMap.get(parentId)?.name || null;
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return availableTags.filter((t) => {
      if (!allowSelectParent && parentIdSet.has(t.id)) return false;
      return t.name.toLowerCase().includes(q);
    });
  }, [searchQuery, availableTags, parentIdSet, allowSelectParent]);

  // Recursive accordion node renderer
  const renderNode = (tag: TagPickerItem, depth = 0) => {
    const isParent = parentIdSet.has(tag.id);
    const children = childrenMap.get(tag.id) || [];
    const isExpanded = expandedIds.has(tag.id);

    // If it's a parent, render as an accordion section
    if (isParent) {
      const hasSelectedChild = children.some(
        (c) =>
          selectedIds.includes(c.id) ||
          (parentIdSet.has(c.id) && (childrenMap.get(c.id) || []).some((gc) => selectedIds.includes(gc.id))),
      );

      return (
        <div key={tag.id} className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden mb-1.5">
          {/* Parent Header */}
          <div
            className={`w-full flex items-center justify-between p-2.5 text-left transition select-none ${
              isExpanded ? "bg-slate-800/80 border-b border-slate-800" : "hover:bg-slate-800/50"
            }`}
          >
            {/* Click to expand/collapse folder */}
            <button
              type="button"
              onClick={(e) => toggleAccordion(tag.id, e)}
              className="flex items-center gap-2 flex-1 cursor-pointer text-left py-0.5"
            >
              <div
                className={`p-1 rounded-md transition ${
                  hasSelectedChild || selectedIds.includes(tag.id)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isExpanded
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-400"
                }`}
              >
                {isExpanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
              </div>
              <span className="text-xs font-bold text-slate-200">{tag.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                {children.length}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              {/* Optional: select parent button when allowSelectParent is true */}
              {allowSelectParent && (
                <button
                  type="button"
                  onClick={() => handleSelectLeaf(tag.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    selectedIds.includes(tag.id)
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700"
                  }`}
                >
                  {selectedIds.includes(tag.id) ? "Selected" : "Select"}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => toggleAccordion(tag.id, e)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Child tags container */}
          {isExpanded && (
            <div className="p-2.5 pl-3.5 bg-slate-950/40 border-l-2 border-emerald-500/30 ml-2.5 my-1.5 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {children.map((child) => renderNode(child, depth + 1))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Leaf Tag: SELECTABLE
    const isSelected = selectedIds.includes(tag.id);

    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => handleSelectLeaf(tag.id)}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm ${
          isSelected
            ? "bg-emerald-500 text-slate-950 font-bold shadow-emerald-500/25 ring-2 ring-emerald-400"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <div
          className={`flex h-3.5 w-3.5 items-center justify-center rounded transition ${
            isSelected ? "bg-slate-950 text-emerald-400" : "border border-slate-600 bg-slate-950"
          }`}
        >
          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
        </div>
        <span>{tag.name}</span>
      </button>
    );
  };

  return (
    <div className="relative space-y-2">
      {/* Hidden inputs if name is passed */}
      {name &&
        allSubmittedTagIds.map((id) => <input key={id} type="hidden" name={name} value={id} />)}

      {label && (
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* SINGLE MODE TRIGGER BUTTON */}
      {mode === "single" ? (
        <div className="relative">
          {selectedIds.length > 0 && tagMap.has(selectedIds[0]) ? (
            /* Selected single tag pill */
            <div className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-300">{tagMap.get(selectedIds[0])!.name}</span>
                {getParentBreadcrumb(selectedIds[0]) && (
                  <span className="text-[11px] text-slate-400">
                    in {getParentBreadcrumb(selectedIds[0])}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="px-2 py-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] transition cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemove(selectedIds[0], e)}
                  className="p-1 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Remove selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : allowNone ? (
            /* Selected None / Top-Level trigger */
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-white/10 hover:border-emerald-500/50 text-white text-xs transition cursor-pointer shadow-sm text-left"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span>{noneLabel}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          ) : (
            /* Generic Placeholder trigger */
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition cursor-pointer shadow-sm text-left"
            >
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-emerald-400" />
                <span>{placeholder}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      ) : (
        /* MULTIPLE MODE CHIPS + ADD TRIGGER */
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedIds.length === 0 && (
            <span className="text-xs text-slate-500 italic py-1">No tags selected</span>
          )}

          {selectedIds.map((id) => {
            const tag = tagMap.get(id);
            if (!tag) return null;
            const parentName = getParentBreadcrumb(id);

            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm animate-in zoom-in-95 duration-150"
              >
                <TagIcon className="h-3 w-3" />
                <span>{tag.name}</span>
                {parentName && (
                  <span className="text-[10px] text-emerald-500/70">({parentName})</span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemove(id, e)}
                  disabled={isPending}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-500/30 text-emerald-400 hover:text-white transition cursor-pointer"
                  title={`Remove ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {/* Add Tag Popover Trigger */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add Tag</span>
          </button>
        </div>
      )}

      {/* POPOVER ACCORDION MENU */}
      {isOpen && (
        <>
          {/* Backdrop for outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
            }}
          />

          {/* Popover Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150 max-w-lg">
            {/* Header / Search */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5 text-emerald-400" />
                Select Category / Tag
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Optional None (Top-Level) Option */}
            {allowNone && (
              <button
                type="button"
                onClick={() => {
                  if (props.mode === "single") {
                    props.onSelect("");
                  }
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  selectedIds.length === 0 || selectedIds[0] === ""
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{noneLabel}</span>
                </div>
                {(selectedIds.length === 0 || selectedIds[0] === "") && (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </button>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-500 hover:text-white p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Tree Accordion Content */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {searchQuery ? (
                /* Search Results */
                searchResults.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No tags matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-1">
                    {searchResults.map((tag) => {
                      const isSelected = selectedIds.includes(tag.id);
                      const parentName = getParentBreadcrumb(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleSelectLeaf(tag.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400"
                              : "bg-slate-950 text-slate-200 border border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`flex h-3.5 w-3.5 items-center justify-center rounded ${
                              isSelected ? "bg-slate-950 text-emerald-400" : "border border-slate-600"
                            }`}
                          >
                            {isSelected && <Check className="h-2 w-2 stroke-[3]" />}
                          </div>
                          <span>{tag.name}</span>
                          {parentName && (
                            <span className="text-[10px] text-slate-400">in {parentName}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Accordion Tree */
                rootTags.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No tags available.
                  </div>
                ) : (
                  rootTags.map((tag) => renderNode(tag, 0))
                )
              )}
            </div>

            {/* Subtitle helper */}
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
              💡 Folders expand sub-categories. Tap a sub-tag to select.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
