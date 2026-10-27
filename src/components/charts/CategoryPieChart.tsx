"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";

export interface CategoryBreakdownItem {
  tagId: string;
  tagName: string;
  amountMinor: string;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategoryBreakdownItem[];
  currency?: string;
}

const PALETTE = [
  "#10B981", // Emerald
  "#0EA5E9", // Sky Blue
  "#F59E0B", // Amber
  "#F43F5E", // Rose
  "#8B5CF6", // Purple
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#6366F1", // Indigo
];

export function CategoryPieChart({ data, currency = "BDT" }: CategoryPieChartProps) {
  const { locale, t } = useI18n();

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 text-sm text-slate-400">
        {t.dashboard.noTransactionsYet}
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.tagName,
    value: Number(BigInt(item.amountMinor) / 100n),
    minor: BigInt(item.amountMinor),
    percentage: item.percentage,
    color: PALETTE[index % PALETTE.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-slate-200">{p.name}</p>
          <p className="mt-1 font-bold text-emerald-400">
            {formatLocalizedAmount(p.minor, currency, locale, false)} ({p.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 h-72 w-full pt-2">
      <div className="h-60 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full sm:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-none">
            <div className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 truncate font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400">{item.percentage}%</span>
              <span className="font-semibold text-slate-200">
                {formatLocalizedAmount(item.minor, currency, locale, false)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
