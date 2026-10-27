"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  Check,
} from "lucide-react";

export type GranularityPeriod = "day" | "week" | "month" | "year";

export interface GranularPointProps {
  key: string;
  label: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

export interface GranularComparisonProps {
  current: {
    label: string;
    periodLabel: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  };
  previous: {
    label: string;
    periodLabel: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  };
}

export interface GranularCashFlowPropSet {
  points: GranularPointProps[];
  comparison: GranularComparisonProps;
}

export interface MonthlyCashFlowPoint {
  month: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

interface CashFlowChartProps {
  granularData?: {
    day: GranularCashFlowPropSet;
    week: GranularCashFlowPropSet;
    month: GranularCashFlowPropSet;
    year: GranularCashFlowPropSet;
  };
  data?: MonthlyCashFlowPoint[];
  currency?: string;
}

export function CashFlowChart({
  granularData,
  data: fallbackData = [],
  currency = "BDT",
}: CashFlowChartProps) {
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState<GranularityPeriod>("month");
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Determine active dataset
  const activeGranular = granularData ? granularData[period] : null;

  // Comparison labels
  const compareButtonLabel = useMemo(() => {
    switch (period) {
      case "day":
        return t.dashboard.vsYesterday || "vs Yesterday";
      case "week":
        return t.dashboard.vsPrevWeek || "vs Prev Week";
      case "month":
        return t.dashboard.vsPrevMonth || "vs Prev Month";
      case "year":
        return t.dashboard.vsPrevYear || "vs Prev Year";
    }
  }, [period, t]);

  // Transform timeline data for standard view
  const timelineChartData = useMemo(() => {
    if (activeGranular && activeGranular.points.length > 0) {
      return activeGranular.points.map((p) => ({
        name: p.label,
        inflow: Number(BigInt(p.incomeMinor)) / 100,
        outflow: Number(BigInt(p.expenseMinor)) / 100,
        incomeMinor: BigInt(p.incomeMinor),
        expenseMinor: BigInt(p.expenseMinor),
        netMinor: BigInt(p.netMinor),
      }));
    }
    // Fallback if granularData not passed
    return fallbackData.map((d) => ({
      name: d.month,
      inflow: Number(BigInt(d.incomeMinor)) / 100,
      outflow: Number(BigInt(d.expenseMinor)) / 100,
      incomeMinor: BigInt(d.incomeMinor),
      expenseMinor: BigInt(d.expenseMinor),
      netMinor: BigInt(d.netMinor),
    }));
  }, [activeGranular, fallbackData]);

  // Comparison data
  const comparisonInfo = activeGranular?.comparison;
  const comparisonChartData = useMemo(() => {
    if (!comparisonInfo) return [];

    const currIn = Number(BigInt(comparisonInfo.current.incomeMinor)) / 100;
    const currOut = Number(BigInt(comparisonInfo.current.expenseMinor)) / 100;
    const prevIn = Number(BigInt(comparisonInfo.previous.incomeMinor)) / 100;
    const prevOut = Number(BigInt(comparisonInfo.previous.expenseMinor)) / 100;

    return [
      {
        name: comparisonInfo.previous.label,
        periodLabel: comparisonInfo.previous.periodLabel,
        inflow: prevIn,
        outflow: prevOut,
        incomeMinor: BigInt(comparisonInfo.previous.incomeMinor),
        expenseMinor: BigInt(comparisonInfo.previous.expenseMinor),
        netMinor: BigInt(comparisonInfo.previous.netMinor),
        isCurrent: false,
      },
      {
        name: comparisonInfo.current.label,
        periodLabel: comparisonInfo.current.periodLabel,
        inflow: currIn,
        outflow: currOut,
        incomeMinor: BigInt(comparisonInfo.current.incomeMinor),
        expenseMinor: BigInt(comparisonInfo.current.expenseMinor),
        netMinor: BigInt(comparisonInfo.current.netMinor),
        isCurrent: true,
      },
    ];
  }, [comparisonInfo]);

  // Calculate percentage delta for comparison cards
  const deltas = useMemo(() => {
    if (!comparisonInfo) return null;

    const currIn = BigInt(comparisonInfo.current.incomeMinor);
    const prevIn = BigInt(comparisonInfo.previous.incomeMinor);
    const diffIn = currIn - prevIn;
    const inPercent = prevIn > 0n ? Number((diffIn * 100n) / prevIn) : currIn > 0n ? 100 : 0;

    const currOut = BigInt(comparisonInfo.current.expenseMinor);
    const prevOut = BigInt(comparisonInfo.previous.expenseMinor);
    const diffOut = currOut - prevOut;
    const outPercent = prevOut > 0n ? Number((diffOut * 100n) / prevOut) : currOut > 0n ? 100 : 0;

    const currNet = BigInt(comparisonInfo.current.netMinor);
    const prevNet = BigInt(comparisonInfo.previous.netMinor);
    const diffNet = currNet - prevNet;

    return {
      income: { diff: diffIn, percent: inPercent, increased: diffIn > 0n },
      expense: { diff: diffOut, percent: outPercent, increased: diffOut > 0n },
      net: { diff: diffNet, improved: diffNet >= 0n },
    };
  }, [comparisonInfo]);

  // Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md min-w-[200px]">
          <div className="mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-200">{label}</p>
            {point.periodLabel && (
              <span className="text-[10px] text-slate-400 font-medium">
                {point.periodLabel}
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t.dashboard.addIncome}:
              </span>
              <span className="font-bold">
                {formatLocalizedAmount(point.incomeMinor, currency, locale, false)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-400">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                {t.dashboard.addExpense}:
              </span>
              <span className="font-bold">
                {formatLocalizedAmount(point.expenseMinor, currency, locale, false)}
              </span>
            </div>
            <div className="mt-2 border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-slate-200">
              <span className="font-semibold">{t.dashboard.netSavings}:</span>
              <span className={`font-bold ${point.netMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                {formatLocalizedAmount(point.netMinor, currency, locale, true)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = isComparing ? comparisonChartData : timelineChartData;

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Header Toolbar with Filter Pills & Compare Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Period Granularity Buttons: Day | Week | Month | Year */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-semibold">
          {(["day", "week", "month", "year"] as GranularityPeriod[]).map((p) => {
            const isActive = period === p;
            const label =
              p === "day"
                ? t.dashboard.periodDay || "Day"
                : p === "week"
                ? t.dashboard.periodWeek || "Week"
                : p === "month"
                ? t.dashboard.periodMonth || "Month"
                : t.dashboard.periodYear || "Year";

            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`relative px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Compare to Previous Toggle Button */}
        {comparisonInfo && (
          <button
            type="button"
            onClick={() => setIsComparing((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
              isComparing
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <ArrowRightLeft className={`h-3.5 w-3.5 ${isComparing ? "text-cyan-400" : "text-slate-400"}`} />
            <span>{compareButtonLabel}</span>
            {isComparing && <Check className="h-3 w-3 text-cyan-400 ml-0.5" />}
          </button>
        )}
      </div>

      {/* 2. Comparison Delta KPI Card (Shown when compare is ON) */}
      {isComparing && comparisonInfo && deltas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {/* Income Comparison */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400">{t.dashboard.addIncome}</span>
              <span className="text-[11px] font-bold text-slate-400">
                {deltas.income.diff >= 0n ? "+" : ""}
                {deltas.income.percent}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-100">
                {formatLocalizedAmount(BigInt(comparisonInfo.current.incomeMinor), currency, locale, false)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.incomeMinor), currency, locale, false)}
              </span>
            </div>
          </div>

          {/* Expense Comparison */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-400">{t.dashboard.addExpense}</span>
              <span className={`text-[11px] font-bold ${deltas.expense.increased ? "text-rose-400" : "text-emerald-400"}`}>
                {deltas.expense.diff >= 0n ? "+" : ""}
                {deltas.expense.percent}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-100">
                {formatLocalizedAmount(BigInt(comparisonInfo.current.expenseMinor), currency, locale, false)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.expenseMinor), currency, locale, false)}
              </span>
            </div>
          </div>

          {/* Net Savings Comparison */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">{t.dashboard.netSavings}</span>
              <span className={`text-[11px] font-bold ${deltas.net.improved ? "text-emerald-400" : "text-rose-400"}`}>
                {deltas.net.improved ? "▲ Improved" : "▼ Lower"}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-base font-bold ${BigInt(comparisonInfo.current.netMinor) >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                {formatLocalizedAmount(BigInt(comparisonInfo.current.netMinor), currency, locale, true)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.netMinor), currency, locale, true)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recharts Visual Chart */}
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 text-sm text-slate-400">
          {t.dashboard.noTransactionsYet}
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) =>
                  `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                formatter={(value) => (
                  <span className="text-slate-300">
                    {value === "inflow"
                      ? t.dashboard.addIncome
                      : t.dashboard.addExpense}
                  </span>
                )}
              />
              <Bar
                dataKey="inflow"
                name="inflow"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                maxBarSize={isComparing ? 48 : 36}
              />
              <Bar
                dataKey="outflow"
                name="outflow"
                fill="#F43F5E"
                radius={[6, 6, 0, 0]}
                maxBarSize={isComparing ? 48 : 36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

