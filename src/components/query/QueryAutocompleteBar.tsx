"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useI18n } from "../../lib/i18n/context";
import {
  Search,
  X,
  Filter,
  Layers,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  Wallet,
  Tag as TagIcon,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  HandCoins,
  RotateCcw,
} from "lucide-react";
import { saveQueryAction, deleteQueryAction } from "../../features/query-builder/actions";
import { toast } from "sonner";

export interface OdooSavedQuery {
  id: string;
  name: string;
  queryAst: any;
}

interface QueryAutocompleteBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
  accounts?: { id: string; name: string }[];
  tags?: { id: string; name: string }[];
  people?: { id: string; name: string }[];
  savedQueries?: OdooSavedQuery[];
}

interface ActiveTokenChip {
  id: string;
  token: string;
  label: string;
  category: "type" | "date" | "account" | "tag" | "person" | "amount" | "status" | "text" | "sort";
  color: string;
  icon?: any;
}

export function QueryAutocompleteBar({
  value,
  onChange,
  onSearch,
  accounts = [],
  tags = [],
  people = [],
  savedQueries: initialSavedQueries = [],
}: QueryAutocompleteBarProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [newSaveName, setNewSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedQueries, setSavedQueries] = useState<OdooSavedQuery[]>(initialSavedQueries);
  const [expandedSection, setExpandedSection] = useState<"accounts" | "tags" | "people" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse current query string into visual chips
  const activeChips: ActiveTokenChip[] = useMemo(() => {
    if (!value || !value.trim()) return [];
    const tokens = value.trim().split(/\s+/);
    const chips: ActiveTokenChip[] = [];

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    const personMap = new Map(people.map((p) => [p.id, p.name]));

    for (const token of tokens) {
      if (token.startsWith("type:")) {
        const type = token.slice(5);
        chips.push({
          id: token,
          token,
          label: type === "expense" ? "Money Out (Expense)" : type === "income" ? "Money In (Income)" : type === "transfer" ? "Transfer" : type.startsWith("loan_") ? "Loan / Debt" : type,
          category: "type",
          color: type === "income" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : type === "expense" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-sky-500/15 text-sky-300 border-sky-500/30",
          icon: type === "income" ? ArrowDownLeft : type === "expense" ? ArrowUpRight : ArrowLeftRight,
        });
      } else if (token.startsWith("date:")) {
        const dateVal = token.slice(5);
        chips.push({
          id: token,
          token,
          label: dateVal === new Date().toISOString().slice(0, 10) ? "Today" : dateVal,
          category: "date",
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: Calendar,
        });
      } else if (token.startsWith("account:")) {
        const accId = token.slice(8);
        const name = accountMap.get(accId) || "Account";
        chips.push({
          id: token,
          token,
          label: name,
          category: "account",
          color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          icon: Wallet,
        });
      } else if (token.startsWith("tag:")) {
        const tagId = token.slice(4);
        const name = tagMap.get(tagId) || "Tag";
        chips.push({
          id: token,
          token,
          label: name,
          category: "tag",
          color: "bg-teal-500/15 text-teal-300 border-teal-500/30",
          icon: TagIcon,
        });
      } else if (token.startsWith("person:")) {
        const pId = token.slice(7);
        const name = personMap.get(pId) || "Person";
        chips.push({
          id: token,
          token,
          label: name,
          category: "person",
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
          icon: User,
        });
      } else if (token.startsWith("amount:")) {
        chips.push({
          id: token,
          token,
          label: `Amount ${token.slice(7)}`,
          category: "amount",
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        });
      } else if (token === "is:active") {
        chips.push({
          id: token,
          token,
          label: "Active Only",
          category: "status",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        });
      } else if (token === "is:reversed") {
        chips.push({
          id: token,
          token,
          label: "Reversed Only",
          category: "status",
          color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
          icon: RotateCcw,
        });
      } else if (token.startsWith("sort:")) {
        chips.push({
          id: token,
          token,
          label: token === "sort:amount:desc" ? "Highest Amount" : "Newest First",
          category: "sort",
          color: "bg-slate-800 text-slate-300 border-slate-700",
        });
      } else {
        // Free text search word
        chips.push({
          id: `text_${token}`,
          token,
          label: `"${token}"`,
          category: "text",
          color: "bg-slate-800 text-slate-200 border-slate-700",
        });
      }
    }

    return chips;
  }, [value, accounts, tags, people]);

  // Remove a specific token chip
  const removeChip = (tokenToRemove: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    const updated = tokens.filter((t) => t !== tokenToRemove);
    const newQuery = updated.join(" ");
    onChange(newQuery);
    onSearch(newQuery);
  };

  // Toggle a token on or off in the query string
  const toggleToken = (token: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    let updated: string[];
    if (tokens.includes(token)) {
      updated = tokens.filter((t) => t !== token);
    } else {
      updated = [...tokens, token];
    }
    const newQuery = updated.join(" ");
    onChange(newQuery);
    onSearch(newQuery);
  };

  // Add free text from typed input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!typedInput.trim()) return;
      const clean = typedInput.trim();
      const tokens = value.split(/\s+/).filter(Boolean);
      const newQuery = [...tokens, clean].join(" ");
      setTypedInput("");
      onChange(newQuery);
      onSearch(newQuery);
      setIsOpen(false);
    } else if (e.key === "Backspace" && !typedInput && activeChips.length > 0) {
      // Remove last chip on backspace if input is empty
      const last = activeChips[activeChips.length - 1];
      removeChip(last.token);
    }
  };

  const clearAllFilters = () => {
    setTypedInput("");
    onChange("");
    onSearch("");
  };

  // Save current search favorite
  const handleSaveSearch = async () => {
    if (!newSaveName.trim()) return;
    setIsSaving(true);
    const res = await saveQueryAction(newSaveName.trim(), value);
    if (res?.success && res.saved) {
      toast.success(`Search "${newSaveName.trim()}" saved to Favorites!`);
      setSavedQueries((prev) => [...prev, res.saved]);
      setNewSaveName("");
    } else {
      toast.error(res?.error || "Failed to save search");
    }
    setIsSaving(false);
  };

  // Delete saved favorite
  const handleDeleteSearch = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await deleteQueryAction(id);
    if (res?.success) {
      toast.success(`Removed "${name}" from Favorites`);
      setSavedQueries((prev) => prev.filter((q) => q.id !== id));
    }
  };

  // Apply a saved query favorite
  const handleApplySavedQuery = (sq: OdooSavedQuery) => {
    const tokens: string[] = [];
    const ast = sq.queryAst;
    if (ast.transactionTypes) {
      ast.transactionTypes.forEach((t: string) => tokens.push(`type:${t}`));
    }
    if (ast.accountIds) {
      ast.accountIds.forEach((aId: string) => tokens.push(`account:${aId}`));
    }
    if (ast.tagIds) {
      ast.tagIds.forEach((tId: string) => tokens.push(`tag:${tId}`));
    }
    if (ast.personIds) {
      ast.personIds.forEach((pId: string) => tokens.push(`person:${pId}`));
    }
    if (ast.date?.from && ast.date?.to) {
      tokens.push(`date:${ast.date.from}..${ast.date.to}`);
    }
    if (ast.amount?.min) {
      tokens.push(`amount:>=${ast.amount.min}`);
    }
    if (ast.text) {
      tokens.push(ast.text);
    }
    const newQuery = tokens.join(" ");
    onChange(newQuery);
    onSearch(newQuery);
    setIsOpen(false);
  };

  // Type-ahead matches for dropdown
  const qLower = typedInput.toLowerCase().trim();
  const matchingAccounts = qLower ? accounts.filter((a) => a.name.toLowerCase().includes(qLower)) : [];
  const matchingTags = qLower ? tags.filter((t) => t.name.toLowerCase().includes(qLower)) : [];
  const matchingPeople = qLower ? people.filter((p) => p.name.toLowerCase().includes(qLower)) : [];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ODOO SEARCH BAR CONTAINER */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`w-full min-h-[46px] rounded-2xl border transition-all duration-200 bg-slate-950/80 p-1.5 pl-3 flex flex-wrap items-center gap-1.5 cursor-text ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        {/* Search Icon */}
        <Search className="h-4 w-4 text-emerald-400 shrink-0 ml-1 mr-1" />

        {/* Embedded Active Filter Chips */}
        {activeChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span
              key={chip.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border shadow-sm animate-in zoom-in-95 duration-150 ${chip.color}`}
            >
              {Icon && <Icon className="h-3 w-3 shrink-0" />}
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(chip.token);
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-white/20 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {/* Inline Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={typedInput}
          onChange={(e) => {
            setTypedInput(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={activeChips.length === 0 ? "Search transactions, filters, or group by..." : "Add filter..."}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none px-2 py-1"
        />

        {/* Right Tools: Clear & Multi-section Toggle */}
        <div className="flex items-center gap-1 ml-auto shrink-0 pr-1">
          {(activeChips.length > 0 || typedInput) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
              title="Clear all filters"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            title="Open multi-section filters"
            className={`flex items-center justify-center h-8 w-8 rounded-xl transition cursor-pointer ${
              isOpen
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ODOO 3-SECTION POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-3xl border border-slate-800 bg-slate-900/98 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Typed Facet Suggestions (if typing text) */}
          {typedInput.trim() && (
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Quick Facet Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const clean = typedInput.trim();
                    const newQuery = [...value.split(/\s+/).filter(Boolean), clean].join(" ");
                    setTypedInput("");
                    onChange(newQuery);
                    onSearch(newQuery);
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                >
                  <Search className="h-3 w-3 text-emerald-400" />
                  <span>Search Description for: <strong>&quot;{typedInput}&quot;</strong></span>
                </button>

                {matchingTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      toggleToken(`tag:${t.id}`);
                      setTypedInput("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition cursor-pointer"
                  >
                    <TagIcon className="h-3 w-3 text-teal-400" />
                    <span>Tag: <strong>{t.name}</strong></span>
                  </button>
                ))}

                {matchingAccounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      toggleToken(`account:${a.id}`);
                      setTypedInput("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition cursor-pointer"
                  >
                    <Wallet className="h-3 w-3 text-sky-400" />
                    <span>Account: <strong>{a.name}</strong></span>
                  </button>
                ))}

                {matchingPeople.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      toggleToken(`person:${p.id}`);
                      setTypedInput("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer"
                  >
                    <User className="h-3 w-3 text-purple-400" />
                    <span>Person: <strong>{p.name}</strong></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3 COLUMNS: FILTERS | GROUP BY | FAVORITES */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 p-4 gap-4 text-xs">
            {/* COLUMN 1: FILTERS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                <Filter className="h-3.5 w-3.5 text-emerald-400" />
                <span>Filters</span>
              </div>

              {/* Transaction Types */}
              <div className="space-y-1">
                {[
                  { label: "Money In (Income)", token: "type:income" },
                  { label: "Money Out (Expense)", token: "type:expense" },
                  { label: "Transfers", token: "type:transfer" },
                  { label: "Loans / Personal Debts", token: "type:loan_given" },
                ].map((item) => {
                  const isActive = value.includes(item.token);
                  return (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => toggleToken(item.token)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30"
                          : "text-slate-300 hover:bg-slate-800/70"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Date Ranges */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">
                  Time Period
                </span>
                {[
                  { label: "Today", token: `date:${new Date().toISOString().slice(0, 10)}` },
                  { label: "This Month (Oct 2026)", token: "date:2026-10-01..2026-10-31" },
                  { label: "Last Month (Sep 2026)", token: "date:2026-09-01..2026-09-30" },
                ].map((item) => {
                  const isActive = value.includes(item.token);
                  return (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => toggleToken(item.token)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                          : "text-slate-300 hover:bg-slate-800/70"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Status & Amount */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                {[
                  { label: "Active Transactions", token: "is:active" },
                  { label: "Reversed (Compensated)", token: "is:reversed" },
                  { label: "Large (Amount > ৳1,000)", token: "amount:>1000" },
                  { label: "Major (Amount > ৳5,000)", token: "amount:>5000" },
                ].map((item) => {
                  const isActive = value.includes(item.token);
                  return (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => toggleToken(item.token)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? "bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30"
                          : "text-slate-300 hover:bg-slate-800/70"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: GROUP BY / FILTER BY */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                <Layers className="h-3.5 w-3.5 text-sky-400" />
                <span>Group By / Facets</span>
              </div>

              {/* Accounts Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === "accounts" ? null : "accounts")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-sky-400" />
                    Accounts ({accounts.length})
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedSection === "accounts" ? "rotate-180" : ""}`} />
                </button>

                {expandedSection === "accounts" && (
                  <div className="pl-4 pr-1 py-1 max-h-36 overflow-y-auto space-y-1">
                    {accounts.map((acc) => {
                      const token = `account:${acc.id}`;
                      const isActive = value.includes(token);
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => toggleToken(token)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left text-xs transition cursor-pointer ${
                            isActive
                              ? "bg-sky-500/20 text-sky-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          }`}
                        >
                          <span className="truncate">{acc.name}</span>
                          {isActive && <Check className="h-3 w-3 text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Categories & Tags Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === "tags" ? null : "tags")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5 text-teal-400" />
                    Categories & Tags ({tags.length})
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedSection === "tags" ? "rotate-180" : ""}`} />
                </button>

                {expandedSection === "tags" && (
                  <div className="pl-4 pr-1 py-1 max-h-36 overflow-y-auto space-y-1">
                    {tags.map((tag) => {
                      const token = `tag:${tag.id}`;
                      const isActive = value.includes(token);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleToken(token)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left text-xs transition cursor-pointer ${
                            isActive
                              ? "bg-teal-500/20 text-teal-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          }`}
                        >
                          <span className="truncate">{tag.name}</span>
                          {isActive && <Check className="h-3 w-3 text-teal-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* People & Contacts Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === "people" ? null : "people")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-purple-400" />
                    People & Contacts ({people.length})
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedSection === "people" ? "rotate-180" : ""}`} />
                </button>

                {expandedSection === "people" && (
                  <div className="pl-4 pr-1 py-1 max-h-36 overflow-y-auto space-y-1">
                    {people.map((p) => {
                      const token = `person:${p.id}`;
                      const isActive = value.includes(token);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleToken(token)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left text-xs transition cursor-pointer ${
                            isActive
                              ? "bg-purple-500/20 text-purple-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isActive && <Check className="h-3 w-3 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sorting */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">
                  Sort Order
                </span>
                {[
                  { label: "Newest First", token: "sort:occurredAt:desc" },
                  { label: "Oldest First", token: "sort:occurredAt:asc" },
                  { label: "Highest Amount", token: "sort:amount:desc" },
                ].map((item) => {
                  const isActive = value.includes(item.token) || (!value.includes("sort:") && item.token === "sort:occurredAt:desc");
                  return (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => toggleToken(item.token)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-slate-100 font-bold border border-slate-700"
                          : "text-slate-400 hover:bg-slate-800/50"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: FAVORITES & SAVED SEARCHES */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Favorites</span>
              </div>

              {/* Save Current Search Form */}
              <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Save current search:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSaveName}
                    onChange={(e) => setNewSaveName(e.target.value)}
                    placeholder="e.g. October Expenses"
                    className="flex-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={isSaving || !newSaveName.trim() || !value.trim()}
                    onClick={handleSaveSearch}
                    className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    {isSaving ? "..." : "Save"}
                  </button>
                </div>
              </div>

              {/* Saved Searches List */}
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">
                  Saved Searches ({savedQueries.length})
                </span>

                {savedQueries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-2 py-3 text-center">
                    No favorites saved yet. Set filters and click Save above!
                  </p>
                ) : (
                  savedQueries.map((sq) => (
                    <div
                      key={sq.id}
                      onClick={() => handleApplySavedQuery(sq)}
                      className="group flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/80 border border-slate-800/60 transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-300 transition truncate pr-2">
                        ⭐ {sq.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSearch(sq.id, sq.name, e)}
                        title="Delete saved search"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
