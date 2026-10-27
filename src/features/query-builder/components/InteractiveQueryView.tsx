"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n/context";
import { QueryAutocompleteBar } from "../../../components/query/QueryAutocompleteBar";
import { InteractiveTimelineView, type TimelineTransactionItem } from "../../../components/timeline/InteractiveTimelineView";
import type { QueryFilterChip } from "../types";
import { X, Bookmark, Search } from "lucide-react";

interface InteractiveQueryViewProps {
  initialQuery: string;
  chips: QueryFilterChip[];
  transactions: TimelineTransactionItem[];
  totalCount: number;
  accounts: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  people: { id: string; name: string }[];
  savedQueries?: { id: string; name: string; queryAst: any }[];
  basePath: string;
}

export function InteractiveQueryView({
  initialQuery,
  chips,
  transactions,
  totalCount,
  accounts,
  tags,
  people,
  savedQueries = [],
  basePath,
}: InteractiveQueryViewProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [queryString, setQueryString] = useState(initialQuery);

  const handleSearch = (newQuery: string) => {
    const params = new URLSearchParams();
    if (newQuery.trim()) {
      params.set("q", newQuery.trim());
    }
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleRemoveChip = (chip: QueryFilterChip) => {
    // Remove token from query string
    const tokens = queryString.split(/\s+/).filter(Boolean);
    const updatedTokens = tokens.filter((tok) => {
      if (chip.type === "type" && tok === `type:${chip.value}`) return false;
      if (chip.type === "currency" && tok === `currency:${chip.value}`) return false;
      if (chip.type === "text" && tok === chip.value.replace(/"/g, "")) return false;
      if (chip.type === "date" && tok.startsWith("date:")) return false;
      if (chip.type === "amount" && tok.startsWith("amount:")) return false;
      return true;
    });

    const newQuery = updatedTokens.join(" ");
    setQueryString(newQuery);
    handleSearch(newQuery);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar with Autocomplete Suggestions */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl space-y-4">
        <QueryAutocompleteBar
          value={queryString}
          onChange={setQueryString}
          onSearch={handleSearch}
          accounts={accounts}
          tags={tags}
          people={people}
          savedQueries={savedQueries}
        />

        {/* Active Filter Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400">
              {t.common.filter}:
            </span>
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {chip.label}:
                </span>
                <span>{chip.value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(chip)}
                  className="rounded-full p-0.5 hover:bg-emerald-500/30 transition cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-400">
          <span className="font-bold text-slate-200">{totalCount}</span> {t.query.resultsFound}
        </p>
      </div>

      {/* Results rendered in Interactive Timeline View with Multi-Select Range Merging */}
      <InteractiveTimelineView
        transactions={transactions}
        allTags={tags}
        currency="BDT"
        basePath={basePath.replace("/query", "/transactions")}
      />
    </div>
  );
}
