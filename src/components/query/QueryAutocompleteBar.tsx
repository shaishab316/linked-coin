"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "../../lib/i18n/context";
import { Search, X, Sparkles, Wallet, Tag as TagIcon, User, Calendar, DollarSign, Filter } from "lucide-react";

export interface AutocompleteSuggestion {
  id: string;
  category: "preset" | "account" | "tag" | "person" | "type";
  label: string;
  token: string;
  sublabel?: string;
}

interface QueryAutocompleteBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
  accounts?: { id: string; name: string }[];
  tags?: { id: string; name: string }[];
  people?: { id: string; name: string }[];
}

export function QueryAutocompleteBar({
  value,
  onChange,
  onSearch,
  accounts = [],
  tags = [],
  people = [],
}: QueryAutocompleteBarProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Build suggestion list
  const presets: AutocompleteSuggestion[] = [
    { id: "today", category: "preset", label: t.timeline.today, token: `date:${new Date().toISOString().slice(0, 10)}` },
    { id: "this_month", category: "preset", label: "This Month", token: "date:2026-10-01..2026-10-31" },
    { id: "expense", category: "type", label: t.dashboard.addExpense, token: "type:expense" },
    { id: "income", category: "type", label: t.dashboard.addIncome, token: "type:income" },
    { id: "transfer", category: "type", label: t.dashboard.transfer, token: "type:transfer" },
    { id: "amount_large", category: "preset", label: "Amount > ৳500", token: "amount:>500" },
  ];

  const accountSuggestions: AutocompleteSuggestion[] = accounts.map((acc) => ({
    id: `acc_${acc.id}`,
    category: "account",
    label: acc.name,
    token: `account:${acc.id}`,
    sublabel: "Account",
  }));

  const tagSuggestions: AutocompleteSuggestion[] = tags.map((tag) => ({
    id: `tag_${tag.id}`,
    category: "tag",
    label: tag.name,
    token: `tag:${tag.id}`,
    sublabel: "Category",
  }));

  const personSuggestions: AutocompleteSuggestion[] = people.map((p) => ({
    id: `person_${p.id}`,
    category: "person",
    label: p.name,
    token: `person:${p.id}`,
    sublabel: "Person",
  }));

  const allSuggestions = [
    ...presets,
    ...accountSuggestions,
    ...tagSuggestions,
    ...personSuggestions,
  ];

  // Filter suggestions by typed input if not empty
  const filterTerm = value.trim().toLowerCase();
  const filteredSuggestions = filterTerm
    ? allSuggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(filterTerm) ||
          s.token.toLowerCase().includes(filterTerm),
      )
    : allSuggestions;

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    // If token already present, do nothing
    if (value.includes(suggestion.token)) {
      setIsOpen(false);
      return;
    }

    const newVal = value ? `${value.trim()} ${suggestion.token}` : suggestion.token;
    onChange(newVal);
    onSearch(newVal);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsOpen(false);
      onSearch(value);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-3">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.query.placeholder}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3.5 pl-12 pr-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-xl focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSearch("");
            }}
            className="absolute right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Instant Clickable Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          {t.query.quickFilters}:
        </span>
        {presets.slice(0, 5).map((preset) => {
          const isActive = value.includes(preset.token);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectSuggestion(preset)}
              className={`rounded-xl px-2.5 py-1 font-medium transition cursor-pointer border ${
                isActive
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                  : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Autocomplete Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-14 z-50 max-h-80 overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/98 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 space-y-3">
          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>{t.query.suggestionsTitle}</span>
            <span className="text-[10px] lowercase text-slate-500">click to add</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="flex items-center justify-between rounded-xl p-2 text-left hover:bg-slate-800 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 transition">
                    {item.category === "account" && <Wallet className="h-3.5 w-3.5" />}
                    {item.category === "tag" && <TagIcon className="h-3.5 w-3.5" />}
                    {item.category === "person" && <User className="h-3.5 w-3.5" />}
                    {item.category === "type" && <Filter className="h-3.5 w-3.5" />}
                    {item.category === "preset" && <Calendar className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-[10px] text-slate-500">{item.sublabel}</p>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-400">
                  {item.token}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
